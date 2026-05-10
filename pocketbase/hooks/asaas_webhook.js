routerAdd('POST', '/backend/v1/asaas-webhook', (e) => {
  const body = e.requestInfo().body
  const event = body.event
  const payment = body.payment

  if (!payment || !payment.subscription) {
    return e.json(200, { status: 'ignored' })
  }

  const subId = payment.subscription

  try {
    const subRecord = $app.findFirstRecordByFilter(
      'subscriptions',
      'asaas_subscription_id = {:subId}',
      { subId: subId },
    )

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      subRecord.set('status', 'active')
    } else if (event === 'PAYMENT_OVERDUE') {
      subRecord.set('status', 'overdue')
    } else if (event === 'PAYMENT_DELETED' || event === 'PAYMENT_REFUNDED') {
      subRecord.set('status', 'canceled')
    }

    $app.save(subRecord)
  } catch (_) {
    // Subscription not found in database, ignoring
  }

  return e.json(200, { status: 'received' })
})
