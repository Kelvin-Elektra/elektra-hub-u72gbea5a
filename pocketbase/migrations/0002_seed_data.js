migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'elektraengenhariasolucoes@gmail.com',
      )
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('elektraengenhariasolucoes@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Admin HUB')
      adminUser.set('role', 'Admin')
      app.save(adminUser)
    }

    const companiesCol = app.findCollectionByNameOrId('companies')
    let company
    try {
      company = app.findFirstRecordByData('companies', 'name', 'TechCorp Brasil')
    } catch (_) {
      company = new Record(companiesCol)
      company.set('name', 'TechCorp Brasil')
      company.set('tax_id', '12.345.678/0001-90')
      company.set('status', 'active')
      app.save(company)
    }

    const modulesCol = app.findCollectionByNameOrId('modules')
    let moduleRecord
    try {
      moduleRecord = app.findFirstRecordByData('modules', 'name', 'Elektra CRM')
    } catch (_) {
      moduleRecord = new Record(modulesCol)
      moduleRecord.set('name', 'Elektra CRM')
      moduleRecord.set(
        'endpoint_url',
        'https://elektra-crm-3f417.shrd00.internal.goskip.dev/api/backend/v1/hub-sync',
      )
      moduleRecord.set('secret_key_name', 'ELEKTRA_CRM')
      moduleRecord.set('base_price', 1500)
      moduleRecord.set('status', 'active')
      app.save(moduleRecord)
    }

    const subsCol = app.findCollectionByNameOrId('subscriptions')
    try {
      app.findFirstRecordByFilter(
        'subscriptions',
        `company_id='${company.id}' && module_id='${moduleRecord.id}'`,
      )
    } catch (_) {
      const sub = new Record(subsCol)
      sub.set('company_id', company.id)
      sub.set('module_id', moduleRecord.id)
      sub.set('status', 'active')
      sub.set('price', 1500)
      app.save(sub)
    }
  },
  (app) => {
    // Safe down
  },
)
