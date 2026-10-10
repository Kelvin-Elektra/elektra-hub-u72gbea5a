// Hook para exclusão real de colaboradores da collection 'users'
// 1. Antes de deletar: verificar permissão de User_owner sobre User_employee da mesma empresa e remover acessos em employee_access
// 2. Disparar sincronização de revogação para todos os módulos vinculados ao colaborador

onRecordDeleteRequest((e) => {
  const user = e.record
  const auth = e.auth

  // Superuser e Admin têm permissão total
  if (!auth) return e.next()
  const authRole = auth.getString('role')
  if (authRole === 'Admin') return e.next()

  // Se o próprio usuário estiver se deletando (caso geral do PB)
  if (auth.id === user.id) {
    // Proprietário não pode se auto-deletar por aqui
    if (user.getString('role') === 'User_owner') {
      return e.forbiddenError('O proprietário da empresa não pode ser excluído.')
    }
    return e.next()
  }

  // User_owner deletando colaborador da sua empresa
  if (authRole === 'User_owner') {
    const authCompanyId = auth.getString('company_id')
    const userCompanyId = user.getString('company_id')
    const userRole = user.getString('role')

    if (!authCompanyId || authCompanyId !== userCompanyId) {
      return e.forbiddenError('Você só pode remover colaboradores da sua própria empresa.')
    }

    if (userRole !== 'User_employee') {
      return e.forbiddenError('Apenas colaboradores podem ser excluídos.')
    }

    return e.next()
  }

  return e.forbiddenError('Você não tem permissão para excluir este usuário.')
}, 'users')

onRecordAfterDeleteSuccess((e) => {
  const user = e.record
  const userId = user.id
  const companyId = user.getString('company_id') || ''

  // Buscar todos os registros de employee_access deste colaborador antes ou associados a ele
  let accesses = []
  try {
    accesses = $app.findRecordsByFilter('employee_access', 'employee_id = {:userId}', '', 100, 0, {
      userId: userId,
    })
  } catch (err) {
    $app.logger().error('on_user_delete: erro ao buscar employee_access', 'error', String(err))
  }

  // Armazenar os module_ids associados para garantir revogação
  const moduleIds = []
  for (let i = 0; i < accesses.length; i++) {
    const mId = accesses[i].getString('module_id')
    if (mId && moduleIds.indexOf(mId) === -1) {
      moduleIds.push(mId)
    }
    // Deletar o registro de employee_access (isso também disparará o hook sync_on_employee_access delete se houver)
    try {
      $app.delete(accesses[i])
    } catch (delErr) {
      $app
        .logger()
        .error('on_user_delete: erro ao deletar employee_access record', 'error', String(delErr))
    }
  }

  // Para cada módulo onde o usuário tinha acesso, garantir envio de revogação no contrato estrito:
  // { hub_user_id, hub_company_id, user: { active: false } } SEM company.status
  for (let j = 0; j < moduleIds.length; j++) {
    const moduleId = moduleIds[j]
    try {
      const mod = $app.findRecordById('modules', moduleId)
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

      const revokePayload = {
        hub_user_id: userId,
        hub_company_id: companyId,
        user: { active: false },
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
          errorMessage = `[${mod.getString('name')}] Exclusão Colaborador Revogação HTTP ${res.statusCode} | Response: ${responseText}`
        } else {
          errorMessage = `[${mod.getString('name')}] Exclusão Colaborador Revogação (${userId}) OK`
        }
      } catch (httpErr) {
        status = 'failed'
        errorMessage = `[${mod.getString('name')}] Erro revogação na exclusão: ${httpErr.message || String(httpErr)}`
      }

      try {
        const logsCol = $app.findCollectionByNameOrId('sync_logs')
        const log = new Record(logsCol)
        log.set('status', status)
        log.set('error_message', errorMessage)
        $app.save(log)
      } catch (_) {}
    } catch (modErr) {
      $app.logger().error('on_user_delete: erro ao revogar no módulo', 'error', String(modErr))
    }
  }

  return e.next()
}, 'users')
