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

    const secret = $secrets.get('SSO_SECRET')
    if (!secret) {
      $app.logger().error('SSO generate failed: SSO_SECRET is undefined')
      return e.internalServerError('SSO configuration error')
    }

    let companyId = user.getString('company_id')
    let companyName = user.getString('company_name')

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
        },
        secret,
        3600,
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
