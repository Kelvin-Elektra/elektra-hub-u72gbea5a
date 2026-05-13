routerAdd('POST', '/backend/v1/sso-login', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  if (!token) {
    return e.unauthorizedError('No token provided')
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    $app.logger().error('SSO login failed: SSO_SECRET is undefined')
    return e.internalServerError('SSO configuration error')
  }

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    return e.unauthorizedError('Invalid token')
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
    return e.unauthorizedError('Token payload missing id')
  }

  const searchId = payload.hub_user_id || payload.user_hub_id || payload.id

  let user
  try {
    user = $app.findFirstRecordByData('users', 'hub_user_id', searchId)
  } catch (err) {
    try {
      user = $app.findRecordById('users', searchId)
    } catch (err2) {
      return e.unauthorizedError('User not found')
    }
  }

  if (user.getBool('active') === false) {
    return e.unauthorizedError('User is inactive')
  }

  return $apis.recordAuthResponse($app, e, user)
})
