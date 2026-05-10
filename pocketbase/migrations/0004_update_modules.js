migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('modules')
    if (!col.fields.getByName('access_url')) {
      col.fields.add(new URLField({ name: 'access_url' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('modules')
    col.fields.removeByName('access_url')
    app.save(col)
  },
)
