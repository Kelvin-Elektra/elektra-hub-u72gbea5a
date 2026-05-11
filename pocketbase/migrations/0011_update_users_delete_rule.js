migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.deleteRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.deleteRule = 'id = @request.auth.id'
    app.save(users)
  },
)
