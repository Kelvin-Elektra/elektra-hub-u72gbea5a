migrate(
  (app) => {
    // 1. Atualizar deleteRule da collection users para permitir que User_owner delete colaboradores da sua própria empresa
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && role = 'User_employee' && company_id != '')"
    app.save(usersCol)

    // 2. Definir emailVisibility = 1 para todos os usuários existentes
    app
      .db()
      .newQuery(
        'UPDATE users SET emailVisibility = 1 WHERE emailVisibility = 0 OR emailVisibility IS NULL',
      )
      .execute()
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.deleteRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(usersCol)
  },
)
