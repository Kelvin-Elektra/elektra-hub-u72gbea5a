routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  const unauthorizedResponse = (msg) =>
    e.json(401, {
      success: false,
      message: msg || 'Token inválido ou não fornecido',
      status: 401,
    })

  const notFoundResponse = () =>
    e.json(404, {
      success: false,
      message: 'Usuário não localizado',
      status: 404,
    })

  if (!token) {
    $app.logger().warn('SSO verify failed: No token provided')
    return unauthorizedResponse('No token provided')
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    $app.logger().error('SSO verify failed: SSO_SECRET is undefined')
    return e.internalServerError('SSO configuration error')
  }

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    $app.logger().error('SSO verify failed: Invalid token', 'error', String(err))
    return unauthorizedResponse('Token inválido')
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
    $app.logger().error('SSO verify failed: Token payload missing id or user_hub_id')
    return unauthorizedResponse('Payload inválido')
  }

  const searchId = payload.hub_user_id || payload.user_hub_id || payload.id

  let user
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', searchId)
  } catch (err) {
    try {
      user = $app.findRecordById('users', searchId)
    } catch (err2) {
      $app.logger().error('SSO verify failed: User not found', 'searchId', searchId)
      return notFoundResponse()
    }
  }

  if (user.getBool('active') === false) {
    $app.logger().warn('SSO verify failed: User is inactive', 'userId', user.id)
    return notFoundResponse()
  }

  $app.logger().info('SSO token verified successfully', 'userId', user.id)

  const authResponse = $apis.recordAuthResponse($app, e, user)

  return e.json(200, {
    id: user.id,
    status: 'valid',
    token: authResponse.token,
    record: authResponse.record,
  })
})
