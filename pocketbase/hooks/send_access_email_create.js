onRecordAfterCreateSuccess((e) => {
  const status = e.record.getString('status')
  if (status !== 'active') return e.next()

  const userId = e.record.getString('user_id')
  const moduleId = e.record.getString('module_id')

  const user = $app.findRecordById('users', userId)
  const moduleRec = $app.findRecordById('modules', moduleId)

  const apiKey = $secrets.get('RESEND_API_KEY') || ''
  if (!apiKey) return e.next()

  const to = user.getString('email')
  const moduleName = moduleRec.getString('name')
  const accessUrl = moduleRec.getString('access_url') || 'N/A'

  const html = `
    <h2>Acesso Concedido!</h2>
    <p>Olá ${user.getString('name')},</p>
    <p>Seu acesso ao módulo <strong>${moduleName}</strong> foi ativado com sucesso.</p>
    <p>URL de Acesso: <a href="${accessUrl}">${accessUrl}</a></p>
    <p>Obrigado!</p>
  `

  try {
    $http.send({
      url: 'https://api.resend.com/emails',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Elektra Hub <suporte@elektrasolucoes.tech>',
        to: [to],
        subject: `Acesso liberado: ${moduleName}`,
        html: html,
      }),
    })
  } catch (err) {
    $app.logger().error('Failed to send access email on create', 'error', err.message)
  }

  return e.next()
}, 'subscriptions')
