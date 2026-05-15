migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('is_owner')) {
      col.fields.add(new BoolField({ name: 'is_owner' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('is_owner')) {
      col.fields.removeByName('is_owner')
      app.save(col)
    }
  },
)
