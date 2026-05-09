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

  const endpoint = mod.getString('endpoint_url')
  const secretName = mod.getString('secret_key_name')

  if (!endpoint) return e.next()

  const secret = secretName ? $secrets.get(secretName) : ''
  let status = 'success'
  let errorMessage = ''

  try {
    const res = $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Secret': secret || '',
      },
      body: JSON.stringify({
        company_id: sub.getString('company_id'),
        status: sub.getString('status'),
        module_slug: mod.getString('name'),
      }),
      timeout: 10,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      status = 'failed'
      errorMessage = `HTTP ${res.statusCode}`
    }
  } catch (err) {
    status = 'failed'
    errorMessage = err.message || String(err)
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
