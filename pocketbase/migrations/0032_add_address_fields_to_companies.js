migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    if (!col.fields.getByName('address')) {
      col.fields.add(new TextField({ name: 'address' }))
    }
    if (!col.fields.getByName('address_number')) {
      col.fields.add(new TextField({ name: 'address_number' }))
    }
    if (!col.fields.getByName('complement')) {
      col.fields.add(new TextField({ name: 'complement' }))
    }
    if (!col.fields.getByName('neighborhood')) {
      col.fields.add(new TextField({ name: 'neighborhood' }))
    }
    if (!col.fields.getByName('city')) {
      col.fields.add(new TextField({ name: 'city' }))
    }
    if (!col.fields.getByName('state')) {
      col.fields.add(new TextField({ name: 'state' }))
    }
    if (!col.fields.getByName('postal_code')) {
      col.fields.add(new TextField({ name: 'postal_code' }))
    }
    if (!col.fields.getByName('phone')) {
      col.fields.add(new TextField({ name: 'phone' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('companies')
    const fieldsToRemove = [
      'address',
      'address_number',
      'complement',
      'neighborhood',
      'city',
      'state',
      'postal_code',
      'phone',
    ]
    for (const f of fieldsToRemove) {
      if (col.fields.getByName(f)) {
        col.fields.removeByName(f)
      }
    }
    app.save(col)
  },
)
