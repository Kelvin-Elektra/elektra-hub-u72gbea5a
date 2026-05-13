routerAdd('POST', '/backend/v1/sso-login', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  const notFoundResponse = () =>
    e.json(404, {
      success: false,
      message: "The requested resource wasn't found.",
      status: 404,
    })

  if (!token) {
    return notFoundResponse()
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
    return notFoundResponse()
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
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
      return notFoundResponse()
    }
  }

  if (user.getBool('active') === false) {
    return notFoundResponse()
  }

  return $apis.recordAuthResponse($app, e, user)
})
