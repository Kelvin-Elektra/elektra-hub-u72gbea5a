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

  endpoint = endpoint.replace('/api/backend/v1/', '/backend/v1/')

  const secret = secretName ? $secrets.get(secretName) : ''
  let status = 'success'
  let errorMessage = ''

  const statusSub = sub.getString('status')
  let mappedStatus = statusSub
  if (statusSub === 'active' || statusSub === 'trialing') {
    mappedStatus = 'active'
  } else {
    mappedStatus = 'inactive'
  }

  let hubCompanyId = user.getString('company_id')
  let companyName = user.getString('company_name')

  if (hubCompanyId) {
    try {
      const comp = $app.findRecordById('companies', hubCompanyId)
      if (comp.getString('hub_company_id')) {
        hubCompanyId = comp.getString('hub_company_id')
      }
      companyName = comp.getString('name') || companyName
    } catch (_) {}
  }

  const payload = {
    action: 'sync',
    user: {
      id: user.id,
      name: user.getString('name'),
      email: user.getString('email'),
      phone: user.getString('phone'),
      role: user.getString('role'),
    },
    company: {
      company_id: user.getString('company_id'),
      company_name: companyName,
      hub_company_id: hubCompanyId,
      status: mappedStatus,
    },
    access: {
      role_company: 'admin',
    },
    subscription: {
      id: sub.id,
      status: statusSub,
      max_users: sub.getInt('max_users') || 1,
    },
  }

  try {
    const res = $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Secret': secret || '',
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

  return e.next()
}, 'subscriptions')
