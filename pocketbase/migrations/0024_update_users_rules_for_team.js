migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.is_owner = true && company_id != '')"
    col.viewRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.is_owner = true && company_id != '')"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.listRule = "(id = @request.auth.id && active = true) || @request.auth.role = 'Admin'"
    col.viewRule = "(id = @request.auth.id && active = true) || @request.auth.role = 'Admin'"
    app.save(col)
  },
)
