onRecordCreateRequest((e) => {
  const record = e.record

  // If not admin, manage active status
  if (!e.hasSuperuserAuth() && (!e.auth || e.auth.getString('role') !== 'Admin')) {
    if (record.getString('role') === 'User_owner') {
      record.set('active', true)
    } else {
      record.set('active', false)
    }
  }

  e.next()
}, 'users')
