migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.deleteRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.deleteRule = "id = @request.auth.id || @request.auth.role = 'Admin'"
    app.save(col)
  },
)
