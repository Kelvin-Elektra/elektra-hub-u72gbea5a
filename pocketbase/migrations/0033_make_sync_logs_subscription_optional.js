migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('sync_logs')
    const field = col.fields.getByName('subscription_id')
    if (field) {
      field.required = false
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('sync_logs')
    const field = col.fields.getByName('subscription_id')
    if (field) {
      field.required = true
      app.save(col)
    }
  },
)
