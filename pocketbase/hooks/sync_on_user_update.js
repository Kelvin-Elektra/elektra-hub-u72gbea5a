onRecordAfterUpdateSuccess((e) => {
  const orig = e.record.original()
  if (orig && orig.getBool('active') === e.record.getBool('active')) {
    return e.next()
  }

  const user = e.record
  const newActive = user.getBool('active')
  let companyId = user.getString('company_id') || ''

  // Se o usuário não tiver company_id preenchido diretamente, tenta buscar se ele é dono de alguma empresa
  if (!companyId) {
    try {
      const comp = $app.findFirstRecordByFilter('companies', 'tax_id = {:tax}', {
        tax: user.getString('tax_id'),
      })
      if (comp) {
        companyId = comp.id
      }
    } catch (_) {}
  }

  // Buscar todos os módulos ativos com endpoint_url preenchido
  let activeModules = []
  try {
    activeModules = $app.findRecordsByFilter(
      'modules',
      'status = "active" && endpoint_url != ""',
      '',
      100,
      0,
    )
  } catch (err) {
    $app.logger().error('sync_on_user_update: erro ao listar módulos', 'error', String(err))
    return e.next()
  }

  for (let i = 0; i < activeModules.length; i++) {
    const mod = activeModules[i]
    let endpoint = mod.getString('endpoint_url')
    if (!endpoint) continue

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

    // Se o usuário foi ativado, buscar se ele possui vínculo com este módulo (ou se é dono)
    let roleCompany = 'user'
    if (user.getString('role') === 'User_owner') {
      roleCompany = 'admin'
    } else {
      try {
        const access = $app.findFirstRecordByFilter(
          'employee_access',
          'employee_id = {:userId} && module_id = {:moduleId}',
          { userId: user.id, moduleId: mod.id },
        )
        if (access) {
          roleCompany = access.getString('role_company') || 'user'
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
      active: newActive,
      company_id: rec.getString('company_id') || companyId,
      phone: rec.getString('phone'),
    })

    // Contrato estrito: Revogar/Reativar USUÁRIO não pode enviar company.status
    const payload = {
      hub_user_id: user.id,
      hub_company_id: companyId,
      role_company: roleCompany,
      name: user.getString('name'),
      email: user.getString('email'),
      user: exportUser(user),
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
        errorMessage = `[${mod.getString('name')}] HTTP ${res.statusCode} | Response: ${responseText}`
      } else {
        errorMessage = `[${mod.getString('name')}] HTTP ${res.statusCode} OK`
      }
    } catch (sendErr) {
      status = 'failed'
      errorMessage = `[${mod.getString('name')}] Erro: ${sendErr.message || String(sendErr)}`
    }

    try {
      const logsCol = $app.findCollectionByNameOrId('sync_logs')
      const log = new Record(logsCol)
      log.set('status', status)
      log.set('error_message', errorMessage)
      $app.save(log)
    } catch (logErr) {
      $app.logger().error('sync_on_user_update: falha ao salvar sync_log', 'error', String(logErr))
    }
  }

  return e.next()
}, 'users')
