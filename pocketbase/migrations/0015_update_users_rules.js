migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule = "(id = @request.auth.id && active = true) || @request.auth.role = 'Admin'"
    users.viewRule = "(id = @request.auth.id && active = true) || @request.auth.role = 'Admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    users.viewRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(users)
  },
)
