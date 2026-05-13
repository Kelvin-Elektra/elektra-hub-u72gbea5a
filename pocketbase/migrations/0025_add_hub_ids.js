migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('hub_user_id')) {
      users.fields.add(new TextField({ name: 'hub_user_id' }))
    }
    users.addIndex('idx_users_hub_user_id', false, 'hub_user_id', '')
    app.save(users)

    const companies = app.findCollectionByNameOrId('companies')
    if (!companies.fields.getByName('hub_company_id')) {
      companies.fields.add(new TextField({ name: 'hub_company_id' }))
    }
    companies.addIndex('idx_companies_hub_company_id', false, 'hub_company_id', '')
    app.save(companies)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.removeIndex('idx_users_hub_user_id')
    const userField = users.fields.getByName('hub_user_id')
    if (userField) {
      users.fields.removeById(userField.id)
    }
    app.save(users)

    const companies = app.findCollectionByNameOrId('companies')
    companies.removeIndex('idx_companies_hub_company_id')
    const companyField = companies.fields.getByName('hub_company_id')
    if (companyField) {
      companies.fields.removeById(companyField.id)
    }
    app.save(companies)
  },
)
