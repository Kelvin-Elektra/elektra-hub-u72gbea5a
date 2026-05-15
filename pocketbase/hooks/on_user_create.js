onRecordAfterCreateSuccess((e) => {
  const user = e.record
  const email = user.getString('email')

  if (!email) return e.next()

  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'my-secret'
  let isOwner = false
  try {
    isOwner = user.getBool('is_owner')
  } catch (err) {
    $app.logger().warn('Failed to read is_owner field, defaulting to false')
  }

  const token = $security.createJWT({ id: user.id, is_owner: isOwner }, secret, 86400) // 24h

  const frontendUrl = 'https://hub.elektrasolucoes.tech'
  const verifyLink = `${frontendUrl}/verify?token=${token}`

  const resendKey = $secrets.get('RESEND_API_KEY')
  if (!resendKey) {
    $app.logger().error('RESEND_API_KEY not found')
    return e.next()
  }

  let htmlContent = `<p>Olá,</p><p>Bem-vindo ao Elektra HUB! Clique no link abaixo para verificar seu email e ativar sua conta:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`

  if (!isOwner) {
    htmlContent = `<p>Olá,</p><p>Você foi convidado para participar da equipe no Elektra HUB! Clique no link abaixo para ativar sua conta e definir sua senha de acesso:</p><p><a href="${verifyLink}">${verifyLink}</a></p>`
  }

  try {
    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Elektra HUB <notificacao@elektrasolucoes.tech>',
        to: email,
        subject: user.getBool('is_owner')
          ? 'Confirme seu email - Elektra HUB'
          : 'Convite para Equipe - Elektra HUB',
        html: htmlContent,
      }),
      timeout: 10,
    })

    if (res.statusCode >= 300) {
      $app.logger().error('Failed to send verification email', 'status', res.statusCode)
    }
  } catch (err) {
    $app.logger().error('Error sending verification email', 'error', String(err))
  }

  return e.next()
}, 'users')
