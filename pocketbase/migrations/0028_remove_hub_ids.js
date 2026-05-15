migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.removeField('hub_user_id')
    users.removeIndex('idx_users_hub_user_id')
    app.save(users)

    const companies = app.findCollectionByNameOrId('companies')
    companies.removeField('hub_company_id')
    companies.removeIndex('idx_companies_hub_company_id')
    app.save(companies)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new TextField({ name: 'hub_user_id' }))
    users.addIndex('idx_users_hub_user_id', false, 'hub_user_id', '')
    app.save(users)

    const companies = app.findCollectionByNameOrId('companies')
    companies.fields.add(new TextField({ name: 'hub_company_id' }))
    companies.addIndex('idx_companies_hub_company_id', false, 'hub_company_id', '')
    app.save(companies)
  },
)
