routerAdd(
  'POST',
  '/backend/v1/sso-token',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    // 7 days token mapping (604800 seconds)
    const token = $security.createJWT(
      { id: user.id, email: user.getString('email'), role: user.getString('role') },
      $secrets.get('SSO_SECRET') || 'hub_secret_key',
      604800,
    )

    return e.json(200, { token })
  },
  $apis.requireAuth(),
)
