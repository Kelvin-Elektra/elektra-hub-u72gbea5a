migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('company_id')) {
      col.fields.add(new TextField({ name: 'company_id' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('company_id')) {
      col.fields.removeByName('company_id')
    }
    app.save(col)
  },
)
