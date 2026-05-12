migrate(
  (app) => {
    const collection = new Collection({
      name: 'coupons',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'Admin'",
      updateRule: "@request.auth.role = 'Admin'",
      deleteRule: "@request.auth.role = 'Admin'",
      fields: [
        { name: 'code', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['percentage', 'fixed_amount', 'free_months'],
          maxSelect: 1,
        },
        { name: 'value', type: 'number' },
        { name: 'free_months', type: 'number', onlyInt: true },
        { name: 'active', type: 'bool' },
        { name: 'max_uses', type: 'number', onlyInt: true },
        { name: 'current_uses', type: 'number', onlyInt: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('coupons')
    app.delete(collection)
  },
)
