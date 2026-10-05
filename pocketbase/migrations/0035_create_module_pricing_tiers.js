migrate(
  (app) => {
    const modulesCol = app.findCollectionByNameOrId('modules')

    const collection = new Collection({
      name: 'module_pricing_tiers',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'Admin'",
      fields: [
        {
          name: 'module_id',
          type: 'relation',
          required: true,
          collectionId: modulesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'max_users',
          type: 'number',
          required: true,
          onlyInt: true,
          min: 1,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_module_pricing_tiers_mod ON module_pricing_tiers (module_id, max_users)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('module_pricing_tiers')
      app.delete(col)
    } catch (_) {}
  },
)
