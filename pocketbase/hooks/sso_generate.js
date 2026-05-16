routerAdd(
  'POST',
  '/backend/v1/sso-generate',
  (e) => {
    const user = e.auth
    if (!user) {
      $app.logger().warn('SSO generate failed: Unauthorized')
      return e.unauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body || {}
    const moduleId = body.module_id

    let companyId = user.getString('company_id')
    let companyName = user.getString('company_name')

    if (body.check_all && companyId) {
      try {
        const subs = $app.findRecordsByFilter(
          'subscriptions',
          'user_id.company_id = {:companyId}',
          '-created',
          100,
          0,
          { companyId },
        )
        const result = subs.map((s) => ({
          module_id: s.getString('module_id'),
          status: s.getString('status'),
        }))
        return e.json(200, result)
      } catch (err) {
        return e.json(200, [])
      }
    }

    if (moduleId && companyId) {
      try {
        const sub = $app.findFirstRecordByFilter(
          'subscriptions',
          `user_id.company_id = {:companyId} && module_id = {:moduleId}`,
          { companyId, moduleId },
        )
        const status = sub.getString('status')
        if (status !== 'active' && status !== 'trialing') {
          return e.forbiddenError('Subscription is not active')
        }
      } catch (err) {
        return e.forbiddenError('No active subscription found for this module')
      }
    }

    const secret = $secrets.get('SSO_SECRET')
    if (!secret) {
      $app.logger().error('SSO generate failed: SSO_SECRET is undefined')
      return e.internalServerError('SSO configuration error')
    }

    if (companyId) {
      try {
        const company = $app.findRecordById('companies', companyId)
        if (company.getString('name')) {
          companyName = company.getString('name')
        }
      } catch (err) {
        $app.logger().warn('SSO generate: Company not found', 'companyId', companyId)
      }
    }

    let roleCompany = 'admin'
    if (user.getString('role') === 'User_employee' && moduleId) {
      try {
        const accessRecord = $app.findFirstRecordByFilter(
          'employee_access',
          'employee_id = {:emp} && module_id = {:mod}',
          { emp: user.id, mod: moduleId },
        )
        if (accessRecord.getString('role_company')) {
          roleCompany = accessRecord.getString('role_company')
        } else {
          roleCompany = 'user'
        }
      } catch (_) {
        roleCompany = 'user'
      }
    }

    try {
      const token = $security.createJWT(
        {
          id: user.id,
          name: user.getString('name'),
          email: user.getString('email'),
          phone: user.getString('phone'),
          role: user.getString('role'),
          company_id: companyId,
          role_company: roleCompany,
          company_name: companyName,
          module_id: moduleId,
        },
        secret,
        604800,
      )
      $app.logger().info('SSO token generated successfully', 'userId', user.id)
      return e.json(200, { token })
    } catch (err) {
      $app.logger().error('SSO generate failed: Token creation error', 'error', String(err))
      return e.internalServerError('Failed to generate token')
    }
  },
  $apis.requireAuth(),
)
