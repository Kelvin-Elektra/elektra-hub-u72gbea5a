migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.createRule = ''
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    col.createRule = "@request.auth.id != ''"
    app.save(col)
  },
)
