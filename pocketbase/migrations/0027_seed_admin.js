migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  try {
    app.findAuthRecordByEmail('users', 'elektraengenhariasolucoes@gmail.com')
    return
  } catch (_) {}

  const record = new Record(users)
  record.setEmail('elektraengenhariasolucoes@gmail.com')
  record.setPassword('Skip@Pass')
  record.setVerified(true)
  record.set('name', 'Admin')
  record.set('role', 'Admin')
  record.set('active', true)
  app.save(record)
})
