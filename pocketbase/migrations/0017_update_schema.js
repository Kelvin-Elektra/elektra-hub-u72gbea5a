migrate(
  (app) => {
    const modules = app.findCollectionByNameOrId('modules')
    if (!modules.fields.getByName('description')) {
      modules.fields.add(new TextField({ name: 'description' }))
    }
    if (!modules.fields.getByName('logo')) {
      modules.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        }),
      )
    }
    if (!modules.fields.getByName('features')) {
      modules.fields.add(new TextField({ name: 'features' }))
    }
    app.save(modules)

    const subs = app.findCollectionByNameOrId('subscriptions')
    if (!subs.fields.getByName('max_users')) {
      subs.fields.add(new NumberField({ name: 'max_users' }))
    }
    subs.addIndex('idx_subs_status', false, 'status', '')
    app.save(subs)
  },
  (app) => {
    const modules = app.findCollectionByNameOrId('modules')
    modules.fields.removeByName('description')
    modules.fields.removeByName('logo')
    modules.fields.removeByName('features')
    app.save(modules)

    const subs = app.findCollectionByNameOrId('subscriptions')
    subs.fields.removeByName('max_users')
    subs.removeIndex('idx_subs_status')
    app.save(subs)
  },
)
