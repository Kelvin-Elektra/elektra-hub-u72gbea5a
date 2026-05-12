routerAdd('POST', '/backend/v1/asaas-webhook', (e) => {
  const body = e.requestInfo().body
  const event = body.event
  const payment = body.payment

  if (!payment || !payment.subscription) {
    return e.json(200, { status: 'ignored' })
  }

  const subId = payment.subscription
  let status = ''

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    status = 'active'
  } else if (event === 'PAYMENT_OVERDUE') {
    status = 'overdue'
  } else if (
    event === 'PAYMENT_DELETED' ||
    event === 'PAYMENT_REFUNDED' ||
    event === 'SUBSCRIPTION_DELETED'
  ) {
    status = 'canceled'
  }

  try {
    const subRecord = $app.findFirstRecordByFilter(
      'subscriptions',
      'asaas_subscription_id = {:subId}',
      { subId: subId },
    )

    if (status) {
      subRecord.set('status', status)
      $app.save(subRecord)
    }

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const desc = payment.description || ''
      const match = desc.match(/\|\s*Cupom:\s*([A-Za-z0-9_-]+)/)

      if (match && match[1]) {
        try {
          const couponCode = match[1]

          const existingLogs = $app.findRecordsByFilter(
            'sync_logs',
            `subscription_id = "${subRecord.id}" && error_message ~ "Webhook event: PAYMENT_RECEIVED"`,
            '',
            1,
            0,
          )

          const existingConfirmedLogs = $app.findRecordsByFilter(
            'sync_logs',
            `subscription_id = "${subRecord.id}" && error_message ~ "Webhook event: PAYMENT_CONFIRMED"`,
            '',
            1,
            0,
          )

          if (existingLogs.length === 0 && existingConfirmedLogs.length === 0) {
            const couponRecord = $app.findFirstRecordByData('coupons', 'code', couponCode)
            couponRecord.set('current_uses', couponRecord.getInt('current_uses') + 1)
            $app.save(couponRecord)
          }
        } catch (err) {
          $app.logger().error('Failed to increment coupon', 'error', err.message)
        }
      }
    }

    try {
      const syncLogsCol = $app.findCollectionByNameOrId('sync_logs')
      const logRecord = new Record(syncLogsCol)
      logRecord.set('subscription_id', subRecord.id)
      logRecord.set('status', 'success')
      logRecord.set('error_message', `Webhook event: ${event}`)
      $app.save(logRecord)
    } catch (_) {}
  } catch (_) {
    // Subscription not found in database, ignoring
  }

  return e.json(200, { status: 'received' })
})
