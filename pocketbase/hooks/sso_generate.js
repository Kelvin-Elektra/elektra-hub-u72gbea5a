routerAdd(
  'POST',
  '/backend/v1/sso-generate',
  (e) => {
    const user = e.auth
    if (!user) {
      $app.logger().warn('SSO generate failed: Unauthorized')
      return e.unauthorizedError('Unauthorized')
    }

    const secret = $secrets.get('SSO_SECRET')
    if (!secret) {
      $app.logger().error('SSO generate failed: SSO_SECRET is undefined')
      return e.internalServerError('SSO configuration error')
    }

    let hubCompanyId = user.getString('company_id')
    if (hubCompanyId) {
      try {
        const company = $app.findRecordById('companies', hubCompanyId)
        if (company.getString('hub_company_id')) {
          hubCompanyId = company.getString('hub_company_id')
        }
      } catch (err) {
        $app.logger().warn('SSO generate: Company not found', 'companyId', hubCompanyId)
      }
    }

    try {
      // 1 hour token mapping (3600 seconds)
      const token = $security.createJWT(
        {
          id: user.id,
          name: user.getString('name'),
          email: user.getString('email'),
          role: user.getString('role'),
          hub_company_id: hubCompanyId,
          // keeping for backward compatibility
          hub_user_id: user.id,
          user_hub_id: user.id,
          company_hub_id: hubCompanyId,
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
