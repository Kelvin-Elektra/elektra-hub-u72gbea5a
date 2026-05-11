routerAdd(
  'POST',
  '/backend/v1/sso-token',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Unauthorized')

    const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'sso-secret'
    const token = $security.createJWT({ id: user.id, email: user.getString('email') }, secret, 300)

    return e.json(200, { token: token })
  },
  $apis.requireAuth(),
)
