migrate(
  (app) => {
    try {
      const crm = app.findFirstRecordByData('modules', 'name', 'Elektra CRM')
      crm.set(
        'endpoint_url',
        'https://elektra-crm-3f417.shrd00.internal.goskip.dev/backend/v1/hub-sync',
      )
      app.save(crm)
    } catch (_) {}

    try {
      const insights = app.findFirstRecordByData('modules', 'name', 'Elektra Insights')
      insights.set(
        'endpoint_url',
        'https://analise-energia-solar-uc-91864.shrd00.internal.goskip.dev/backend/v1/hub-sync',
      )
      app.save(insights)
    } catch (_) {}
  },
  (app) => {
    try {
      const crm = app.findFirstRecordByData('modules', 'name', 'Elektra CRM')
      crm.set(
        'endpoint_url',
        'https://elektra-crm-3f417.shrd00.internal.goskip.dev/api/backend/v1/hub-sync',
      )
      app.save(crm)
    } catch (_) {}
  },
)
