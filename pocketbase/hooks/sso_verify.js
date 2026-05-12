routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token
  if (!token) {
    $app.logger().warn('SSO verify failed: No token provided')
    return e.badRequestError('No token provided')
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
    const errorMsg = String(err).toLowerCase()
    let reason = 'Invalid token'
    if (errorMsg.includes('expired')) {
      reason = 'Token Expired'
    } else if (errorMsg.includes('signature')) {
      reason = 'JWT Signature Mismatch'
    } else if (errorMsg.includes('malformed') || errorMsg.includes('segment')) {
      reason = 'Malformed Token Header'
    }

    $app.logger().error(`SSO verify failed: ${reason}`, 'error', String(err))
    return e.unauthorizedError('Invalid or expired token')
  }

  if (!payload || !payload.id) {
    $app.logger().error('SSO verify failed: Token payload missing id')
    return e.unauthorizedError('Invalid token payload')
  }

  let user
  try {
    user = $app.findRecordById('users', payload.id)
  } catch (err) {
    $app.logger().error('SSO verify failed: User not found', 'userId', payload.id)
    return e.unauthorizedError('User not found')
  }

  const duration = 7 * 24 * 60 * 60
  let crmToken
  try {
    crmToken = $security.createJWT(
      { id: user.id, type: 'auth', collectionId: user.collection().id },
      $app.settings().recordAuthToken.secret,
      duration,
    )
  } catch (err) {
    $app.logger().error('SSO verify failed: CRM token generation error', 'error', String(err))
    return e.internalServerError('Failed to generate session')
  }

  $app.logger().info('SSO token verified successfully', 'userId', user.id)

  return e.json(200, {
    valid: true,
    token: crmToken,
    user: {
      id: user.id,
      email: user.getString('email'),
      name: user.getString('name'),
      company_name: user.getString('company_name'),
      tax_id: user.getString('tax_id'),
    },
  })
})
