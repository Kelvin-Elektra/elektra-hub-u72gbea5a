onRecordAfterUpdateSuccess((e) => {
  const orig = e.record.original()
  if (orig && orig.getString('status') === e.record.getString('status')) {
    return e.next()
  }

  const company = e.record
  const companyId = company.id
  const newCompanyStatus = company.getString('status') || 'inactive'

  // Buscar usuário dono da empresa (role = User_owner)
  let ownerUser = null
  try {
    ownerUser = $app.findFirstRecordByFilter(
      'users',
      'company_id = {:comp} && role = "User_owner"',
      { comp: companyId },
    )
  } catch (_) {
    // Se não encontrar com role User_owner e company_id, tenta encontrar qualquer usuário da empresa
    try {
      ownerUser = $app.findFirstRecordByFilter('users', 'company_id = {:comp}', {
        comp: companyId,
      })
    } catch (_) {}
  }

  // hub_user_id é obrigatório no contrato de revogação/reativação
  if (!ownerUser) {
    $app
      .logger()
      .warn(
        'sync_on_company_update: nenhum usuário encontrado para a empresa',
        'companyId',
        companyId,
      )
    return e.next()
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
    $app.logger().error('sync_on_company_update: erro ao listar módulos', 'error', String(err))
    return e.next()
  }

  for (let i = 0; i < activeModules.length; i++) {
    const mod = activeModules[i]
    let endpoint = mod.getString('endpoint_url')
    if (!endpoint) continue

    endpoint = endpoint.replace('/api/backend/v1/', '/backend/v1/')
    const secretName = mod.getString('secret_key_name')
    const secret = secretName ? $secrets.get(secretName) : ''

    const payload = {
      hub_user_id: ownerUser.id,
      hub_company_id: companyId,
      user: { active: true },
      company: { status: newCompanyStatus },
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
      $app
        .logger()
        .error('sync_on_company_update: falha ao salvar sync_log', 'error', String(logErr))
    }
  }

  return e.next()
}, 'companies')
