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

    if (!email || !name) return e.badRequestError('Nome e e-mail são obrigatórios.')

    try {
      const usersCol = $app.findCollectionByNameOrId('users')
      try {
        $app.findAuthRecordByEmail('users', email.trim().toLowerCase())
        return e.badRequestError('Este e-mail já está cadastrado no HUB.')
      } catch (_) {}

      const record = new Record(usersCol)
      record.setEmail(email.trim().toLowerCase())
      const tempPass = $security.randomString(12) + 'A1!'
      record.setPassword(tempPass)
      record.setVerified(true)
      record.set('name', name.trim())
      record.set('phone', phone)
      record.set('company_id', companyId)
      record.set('role', 'User_employee')
      record.set('active', true)

      $app.save(record)

      return e.json(200, { message: 'Colaborador cadastrado com sucesso.', id: record.id })
    } catch (err) {
      return e.internalServerError('Erro ao cadastrar colaborador: ' + String(err))
    }
  },
  $apis.requireAuth(),
)
