routerAdd('POST', '/backend/v1/sso-login', (e) => {
  const body = e.requestInfo().body || {}
  const token = body.token

  const unauthorizedResponse = (msg) =>
    e.json(401, {
      success: false,
      message: msg || 'Token inválido',
      status: 401,
    })

  const notFoundResponse = () =>
    e.json(404, {
      success: false,
      message: "The requested resource wasn't found.",
      status: 404,
    })

  if (!token) {
    return unauthorizedResponse('Token não fornecido')
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
    return unauthorizedResponse('Token inválido')
  }

  if (!payload || !payload.id) {
    return unauthorizedResponse('Payload inválido')
  }

  const searchId = payload.id

  let user
  try {
    user = $app.findRecordById('users', searchId)
  } catch (err) {
    return notFoundResponse()
  }

  if (user.getBool('active') === false) {
    return notFoundResponse()
  }

  const moduleId = payload.module_id
  const companyId = user.getString('company_id')

  if (moduleId && companyId) {
    try {
      const sub = $app.findFirstRecordByFilter(
        'subscriptions',
        `user_id.company_id = {:companyId} && module_id = {:moduleId}`,
        { companyId, moduleId },
      )
      const status = sub.getString('status')
      if (status !== 'active' && status !== 'trialing') {
        throw new Error('Subscription not active')
      }
    } catch (err) {
      return unauthorizedResponse('No active subscription for this module')
    }

    if (user.getString('role') === 'User_employee') {
      try {
        $app.findFirstRecordByFilter(
          'employee_access',
          `employee_id = {:emp} && module_id = {:mod}`,
          { emp: user.id, mod: moduleId },
        )
      } catch (err) {
        return unauthorizedResponse('No access granted for this employee')
      }
    }
  }

  return $apis.recordAuthResponse($app, e, user)
})
