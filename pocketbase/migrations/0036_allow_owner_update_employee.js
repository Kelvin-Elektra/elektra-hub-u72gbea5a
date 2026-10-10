migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.updateRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && role = 'User_employee' && company_id != '')"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.updateRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(col)
  },
)
