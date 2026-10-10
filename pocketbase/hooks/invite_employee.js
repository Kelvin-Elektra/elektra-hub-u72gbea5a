routerAdd(
  'POST',
  '/backend/v1/invite-employee',
  (e) => {
    const body = e.requestInfo().body
    const auth = e.auth

    if (!auth) return e.unauthorizedError('Não autorizado')
    if (auth.getString('role') !== 'User_owner')
      return e.forbiddenError('Apenas o proprietário pode convidar funcionários.')

    const companyId = auth.getString('company_id')
    if (!companyId) return e.badRequestError('Empresa não identificada.')

    const email = body.email
    const name = body.name
    const phone = body.phone || ''
    const password = body.password || ''

    if (!email || !name) return e.badRequestError('Nome e e-mail são obrigatórios.')

    const cleanEmail = email.trim().toLowerCase()
    const chosenPassword = password.trim() ? password : $security.randomString(10) + 'A1!'

    try {
      const usersCol = $app.findCollectionByNameOrId('users')
      try {
        const existingUser = $app.findAuthRecordByEmail('users', cleanEmail)
        if (existingUser) {
          return e.badRequestError('Este e-mail já está cadastrado no HUB.')
        }
      } catch (_) {}

      const record = new Record(usersCol)
      record.setEmail(cleanEmail)
      record.setPassword(chosenPassword)
      record.setVerified(true)
      record.set('emailVisibility', true)
      record.set('name', name.trim())
      record.set('phone', phone)
      record.set('company_id', companyId)
      record.set('role', 'User_employee')
      record.set('active', true)

      $app.save(record)

      // Disparar e-mail de boas-vindas com as credenciais cadastradas
      const resendKey = $secrets.get('RESEND_API_KEY')
      const hubUrl = 'https://hub.elektrasolucoes.tech'
      const welcomeSubject = 'Bem-vindo ao Elektra HUB - Suas credenciais de acesso'
      const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
          <h2 style="color: #1d4ed8; margin-bottom: 8px;">Bem-vindo ao Elektra HUB!</h2>
          <p>Olá <strong>${name.trim()}</strong>,</p>
          <p>Você foi cadastrado como colaborador na plataforma Elektra HUB.</p>
          <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1d4ed8;">
            <p style="margin: 0 0 8px 0;"><strong>Suas credenciais de acesso:</strong></p>
            <p style="margin: 4px 0;"><strong>E-mail:</strong> ${cleanEmail}</p>
            <p style="margin: 4px 0;"><strong>Senha:</strong> ${chosenPassword}</p>
            <p style="margin: 4px 0;"><strong>Link de Acesso:</strong> <a href="${hubUrl}" style="color: #1d4ed8;">${hubUrl}</a></p>
          </div>
          <p>Acesse o link acima com o seu e-mail e senha para começar a utilizar os módulos liberados para você.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #64748b;">Atenciosamente,<br />Equipe Elektra Soluções</p>
        </div>
      `

      if (resendKey) {
        try {
          $http.send({
            url: 'https://api.resend.com/emails',
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Elektra HUB <notificacao@elektrasolucoes.tech>',
              to: cleanEmail,
              subject: welcomeSubject,
              html: welcomeHtml,
            }),
            timeout: 10,
          })
        } catch (mailErr) {
          $app
            .logger()
            .error(
              'Erro ao enviar email de boas-vindas ao colaborador (Resend)',
              'error',
              String(mailErr),
            )
        }
      }

      // (Skip Cloud mailer fallback removido: newMailClient dispara via noreply@mail.goskip.dev. Disparo mantido exclusivamente via Resend com domínio institucional @elektrasolucoes.tech)

      return e.json(200, {
        message: 'Colaborador cadastrado com sucesso.',
        id: record.id,
        email: cleanEmail,
        password: chosenPassword,
        url: hubUrl,
      })
    } catch (err) {
      return e.internalServerError('Erro ao cadastrar colaborador: ' + String(err))
    }
  },
  $apis.requireAuth(),
)
