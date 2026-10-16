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
  const userEmail = user.getString('email') || ''
  const companyId = user.getString('company_id') || ''

  // Limpar quaisquer registros de employee_access remanescentes deste colaborador
  try {
    const accesses = $app.findRecordsByFilter(
      'employee_access',
      'employee_id = {:userId}',
      '',
      100,
      0,
      { userId: userId },
    )
    for (let i = 0; i < accesses.length; i++) {
      try {
        $app.delete(accesses[i])
      } catch (delErr) {
        $app
          .logger()
          .error(
            'on_user_delete: erro ao deletar employee_access remanescente',
            'error',
            String(delErr),
          )
      }
    }
  } catch (err) {
    $app
      .logger()
      .error('on_user_delete: erro ao buscar employee_access para limpeza', 'error', String(err))
  }

  // Buscar todos os módulos ativos com endpoint_url preenchido
  // Enviar o payload de exclusão definitiva para todos os módulos ativos garante que mesmo se
  // o front já removeu employee_access antes da exclusão do usuário, os módulos recebam { deleted: true }.
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
    $app.logger().error('on_user_delete: erro ao listar módulos ativos', 'error', String(err))
    return e.next()
  }

  // Para cada módulo ativo, enviar o payload de exclusão definitiva mantendo o contrato estrito:
  // { hub_user_id, hub_company_id, email, deleted: true, user: { active: false, email } }
  for (let j = 0; j < activeModules.length; j++) {
    const mod = activeModules[j]
    try {
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
        email: userEmail,
        deleted: true,
        user: { active: false, email: userEmail },
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
