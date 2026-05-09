migrate(
  (app) => {
    const companies = new Collection({
      name: 'companies',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'tax_id', type: 'text' },
        { name: 'status', type: 'select', values: ['active', 'inactive'], required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(companies)

    const modules = new Collection({
      name: 'modules',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'endpoint_url', type: 'url' },
        { name: 'secret_key_name', type: 'text' },
        { name: 'base_price', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'maintenance', 'deprecated'],
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(modules)

    const subscriptions = new Collection({
      name: 'subscriptions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'company_id',
          type: 'relation',
          collectionId: companies.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'module_id',
          type: 'relation',
          collectionId: modules.id,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['trialing', 'active', 'overdue', 'canceled'],
          required: true,
        },
        { name: 'price', type: 'number' },
        { name: 'next_billing_date', type: 'date' },
        { name: 'asaas_customer_id', type: 'text' },
        { name: 'asaas_subscription_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(subscriptions)

    const sync_logs = new Collection({
      name: 'sync_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'subscription_id',
          type: 'relation',
          collectionId: subscriptions.id,
          maxSelect: 1,
          required: true,
        },
        { name: 'status', type: 'select', values: ['success', 'failed'], required: true },
        { name: 'error_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(sync_logs)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(
      new RelationField({ name: 'company_id', collectionId: companies.id, maxSelect: 1 }),
    )
    users.fields.add(new SelectField({ name: 'role', values: ['Admin', 'User'] }))
    app.save(users)
  },
  (app) => {
    const collections = ['sync_logs', 'subscriptions', 'modules', 'companies']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.fields.removeByName('company_id')
      users.fields.removeByName('role')
      app.save(users)
    } catch (_) {}
  },
)
