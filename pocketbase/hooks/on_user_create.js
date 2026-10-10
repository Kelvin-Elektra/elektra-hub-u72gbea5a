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

  const userName = user.getString('name') || 'Usuário'
  const isEmployee = user.getString('role') === 'User_employee'

  let subject = 'Confirme seu email - Elektra HUB'
  let htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <h2 style="color: #1d4ed8; margin-bottom: 8px;">Bem-vindo ao Elektra HUB!</h2>
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Obrigado por se cadastrar na plataforma Elektra HUB. Clique no botão abaixo para confirmar seu e-mail e ativar sua conta:</p>
      <div style="margin: 24px 0;">
        <a href="${verifyLink}" style="background-color: #1d4ed8; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ativar Minha Conta</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Ou copie e cole este link no seu navegador: <br/><a href="${verifyLink}" style="color: #1d4ed8;">${verifyLink}</a></p>
      <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Atenciosamente,<br />Equipe Elektra Soluções</p>
    </div>
  `

  // Se for colaborador (User_employee), dispara e-mail de boas-vindas com link de acesso do HUB
  if (isEmployee) {
    subject = 'Bem-vindo ao Elektra HUB - Acesso à Plataforma'
    htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
        <h2 style="color: #1d4ed8; margin-bottom: 8px;">Bem-vindo ao Elektra HUB!</h2>
        <p>Olá <strong>${userName}</strong>,</p>
        <p>Sua conta de colaborador foi criada no Elektra HUB.</p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1d4ed8;">
          <p style="margin: 0 0 8px 0;"><strong>Seus dados de acesso:</strong></p>
          <p style="margin: 4px 0;"><strong>E-mail:</strong> ${email}</p>
          <p style="margin: 4px 0;"><strong>Link de Acesso:</strong> <a href="${frontendUrl}" style="color: #1d4ed8;">${frontendUrl}</a></p>
        </div>
        <p>Acesse o link acima para entrar na plataforma e começar suas atividades.</p>
        <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Atenciosamente,<br />Equipe Elektra Soluções</p>
      </div>
    `
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
        subject: subject,
        html: htmlContent,
      }),
      timeout: 10,
    })

    if (res.statusCode >= 300) {
      $app
        .logger()
        .error('Failed to send welcome/verification email via Resend', 'status', res.statusCode)
    }
  } catch (err) {
    $app.logger().error('Error sending welcome/verification email', 'error', String(err))
  }

  // Backup Skip Cloud mailer
  try {
    const mailClient = $app.newMailClient()
    mailClient.send({
      from: { address: 'notificacao@elektrasolucoes.tech', name: 'Elektra HUB' },
      to: [{ address: email, name: userName }],
      subject: subject,
      html: htmlContent,
    })
  } catch (_) {}

  return e.next()
}, 'users')
