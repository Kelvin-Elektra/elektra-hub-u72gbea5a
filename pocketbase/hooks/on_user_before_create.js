onRecordCreateRequest((e) => {
  const record = e.record

  // Set company_id if empty
  if (!record.getString('company_id')) {
    record.set(
      'company_id',
      $security.randomStringWithAlphabet(12, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),
    )
    record.set('is_owner', true)
  }

  // If not admin, set active to false initially
  if (!e.hasSuperuserAuth() && (!e.auth || e.auth.getString('role') !== 'Admin')) {
    record.set('active', false)
  }

  e.next()
}, 'users')
