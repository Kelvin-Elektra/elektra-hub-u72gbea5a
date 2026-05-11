routerAdd('POST', '/backend/v1/sso-verify', (e) => {
  const body = e.requestInfo().body
  const token = body.token
  if (!token) return e.badRequestError('No token provided')

  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'sso-secret'
  try {
    const payload = $security.parseJWT(token, secret)
    if (!payload.id) return e.unauthorizedError('Invalid token')

    const user = $app.findRecordById('users', payload.id)
    return e.json(200, {
      valid: true,
      user: {
        id: user.id,
        email: user.getString('email'),
        name: user.getString('name'),
        company_name: user.getString('company_name'),
        tax_id: user.getString('tax_id'),
      },
    })
  } catch (err) {
    return e.unauthorizedError('Invalid or expired token')
  }
})
