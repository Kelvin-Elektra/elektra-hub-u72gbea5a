migrate((app) => {
  const tables = ['sync_logs', 'employee_access', 'subscriptions', 'companies', 'users']
  tables.forEach((t) => {
    try {
      app.db().newQuery(`DELETE FROM ${t}`).execute()
    } catch (_) {}
  })

  const usersCol = app.findCollectionByNameOrId('users')

  const roleField = usersCol.fields.getByName('role')
  if (roleField) {
    roleField.values = ['Admin', 'User_owner', 'User_employee']
  }

  if (!usersCol.fields.getByName('phone')) {
    usersCol.fields.add(new TextField({ name: 'phone' }))
  }

  const isOwnerField = usersCol.fields.getByName('is_owner')
  if (isOwnerField) {
    usersCol.fields.removeByName('is_owner')
  }

  usersCol.listRule =
    "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && company_id != '')"
  usersCol.viewRule =
    "id = @request.auth.id || @request.auth.role = 'Admin' || (company_id = @request.auth.company_id && @request.auth.role = 'User_owner' && company_id != '')"

  app.save(usersCol)

  const employeeAccessCol = app.findCollectionByNameOrId('employee_access')
  if (!employeeAccessCol.fields.getByName('role_company')) {
    employeeAccessCol.fields.add(
      new SelectField({
        name: 'role_company',
        values: ['admin', 'user'],
        maxSelect: 1,
      }),
    )
  }

  employeeAccessCol.listRule =
    "@request.auth.id != '' && (@request.auth.company_id = company_id || @request.auth.role = 'Admin')"
  employeeAccessCol.viewRule =
    "@request.auth.id != '' && (@request.auth.company_id = company_id || @request.auth.role = 'Admin')"
  employeeAccessCol.createRule =
    "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.role = 'User_owner'"
  employeeAccessCol.updateRule =
    "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.role = 'User_owner'"
  employeeAccessCol.deleteRule =
    "@request.auth.id != '' && @request.auth.company_id = company_id && @request.auth.role = 'User_owner'"

  app.save(employeeAccessCol)
})
