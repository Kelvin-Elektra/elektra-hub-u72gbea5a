onRecordAfterCreateSuccess((e) => {
  const record = e.record
  if (record.getBool('verified')) return e.next()

  const email = record.getString('email')
  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'my-secret'
  const token = $security.createJWT({ id: record.id }, secret, 3600 * 24)

  const verifyUrl = `https://master-hub-admin-cd135.goskip.app/verify?token=${token}`

  const resendApiKey = $secrets.get('RESEND_API_KEY')
  if (resendApiKey) {
    const res = $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notificacao@elektrasolucoes.tech',
        to: email,
        subject: 'Bem-vindo! Confirme seu e-mail',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Bem-vindo ao Elektra HUB!</h2>
            <p>Para ativar sua conta e acessar seus módulos, por favor clique no botão abaixo para confirmar seu e-mail:</p>
            <a href="${verifyUrl}" style="display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0;">Confirmar E-mail</a>
            <p>Se você não solicitou este cadastro, pode ignorar este e-mail.</p>
          </div>
        `,
      }),
    })

    if (res.statusCode >= 300) {
      $app
        .logger()
        .error(
          'Resend Email Error',
          'email',
          email,
          'status',
          res.statusCode,
          'body',
          res.json || res.body,
        )
    }
  } else {
    $app.logger().warn('RESEND_API_KEY is not set. Verification email not sent to ' + email)
  }

  return e.next()
}, 'users')
