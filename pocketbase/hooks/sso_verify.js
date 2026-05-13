routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  if (!token || typeof token !== 'string') {
    $app.logger().warn('SSO verify failed: No valid token provided')
    return e.json(400, {
      status: 'error',
      message: 'Invalid or expired token',
      code: 'invalid_token',
    })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    $app.logger().error('SSO verify failed: SSO_SECRET is undefined')
    return e.json(500, {
      status: 'error',
      message: 'SSO configuration error',
      code: 'internal_error',
    })
  }

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    $app.logger().error('SSO verify failed: Invalid token', 'error', String(err))
    return e.json(401, {
      status: 'error',
      message: 'Invalid or expired token',
      code: 'invalid_token',
    })
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
    $app.logger().error('SSO verify failed: Token payload missing id or user_hub_id')
    return e.json(401, {
      status: 'error',
      message: 'Invalid or expired token',
      code: 'invalid_token',
    })
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
      return e.json(404, {
        status: 'error',
        message: 'User account is inactive',
        code: 'user_inactive',
      })
    }
  }

  if (user.getBool('active') === false) {
    $app.logger().warn('SSO verify failed: User is inactive', 'userId', user.id)
    return e.json(403, {
      status: 'error',
      message: 'User account is inactive',
      code: 'user_inactive',
    })
  }

  const companyId = user.getString('company_id')
  if (!companyId) {
    $app.logger().warn('SSO verify failed: User has no company_id', 'userId', user.id)
    return e.json(403, {
      status: 'error',
      message: 'Company account is inactive or blocked',
      code: 'company_inactive',
    })
  }

  let company
  try {
    try {
      company = $app.findRecordById('companies', companyId)
    } catch (err) {
      company = $app.findFirstRecordByData('companies', 'hub_company_id', companyId)
    }
  } catch (err) {
    $app.logger().warn('SSO verify failed: Company not found', 'companyId', companyId)
    return e.json(403, {
      status: 'error',
      message: 'Company account is inactive or blocked',
      code: 'company_inactive',
    })
  }

  if (company.getString('status') !== 'active') {
    $app.logger().warn('SSO verify failed: Company is inactive', 'companyId', companyId)
    return e.json(403, {
      status: 'error',
      message: 'Company account is inactive or blocked',
      code: 'company_inactive',
    })
  }

  $app.logger().info('SSO token verified successfully', 'userId', user.id)

  return e.json(200, {
    id: user.id,
    status: 'success',
    message: 'Authentication successful',
    data: {
      user_id: user.id,
      company_id: company.id,
      hub_user_id: user.getString('hub_user_id'),
    },
  })
})
