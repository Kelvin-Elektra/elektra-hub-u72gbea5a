routerAdd(
  'POST',
  '/backend/v1/sso-token',
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

    try {
      // 7 days token mapping (604800 seconds)
      const token = $security.createJWT(
        { id: user.id, email: user.getString('email'), role: user.getString('role') },
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
