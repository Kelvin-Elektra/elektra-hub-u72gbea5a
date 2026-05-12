routerAdd(
  'POST',
  '/backend/v1/invite-employee',
  (e) => {
    const body = e.requestInfo().body
    const auth = e.auth

    if (!auth) return e.unauthorizedError('Não autorizado')
    if (!auth.getBool('is_owner'))
      return e.forbiddenError('Apenas o proprietário pode convidar funcionários.')

    const companyId = auth.getString('company_id')
    if (!companyId) return e.badRequestError('Empresa não identificada.')

    const email = body.email
    const name = body.name

    if (!email || !name) return e.badRequestError('Nome e e-mail são obrigatórios.')

    try {
      const usersCol = $app.findCollectionByNameOrId('users')
      try {
        $app.findAuthRecordByEmail('users', email)
        return e.badRequestError('Este usuário já possui cadastro.')
      } catch (_) {}

      const record = new Record(usersCol)
      record.setEmail(email)
      // Temporary password (they will change it via the verify link)
      const tempPass = $security.randomString(12) + 'A1!'
      record.setPassword(tempPass)
      record.set('name', name)
      record.set('company_id', companyId)
      record.set('is_owner', false)
      record.set('role', 'User')
      record.set('active', false)

      $app.save(record)

      return e.json(200, { message: 'Funcionário convidado com sucesso.', id: record.id })
    } catch (err) {
      return e.internalServerError('Erro ao convidar: ' + String(err))
    }
  },
  $apis.requireAuth(),
)
