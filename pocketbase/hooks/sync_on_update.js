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

  const endpoint = mod.getString('endpoint_url')
  const secretName = mod.getString('secret_key_name')

  if (!endpoint) return e.next()

  const secret = secretName ? $secrets.get(secretName) : ''
  let status = 'success'
  let errorMessage = ''

  let user
  try {
    user = $app.findRecordById('users', sub.getString('user_id'))
  } catch (_) {
    return e.next()
  }

  try {
    const res = $http.send({
      url: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Secret': secret || '',
      },
      body: JSON.stringify(
        mod.getString('name').toUpperCase().includes('CRM')
          ? {
              action:
                sub.getString('status') === 'active' || sub.getString('status') === 'trialing'
                  ? 'provision'
                  : 'update_status',
              ...(sub.getString('status') === 'active' || sub.getString('status') === 'trialing'
                ? {
                    company_name: user.getString('company_name'),
                    admin_email: user.getString('email'),
                    admin_name: user.getString('name'),
                  }
                : {
                    company_id: user.id,
                    status: 'inactive',
                  }),
            }
          : {
              subscription_id: sub.id,
              user_id: user.id,
              company_name: user.getString('company_name'),
              tax_id: user.getString('tax_id'),
              status: sub.getString('status'),
              module_slug: mod.getString('name'),
            },
      ),
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
