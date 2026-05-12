migrate(
  (app) => {
    app.db().newQuery('DELETE FROM subscriptions').execute()
    app.db().newQuery('DELETE FROM sync_logs').execute()
    app.db().newQuery('DELETE FROM companies').execute()
    app
      .db()
      .newQuery("DELETE FROM users WHERE email != 'elektraengenhariasolucoes@gmail.com'")
      .execute()
  },
  (app) => {
    // Irreversible cleanup migration
  },
)
