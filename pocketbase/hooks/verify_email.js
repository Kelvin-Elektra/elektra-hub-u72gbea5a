routerAdd('POST', '/backend/v1/verify-email', (e) => {
  const body = e.requestInfo().body
  const token = body.token
  if (!token) return e.badRequestError('Token não fornecido.')

  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'my-secret'
  try {
    const payload = $security.parseJWT(token, secret)
    if (!payload.id) return e.badRequestError('Token inválido.')

    const record = $app.findRecordById('users', payload.id)
    if (record.getBool('verified')) {
      return e.json(200, { message: 'E-mail já verificado.' })
    }

    record.setVerified(true)
    $app.save(record)

    return e.json(200, { message: 'E-mail verificado com sucesso.' })
  } catch (err) {
    return e.badRequestError('Token inválido ou expirado.')
  }
})
