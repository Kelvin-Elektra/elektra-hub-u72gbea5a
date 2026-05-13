routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  const notFoundResponse = () =>
    e.json(404, {
      success: false,
      message: "The requested resource wasn't found.",
      status: 404,
    })

  if (!token) {
    $app.logger().warn('SSO verify failed: No token provided')
    return notFoundResponse()
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
    return notFoundResponse()
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
    $app.logger().error('SSO verify failed: Token payload missing id or user_hub_id')
    return notFoundResponse()
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

  return e.json(200, {
    id: user.id,
    status: 'valid',
  })
})
