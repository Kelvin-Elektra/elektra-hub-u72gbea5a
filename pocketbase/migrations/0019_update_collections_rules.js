migrate(
  (app) => {
    const subs = app.findCollectionByNameOrId('subscriptions')
    subs.listRule = "@request.auth.role = 'Admin' || user_id = @request.auth.id"
    subs.viewRule = "@request.auth.role = 'Admin' || user_id = @request.auth.id"
    subs.createRule = "@request.auth.role = 'Admin'"
    subs.updateRule = "@request.auth.role = 'Admin'"
    subs.deleteRule = "@request.auth.role = 'Admin'"
    app.save(subs)

    const modules = app.findCollectionByNameOrId('modules')
    modules.listRule = "@request.auth.id != ''"
    modules.viewRule = "@request.auth.id != ''"
    modules.createRule = "@request.auth.role = 'Admin'"
    modules.updateRule = "@request.auth.role = 'Admin'"
    modules.deleteRule = "@request.auth.role = 'Admin'"
    app.save(modules)
  },
  (app) => {
    const subs = app.findCollectionByNameOrId('subscriptions')
    subs.listRule = "@request.auth.id != ''"
    subs.viewRule = "@request.auth.id != ''"
    subs.createRule = "@request.auth.id != ''"
    subs.updateRule = "@request.auth.id != ''"
    subs.deleteRule = "@request.auth.id != ''"
    app.save(subs)

    const modules = app.findCollectionByNameOrId('modules')
    modules.listRule = "@request.auth.id != ''"
    modules.viewRule = "@request.auth.id != ''"
    modules.createRule = "@request.auth.id != ''"
    modules.updateRule = "@request.auth.id != ''"
    modules.deleteRule = "@request.auth.id != ''"
    app.save(modules)
  },
)
