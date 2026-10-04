onRecordAfterUpdateSuccess((e) => {
  const orig = e.record.original()
  if (orig && orig.getString('status') === e.record.getString('status')) {
    return e.next()
  }

  const sub = e.record
  const moduleId = sub.getString('module_id')
  if (!moduleId) return e.next()

  let mod
  try {
    mod = $app.findRecordById('modules', moduleId)
  } catch (_) {
    return e.next()
  }

  let user
  try {
    user = $app.findRecordById('users', sub.getString('user_id'))
  } catch (_) {
    return e.next()
  }

  let endpoint = mod.getString('endpoint_url')
  const secretName = mod.getString('secret_key_name')

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

  const secret = secretName ? $secrets.get(secretName) : ''

  let companyId = user.getString('company_id') || ''
  let company = null
  if (companyId) {
    try {
      company = $app.findRecordById('companies', companyId)
    } catch (_) {}
  }

  // Se o usuário não tiver company_id vinculado diretamente, tenta encontrar a empresa pelo tax_id ou por owner
  if (!companyId) {
    try {
      const taxId = user.getString('tax_id')
      if (taxId) {
        company = $app.findFirstRecordByFilter('companies', 'tax_id = {:tax}', { tax: taxId })
        if (company) companyId = company.id
      }
    } catch (_) {}
  }

  let roleCompany = 'user'
  if (user.getString('role') === 'User_owner') {
    roleCompany = 'admin'
  } else {
    try {
      const access = $app.findFirstRecordByFilter(
        'employee_access',
        'employee_id = {:userId} && module_id = {:moduleId}',
        {
          userId: user.id,
          moduleId: mod.id,
        },
      )
      roleCompany = access.getString('role_company') || 'user'
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
    company_id: rec.getString('company_id'),
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

  const payload = {
    action: 'sync',
    hub_user_id: user.id,
    hub_company_id: companyId || '',
    role_company: roleCompany,
    user: exportUser(user),
    company: exportCompany(company),
    subscription: {
      id: sub.id,
      status: sub.getString('status'),
      max_users: sub.getInt('max_users') || 1,
      module_id: sub.getString('module_id'),
      user_id: sub.getString('user_id'),
      price: sub.getFloat('price'),
      next_billing_date: sub.getString('next_billing_date'),
    },
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
      body: JSON.stringify(payload),
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
      errorMessage = `HTTP ${res.statusCode} | Response: ${responseText}`
    } else {
      errorMessage = `HTTP ${res.statusCode} OK`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = `Erro: ${err.message || String(err)}`
  }

  try {
    const logsCol = $app.findCollectionByNameOrId('sync_logs')
    const log = new Record(logsCol)
    log.set('subscription_id', sub.id)
    log.set('status', status)
    log.set('error_message', errorMessage)
    $app.save(log)
  } catch (logErr) {
    $app.logger().error('Failed to save sync log', 'error', String(logErr))
  }

  // Se o status da assinatura mudou entre ativo e inativo/cancelado,
  // enviar a chamada de revogação/reativação estrita do contrato (company.status)
  const prevStatus = orig ? orig.getString('status') : ''
  const newStatus = sub.getString('status')
  const wasActive = prevStatus === 'active' || prevStatus === 'trialing'
  const isNowActive = newStatus === 'active' || newStatus === 'trialing'

  if (wasActive !== isNowActive) {
    // Determinar o usuário dono da empresa/assinatura para hub_user_id
    let ownerUserId = user.id
    if (user.getString('role') !== 'User_owner' && companyId) {
      try {
        const ownerUser = $app.findFirstRecordByFilter(
          'users',
          'company_id = {:comp} && role = "User_owner"',
          { comp: companyId },
        )
        if (ownerUser) ownerUserId = ownerUser.id
      } catch (_) {}
    }

    const targetCompanyStatus = isNowActive ? 'active' : 'inactive'
    const revocationPayload = {
      hub_user_id: ownerUserId,
      hub_company_id: companyId,
      company: { status: targetCompanyStatus },
    }

    let revStatus = 'success'
    let revErrorMessage = ''

    try {
      const resRev = $http.send({
        url: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret': secret || '',
          Authorization: secret ? `Bearer ${secret}` : '',
        },
        body: JSON.stringify(revocationPayload),
        timeout: 10,
      })

      let resRevText = ''
      try {
        if (resRev.json) {
          resRevText = JSON.stringify(resRev.json)
        } else if (resRev.body) {
          resRevText = new TextDecoder().decode(resRev.body)
        }
      } catch (_) {}

      if (resRev.statusCode < 200 || resRev.statusCode >= 300) {
        revStatus = 'failed'
        revErrorMessage = `[Revogação/Reativação Assinatura] HTTP ${resRev.statusCode} | Response: ${resRevText}`
      } else {
        revErrorMessage = `[Revogação/Reativação Assinatura] HTTP ${resRev.statusCode} OK (company.status=${targetCompanyStatus})`
      }
    } catch (errRev) {
      revStatus = 'failed'
      revErrorMessage = `[Revogação/Reativação Assinatura] Erro: ${errRev.message || String(errRev)}`
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('sync_logs')
      const logRev = new Record(logsCol)
      logRev.set('subscription_id', sub.id)
      logRev.set('status', revStatus)
      logRev.set('error_message', revErrorMessage)
      $app.save(logRev)
    } catch (logErr) {
      $app.logger().error('Failed to save revocation sync log', 'error', String(logErr))
    }
  }

  return e.next()
}, 'subscriptions')
