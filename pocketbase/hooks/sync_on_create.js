onRecordAfterCreateSuccess((e) => {
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

  let payload = {}
  const isCrm = mod.getString('name').toUpperCase().includes('CRM')
  const statusSub = sub.getString('status')

  let mappedStatus = statusSub
  if (statusSub === 'active' || statusSub === 'trialing') {
    mappedStatus = 'active'
  } else if (statusSub === 'canceled' || statusSub === 'overdue') {
    mappedStatus = 'inactive'
  }

  if (isCrm) {
    if (statusSub === 'active' || statusSub === 'trialing') {
      payload = {
        action: 'provision',
        hub_id: user.id,
        company_name: user.getString('company_name') || 'Empresa Sem Nome',
        admin_email: user.getString('email'),
        admin_name: user.getString('name') || 'Admin',
      }
    } else {
      payload = {
        action: 'update_status',
        hub_id: user.id,
        status: mappedStatus,
      }
    }
  } else {
    payload = {
      subscription_id: sub.id,
      user_id: user.id,
      company_name: user.getString('company_name'),
      tax_id: user.getString('tax_id'),
      status: statusSub,
      module_slug: mod.getString('name'),
    }
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
      } else {
        responseText = 'Sem resposta JSON ou corpo vazio.'
      }
    } catch (_) {}

    if (res.statusCode < 200 || res.statusCode >= 300) {
      status = 'failed'
      errorMessage = `HTTP ${res.statusCode} | Method: POST | URL: ${endpoint} | Payload: ${JSON.stringify(payload)} | Response: ${responseText}`
    } else {
      errorMessage = `HTTP ${res.statusCode} OK`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = `Erro: ${err.message || String(err)} | Method: POST | URL: ${endpoint} | Payload: ${JSON.stringify(payload)}`
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
