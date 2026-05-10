// @deps
onRecordAfterCreateSuccess((e) => {
  const email = e.record.getString('email')
  const name = e.record.getString('name')
  const resendKey = $secrets.get('RESEND_API_KEY')
  const secret = $secrets.get('PB_SUPERUSER_TOKEN') || 'my-secret'

  if (resendKey && email) {
    try {
      const token = $security.createJWT({ id: e.record.id }, secret, 86400)
      const frontendUrl = 'https://master-hub-admin-cd135.goskip.app'
      const verifyLink = `${frontendUrl}/verify?token=${token}`

      const res = $http.send({
        url: 'https://api.resend.com/emails',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Elektra HUB <onboarding@resend.dev>',
          to: email,
          subject: 'Confirme seu e-mail - Elektra HUB',
          html: `<div style="font-family: sans-serif; color: #000; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Olá ${name || 'Usuário'},</h2>
            <p>Bem-vindo ao <strong>Elektra HUB</strong>!</p>
            <p>Para ativar sua conta e acessar a plataforma, confirme seu endereço de e-mail clicando no botão abaixo:</p>
            <br/>
            <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirmar E-mail</a>
            <br/><br/>
            <p>Se você não se cadastrou em nossa plataforma, ignore este e-mail.</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Equipe Elektra Engenharia & Soluções</p>
          </div>`,
        }),
      })
      $app.logger().info('Verification email sent', 'email', email, 'status', res.statusCode)
    } catch (err) {
      $app.logger().error('Failed to send verification email', 'error', err.message)
    }
  }
  e.next()
}, 'users')
