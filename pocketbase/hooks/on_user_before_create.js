onRecordCreateRequest((e) => {
  const record = e.record
  const email = record.getString('email')

  // Verificação de unicidade global de e-mail em toda a base
  if (email) {
    try {
      const existing = $app.findAuthRecordByEmail('users', email)
      if (existing && existing.id !== record.id) {
        return e.badRequestError('Este e-mail já está cadastrado no HUB.')
      }
    } catch (_) {}
  }

  // Colaboradores criados por admin ou fluxo direto ficam ativos sem confirmação
  const role = record.getString('role')
  if (role === 'User_employee' || role === 'User_owner') {
    record.set('active', true)
  }

  e.next()
}, 'users')
