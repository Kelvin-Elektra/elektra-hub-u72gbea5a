migrate(
  (app) => {
    try {
      app.findFirstRecordByData('modules', 'name', 'Elektra CRM')
    } catch (_) {
      const col = app.findCollectionByNameOrId('modules')
      const record = new Record(col)
      record.set('name', 'Elektra CRM')
      record.set(
        'endpoint_url',
        'https://elektra-crm-3f417.shrd00.internal.goskip.dev/api/backend/v1/hub-sync',
      )
      record.set('secret_key_name', 'ELEKTRA_CRM')
      record.set('base_price', 650.0)
      record.set('status', 'active')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('modules', 'name', 'Elektra CRM')
      app.delete(record)
    } catch (_) {}
  },
)
