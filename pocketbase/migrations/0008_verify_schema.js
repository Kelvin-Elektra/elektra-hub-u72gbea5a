migrate(
  (app) => {
    // Ensure the fields are indeed present as per acceptance criteria
    const modules = app.findCollectionByNameOrId('modules')

    if (!modules.fields.getByName('access_url')) {
      modules.fields.add(new URLField({ name: 'access_url', required: false }))
    }
    if (!modules.fields.getByName('endpoint_url')) {
      modules.fields.add(new URLField({ name: 'endpoint_url', required: false }))
    }

    app.save(modules)
  },
  (app) => {
    // no-op down migration
  },
)
