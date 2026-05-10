// @deps
onRecordAfterCreateSuccess((e) => {
  const email = e.record.getString('email')
  const name = e.record.getString('name')
  const resendKey = $secrets.get('RESEND_API_KEY')

  if (resendKey && email) {
    try {
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
          subject: 'Bem-vindo ao Elektra HUB',
          html: `<div style="font-family: sans-serif; color: #000;">
            <h2>Olá ${name || 'Usuário'},</h2>
            <p>Bem-vindo ao <strong>Elektra HUB</strong>!</p>
            <p>Seu cadastro foi realizado com sucesso. Agora você pode acessar nossa plataforma e gerenciar seus módulos com facilidade.</p>
            <br/>
            <p>Atenciosamente,<br/>Equipe Elektra Engenharia & Soluções</p>
          </div>`,
        }),
      })
      $app.logger().info('Welcome email sent', 'email', email, 'status', res.statusCode)
    } catch (err) {
      $app.logger().error('Failed to send welcome email', 'error', err.message)
    }
  }
  e.next()
}, 'users')
