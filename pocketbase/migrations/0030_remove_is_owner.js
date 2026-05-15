migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('is_owner')) {
      users.fields.removeByName('is_owner')
    }
    users.listRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && company_id != '')"
    users.viewRule =
      "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && company_id != '')"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('is_owner')) {
      users.fields.add(new BoolField({ name: 'is_owner' }))
    }
    app.save(users)
  },
)
