migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    users.viewRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    users.updateRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    app.save(users)
  },
)
