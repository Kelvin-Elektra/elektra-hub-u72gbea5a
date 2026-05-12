routerAdd('POST', '/backend/v1/verify-email', (e) => {
  const body = e.requestInfo().body
  const token = body.token
  const password = body.password

  if (!token) return e.badRequestError('Token não fornecido.')

  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'my-secret'
  try {
    const payload = $security.parseJWT(token, secret)
    if (!payload.id) return e.badRequestError('Token inválido.')

    const record = $app.findRecordById('users', payload.id)

    // Always apply password if provided, even if already verified
    if (password) {
      record.setPassword(password)
    }

    record.setVerified(true)
    record.set('active', true)

    $app.save(record)

    return e.json(200, { message: 'Conta ativada com sucesso.' })
  } catch (err) {
    return e.badRequestError('Token inválido ou expirado.')
  }
})
