routerAdd(
  'POST',
  '/backend/v1/checkout',
  (e) => {
    const body = e.requestInfo().body
    const user = e.auth
    const asaasKey = $secrets.get('ASAAS_API_KEY')

    if (!asaasKey) return e.internalServerError('Asaas API key not configured')

    const module = $app.findRecordById('modules', body.moduleId)
    if (!module || module.getString('status') !== 'active') {
      return e.badRequestError('Module not available')
    }

    let customerId = ''
    try {
      const existingSub = $app.findFirstRecordByFilter(
        'subscriptions',
        "user_id = {:userId} && asaas_customer_id != ''",
        { userId: user.id },
      )
      customerId = existingSub.getString('asaas_customer_id')
    } catch (_) {}

    const asaasUrl = 'https://api.asaas.com/v3'

    if (!customerId) {
      const custRes = $http.send({
        url: asaasUrl + '/customers',
        method: 'POST',
        headers: { access_token: asaasKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.getString('name'),
          email: user.getString('email'),
          cpfCnpj: user.getString('tax_id'),
          postalCode: user.getString('postal_code'),
          address: user.getString('address'),
          addressNumber: user.getString('address_number'),
          complement: user.getString('complement'),
          province: user.getString('neighborhood'),
          city: user.getString('city'),
        }),
        timeout: 15,
      })
      if (custRes.statusCode >= 300) {
        $app.logger().error('Asaas Customer Error', 'res', custRes.json)
        return e.badRequestError('Failed to create customer in payment gateway')
      }
      customerId = custRes.json.id
    }

    let modulePrice = module.getFloat('base_price')
    let nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    let appliedCoupon = null

    if (body.coupon) {
      try {
        const couponRecord = $app.findFirstRecordByData('coupons', 'code', body.coupon)
        if (couponRecord && couponRecord.getBool('active')) {
          const maxUses = couponRecord.getInt('max_uses')
          const currentUses = couponRecord.getInt('current_uses')
          if (maxUses === 0 || currentUses < maxUses) {
            appliedCoupon = couponRecord
            const type = couponRecord.getString('type')
            if (type === 'percentage') {
              const discount = couponRecord.getFloat('value')
              modulePrice = modulePrice * (1 - discount / 100)
            } else if (type === 'fixed_amount') {
              const discount = couponRecord.getFloat('value')
              modulePrice = Math.max(0, modulePrice - discount)
            } else if (type === 'free_months') {
              const freeMonths = couponRecord.getInt('free_months')
              nextDueDate = new Date(Date.now() + (freeMonths * 30 + 30) * 24 * 60 * 60 * 1000)
            }
          }
        }
      } catch (_) {}
    }

    const formattedNextDueDate = nextDueDate.toISOString().split('T')[0]

    const payload = {
      customer: customerId,
      billingType: body.paymentMethod,
      value: modulePrice,
      nextDueDate: formattedNextDueDate,
      cycle: 'MONTHLY',
      description: 'Assinatura do módulo: ' + module.getString('name'),
    }

    if (body.paymentMethod === 'CREDIT_CARD') {
      payload.creditCard = {
        holderName: body.creditCardHolderName,
        number: body.creditCardNumber,
        expiryMonth: body.creditCardExpiryMonth,
        expiryYear: body.creditCardExpiryYear,
        ccv: body.creditCardCcv,
      }
      payload.creditCardHolderInfo = {
        name: user.getString('name'),
        email: user.getString('email'),
        cpfCnpj: user.getString('tax_id'),
        postalCode: user.getString('postal_code'),
        addressNumber: user.getString('address_number'),
        addressComplement: user.getString('complement'),
        phone: '11999999999',
      }
    }

    const subRes = $http.send({
      url: asaasUrl + '/subscriptions',
      method: 'POST',
      headers: { access_token: asaasKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 20,
    })

    if (subRes.statusCode >= 300) {
      $app.logger().error('Asaas Subscription Error', 'res', subRes.json)
      return e.badRequestError('Failed to create subscription in payment gateway')
    }

    const subCollection = $app.findCollectionByNameOrId('subscriptions')
    const subRecord = new Record(subCollection)
    subRecord.set('user_id', user.id)
    subRecord.set('module_id', module.id)
    subRecord.set('status', body.paymentMethod === 'CREDIT_CARD' ? 'active' : 'trialing')
    subRecord.set('price', module.getFloat('base_price'))
    subRecord.set('asaas_customer_id', customerId)
    subRecord.set('asaas_subscription_id', subRes.json.id)
    subRecord.set('next_billing_date', nextDueDate.toISOString())

    $app.save(subRecord)

    if (appliedCoupon) {
      appliedCoupon.set('current_uses', appliedCoupon.getInt('current_uses') + 1)
      $app.save(appliedCoupon)
    }

    return e.json(200, { success: true, subscription: subRecord.id })
  },
  $apis.requireAuth(),
)
