migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('settings')
    settings.listRule = ''
    settings.viewRule = ''
    app.save(settings)
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('settings')
    settings.listRule = "@request.auth.id != ''"
    settings.viewRule = "@request.auth.id != ''"
    app.save(settings)
  },
)
