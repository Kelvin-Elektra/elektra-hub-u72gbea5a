migrate(
  (app) => {
    const collection = new Collection({
      name: 'employee_access',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.company_id = company_id || @request.auth.role = 'Admin')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.company_id = company_id || @request.auth.role = 'Admin')",
      createRule:
        "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.is_owner = true",
      updateRule:
        "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.is_owner = true",
      deleteRule:
        "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.is_owner = true",
      fields: [
        {
          name: 'employee_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'module_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('modules').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'company_id', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('employee_access')
    app.delete(collection)
  },
)
