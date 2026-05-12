migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('is_owner')) {
      col.fields.add(new BoolField({ name: 'is_owner' }))
    }
    app.save(col)

    // Set all existing users as owners by default
    app.db().newQuery('UPDATE users SET is_owner = true').execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('is_owner')
    app.save(col)
  },
)
