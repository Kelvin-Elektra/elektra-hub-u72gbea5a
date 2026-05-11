migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    // Add index on the active field
    col.addIndex('idx_users_active', false, 'active', '')
    app.save(col)

    // Ensure all existing users default to true for the active field
    app.db().newQuery('UPDATE users SET active = 1 WHERE active IS NULL OR active = 0').execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.removeIndex('idx_users_active')
    app.save(col)
  },
)
