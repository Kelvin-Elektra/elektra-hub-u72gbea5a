migrate(
  (app) => {
    // Clear tables to avoid constraint errors during schema change
    app.db().newQuery('DELETE FROM sync_logs').execute()
    app.db().newQuery('DELETE FROM subscriptions').execute()

    const users = app.findCollectionByNameOrId('users')

    users.fields.add(new SelectField({ name: 'person_type', values: ['PF', 'PJ'], maxSelect: 1 }))
    users.fields.add(new TextField({ name: 'tax_id' }))
    users.fields.add(new TextField({ name: 'company_name' }))
    users.fields.add(new TextField({ name: 'postal_code' }))
    users.fields.add(new TextField({ name: 'address' }))
    users.fields.add(new TextField({ name: 'address_number' }))
    users.fields.add(new TextField({ name: 'complement' }))
    users.fields.add(new TextField({ name: 'neighborhood' }))
    users.fields.add(new TextField({ name: 'city' }))
    users.fields.add(new TextField({ name: 'state' }))

    const companyIdField = users.fields.getByName('company_id')
    if (companyIdField) {
      users.fields.removeByName('company_id')
    }

    app.save(users)

    const subscriptions = app.findCollectionByNameOrId('subscriptions')

    subscriptions.fields.add(
      new RelationField({
        name: 'user_id',
        collectionId: users.id,
        maxSelect: 1,
        required: true,
        cascadeDelete: true,
      }),
    )

    const subCompanyIdField = subscriptions.fields.getByName('company_id')
    if (subCompanyIdField) {
      subscriptions.fields.removeByName('company_id')
    }

    app.save(subscriptions)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    ;[
      'person_type',
      'tax_id',
      'company_name',
      'postal_code',
      'address',
      'address_number',
      'complement',
      'neighborhood',
      'city',
      'state',
    ].forEach((f) => {
      users.fields.removeByName(f)
    })
    app.save(users)

    const subscriptions = app.findCollectionByNameOrId('subscriptions')
    subscriptions.fields.removeByName('user_id')
    app.save(subscriptions)
  },
)
