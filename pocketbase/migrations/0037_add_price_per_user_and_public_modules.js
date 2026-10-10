migrate(
  (app) => {
    const modules = app.findCollectionByNameOrId('modules')

    // 1. Adicionar price_per_user se não existir
    if (!modules.fields.getByName('price_per_user')) {
      modules.fields.add(
        new NumberField({
          name: 'price_per_user',
          min: 0,
          required: false,
        }),
      )
    }

    // 2. Permitir leitura pública dos módulos (listRule e viewRule vazias "")
    // para que a tela de login (usuários deslogados) consiga carregar logos e nomes dos módulos ativos
    modules.listRule = ''
    modules.viewRule = ''

    app.save(modules)

    // 3. Atualizar módulos existentes com valores razoáveis caso price_per_user seja 0/nulo
    try {
      const records = app.findRecordsByFilter('modules', '', '', 100, 0)
      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        if (!rec.getFloat('price_per_user')) {
          // Ex: CRM 29.90 por usuário extra, Flow 19.90, Insights 9.90
          const name = rec.getString('name')
          let defaultPpu = 29.9
          if (name.includes('Flow')) defaultPpu = 19.9
          if (name.includes('Insights')) defaultPpu = 9.9
          rec.set('price_per_user', defaultPpu)
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {
    const modules = app.findCollectionByNameOrId('modules')
    modules.listRule = "@request.auth.id != ''"
    modules.viewRule = "@request.auth.id != ''"
    modules.fields.removeByName('price_per_user')
    app.save(modules)
  },
)
