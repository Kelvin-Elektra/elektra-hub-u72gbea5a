routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  if (!token || typeof token !== 'string') {
    $app.logger().warn('SSO verify failed: No valid token provided')
    return e.json(400, {
      status: 400,
      message: 'Invalid or expired token',
      error_details: 'No valid token provided in the request body',
    })
  }

  const secret = $secrets.get('SSO_SECRET')
  if (!secret) {
    $app.logger().error('SSO verify failed: SSO_SECRET is undefined')
    return e.json(500, {
      status: 500,
      message: 'SSO configuration error',
      error_details: 'SSO_SECRET is undefined in the environment',
    })
  }

  let payload
  try {
    payload = $security.parseJWT(token, secret)
  } catch (err) {
    $app.logger().error('SSO verify failed: Invalid token', 'error', String(err))
    return e.json(401, {
      status: 401,
      message: 'Invalid or expired token',
      error_details: 'Failed to parse JWT: ' + String(err),
    })
  }

  if (!payload || (!payload.id && !payload.user_hub_id && !payload.hub_user_id)) {
    $app.logger().error('SSO verify failed: Token payload missing id or user_hub_id')
    return e.json(401, {
      status: 401,
      message: 'Invalid or expired token',
      error_details: 'Token payload missing id or user_hub_id',
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
        status: 404,
        message: 'User account not found',
        error_details: `User not found for searchId: ${searchId}`,
      })
    }
  }

  if (user.getBool('active') === false) {
    $app.logger().warn('SSO verify failed: User is inactive', 'userId', user.id)
    return e.json(403, {
      status: 403,
      message: 'User account is inactive',
      error_details: `User active status is false for userId: ${user.id}`,
    })
  }

  const companyId = user.getString('company_id')
  if (!companyId) {
    $app.logger().warn('SSO verify failed: User has no company_id', 'userId', user.id)
    return e.json(403, {
      status: 403,
      message: 'Company account is inactive or blocked',
      error_details: `Company ID is empty for userId: ${user.id}`,
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
    return e.json(404, {
      status: 404,
      message: 'Company account not found',
      error_details: `Company not found for companyId: ${companyId}`,
    })
  }

  if (company.getString('status') !== 'active') {
    $app.logger().warn('SSO verify failed: Company is inactive', 'companyId', companyId)
    return e.json(403, {
      status: 403,
      message: 'Company account is inactive or blocked',
      error_details: `Company status is ${company.getString('status')} for companyId: ${companyId}`,
    })
  }

  $app.logger().info('SSO token verified successfully', 'userId', user.id)

  const hubUserId = user.getString('hub_user_id') || user.id

  return e.json(200, {
    id: hubUserId,
    status: 'success',
  })
})
