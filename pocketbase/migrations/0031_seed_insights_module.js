migrate(
  (app) => {
    const modules = app.findCollectionByNameOrId('modules')
    try {
      app.findFirstRecordByData('modules', 'name', 'Elektra Insights')
    } catch (_) {
      const record = new Record(modules)
      record.set('name', 'Elektra Insights')
      record.set(
        'endpoint_url',
        'https://analise-energia-solar-uc-91864.shrd00.internal.goskip.dev/backend/v1/sync-hub-user',
      )
      record.set('secret_key_name', 'ELEKTRA_INSIGHTS')
      record.set('base_price', 149.9)
      record.set('status', 'active')
      record.set('description', 'Módulo de análise de energia solar integrado ao ecossistema.')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('modules', 'name', 'Elektra Insights')
      app.delete(record)
    } catch (_) {}
  },
)
