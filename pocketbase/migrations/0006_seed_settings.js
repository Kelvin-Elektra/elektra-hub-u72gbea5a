migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    try {
      app.findFirstRecordByData('settings', 'name', 'Elektra HUB')
    } catch (_) {
      const record = new Record(col)
      record.set('name', 'Elektra HUB')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('settings', 'name', 'Elektra HUB')
      app.delete(record)
    } catch (_) {}
  },
)
