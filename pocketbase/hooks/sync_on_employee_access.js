// Hook para sincronizar criação e atualização de employee_access (quando um colaborador é associado/desassociado ou muda de role no módulo)

onRecordAfterCreateSuccess((e) => {
  const access = e.record
  const employeeId = access.getString('employee_id')
  const moduleId = access.getString('module_id')
  const companyId = access.getString('company_id')
  const roleCompany = access.getString('role_company') || 'user'

  if (!employeeId || !moduleId) return e.next()

  let employee = null
  let mod = null
  try {
    employee = $app.findRecordById('users', employeeId)
    mod = $app.findRecordById('modules', moduleId)
  } catch (err) {
    $app
      .logger()
      .error('sync_on_employee_access create: erro ao buscar user ou module', 'error', String(err))
    return e.next()
  }

  let endpoint = mod.getString('endpoint_url')
  if (!endpoint) return e.next()

  if (endpoint.includes('/api/backend/v1/')) {
    endpoint = endpoint.replace('/api/backend/v1/', '/backend/v1/')
  } else if (endpoint.endsWith('/backend/v1/sync-hub-user')) {
    endpoint = endpoint.replace('/backend/v1/sync-hub-user', '/backend/v1/hub-sync')
  } else if (!endpoint.includes('/backend/v1/hub-sync')) {
    try {
      const parts = endpoint.split('/')
      endpoint = parts[0] + '//' + parts[2] + '/backend/v1/hub-sync'
    } catch (_) {
      endpoint = endpoint.replace(/\/+$/, '') + '/backend/v1/hub-sync'
    }
  }

  const secretName = mod.getString('secret_key_name')
  const secret = secretName ? $secrets.get(secretName) : ''

  let company = null
  const effectiveCompId = companyId || employee.getString('company_id')
  if (effectiveCompId) {
    try {
      company = $app.findRecordById('companies', effectiveCompId)
    } catch (_) {}
  }

  let sub = null
  if (effectiveCompId) {
    try {
      // Assinatura do módulo para esta empresa (através do proprietário)
      const owner = $app.findFirstRecordByFilter(
        'users',
        'company_id = {:comp} && role = "User_owner"',
        { comp: effectiveCompId },
      )
      if (owner) {
        sub = $app.findFirstRecordByFilter(
          'subscriptions',
          'user_id = {:ownerId} && module_id = {:modId}',
          {
            ownerId: owner.id,
            modId: mod.id,
          },
        )
      }
    } catch (_) {}
  }

  const exportUser = (rec) => ({
    id: rec.id,
    created: rec.getString('created'),
    updated: rec.getString('updated'),
    email: rec.getString('email'),
    name: rec.getString('name'),
    avatar: rec.getString('avatar'),
    role: rec.getString('role'),
    person_type: rec.getString('person_type'),
    tax_id: rec.getString('tax_id'),
    company_name: rec.getString('company_name'),
    postal_code: rec.getString('postal_code'),
    address: rec.getString('address'),
    address_number: rec.getString('address_number'),
    complement: rec.getString('complement'),
    neighborhood: rec.getString('neighborhood'),
    city: rec.getString('city'),
    state: rec.getString('state'),
    active: rec.getBool('active'),
    company_id: rec.getString('company_id') || effectiveCompId,
    phone: rec.getString('phone'),
  })

  const exportCompany = (rec) => {
    if (!rec) return null
    return {
      id: rec.id,
      hub_company_id: rec.id,
      created: rec.getString('created'),
      updated: rec.getString('updated'),
      name: rec.getString('name'),
      nome: rec.getString('name'),
      tax_id: rec.getString('tax_id'),
      status: rec.getString('status'),
      address: rec.getString('address'),
      address_number: rec.getString('address_number'),
      complement: rec.getString('complement'),
      neighborhood: rec.getString('neighborhood'),
      city: rec.getString('city'),
      state: rec.getString('state'),
      postal_code: rec.getString('postal_code'),
    }
  }

  // 1. Sync completo do colaborador para o módulo (action: sync)
  const fullPayload = {
    action: 'sync',
    hub_user_id: employee.id,
    hub_company_id: effectiveCompId || '',
    role_company: roleCompany,
    name: employee.getString('name'),
    email: employee.getString('email'),
    user: exportUser(employee),
    company: exportCompany(company),
    subscription: sub
      ? {
          id: sub.id,
          status: sub.getString('status'),
          max_users: sub.getInt('max_users') || 1,
          module_id: sub.getString('module_id'),
          user_id: sub.getString('user_id'),
          price: sub.getFloat('price'),
          next_billing_date: sub.getString('next_billing_date'),
        }
      : null,
  }

  let status = 'success'
  let errorMessage = ''

  try {
    const res = $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': secret || '',
        Authorization: secret ? `Bearer ${secret}` : '',
      },
      body: JSON.stringify(fullPayload),
      timeout: 10,
    })

    let responseText = ''
    try {
      if (res.json) {
        responseText = JSON.stringify(res.json)
      } else if (res.body) {
        responseText = new TextDecoder().decode(res.body)
      }
    } catch (_) {}

    if (res.statusCode < 200 || res.statusCode >= 300) {
      status = 'failed'
      errorMessage = `[${mod.getString('name')}] Ativação Colaborador HTTP ${res.statusCode} | Response: ${responseText}`
    } else {
      errorMessage = `[${mod.getString('name')}] Ativação Colaborador (${employee.getString('name')}) OK`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = `[${mod.getString('name')}] Erro ativação colaborador: ${err.message || String(err)}`
  }

  // Grava log
  try {
    const logsCol = $app.findCollectionByNameOrId('sync_logs')
    const log = new Record(logsCol)
    if (sub) log.set('subscription_id', sub.id)
    log.set('status', status)
    log.set('error_message', errorMessage)
    $app.save(log)
  } catch (logErr) {
    $app
      .logger()
      .error('sync_on_employee_access: falha ao salvar sync_log', 'error', String(logErr))
  }

  // 2. Garantir também envio explícito no contrato estrito user:{active:true}
  try {
    const strictPayload = {
      hub_user_id: employee.id,
      hub_company_id: effectiveCompId || '',
      email: employee.getString('email'),
      user: { active: true, email: employee.getString('email') },
    }
    $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': secret || '',
        Authorization: secret ? `Bearer ${secret}` : '',
      },
      body: JSON.stringify(strictPayload),
      timeout: 10,
    })
  } catch (_) {}

  return e.next()
}, 'employee_access')

onRecordAfterDeleteSuccess((e) => {
  const access = e.record
  const employeeId = access.getString('employee_id')
  const moduleId = access.getString('module_id')
  const companyId = access.getString('company_id')

  if (!employeeId || !moduleId) return e.next()

  let mod = null
  try {
    mod = $app.findRecordById('modules', moduleId)
  } catch (_) {
    return e.next()
  }

  let endpoint = mod.getString('endpoint_url')
  if (!endpoint) return e.next()

  if (endpoint.includes('/api/backend/v1/')) {
    endpoint = endpoint.replace('/api/backend/v1/', '/backend/v1/')
  } else if (endpoint.endsWith('/backend/v1/sync-hub-user')) {
    endpoint = endpoint.replace('/backend/v1/sync-hub-user', '/backend/v1/hub-sync')
  } else if (!endpoint.includes('/backend/v1/hub-sync')) {
    try {
      const parts = endpoint.split('/')
      endpoint = parts[0] + '//' + parts[2] + '/backend/v1/hub-sync'
    } catch (_) {
      endpoint = endpoint.replace(/\/+$/, '') + '/backend/v1/hub-sync'
    }
  }

  const secretName = mod.getString('secret_key_name')
  const secret = secretName ? $secrets.get(secretName) : ''

  // Buscar e-mail do colaborador antes de disparar a revogação
  let employeeEmail = ''
  try {
    const empRec = $app.findRecordById('users', employeeId)
    if (empRec) {
      employeeEmail = empRec.getString('email') || ''
    }
  } catch (_) {}

  // Revogação de usuário no módulo (contrato estrito: user:{active:false} SEM company.status)
  const revokePayload = {
    hub_user_id: employeeId,
    hub_company_id: companyId || '',
    email: employeeEmail,
    user: { active: false, email: employeeEmail },
  }

  let status = 'success'
  let errorMessage = ''

  try {
    const res = $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret': secret || '',
        Authorization: secret ? `Bearer ${secret}` : '',
      },
      body: JSON.stringify(revokePayload),
      timeout: 10,
    })

    let responseText = ''
    try {
      if (res.json) {
        responseText = JSON.stringify(res.json)
      } else if (res.body) {
        responseText = new TextDecoder().decode(res.body)
      }
    } catch (_) {}

    if (res.statusCode < 200 || res.statusCode >= 300) {
      status = 'failed'
      errorMessage = `[${mod.getString('name')}] Revogação Colaborador HTTP ${res.statusCode} | Response: ${responseText}`
    } else {
      errorMessage = `[${mod.getString('name')}] Revogação Colaborador (${employeeId}) OK`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = `[${mod.getString('name')}] Erro revogação colaborador: ${err.message || String(err)}`
  }

  try {
    const logsCol = $app.findCollectionByNameOrId('sync_logs')
    const log = new Record(logsCol)
    log.set('status', status)
    log.set('error_message', errorMessage)
    $app.save(log)
  } catch (logErr) {
    $app
      .logger()
      .error('sync_on_employee_access delete: falha ao salvar sync_log', 'error', String(logErr))
  }

  return e.next()
}, 'employee_access')
