# Visual reference cards

## VR1 — Banked pay-by-bank

- `source`: Lazyweb / [Banked](https://banked.com/en-us/consumer)
- `surface_type`: pay-by-bank confirmation
- `screen/state`: entry before bank authorization
- `observed_pattern`: короткое обещание, один CTA `Pay now`, явная связь с банковским счетом
- `borrow`: один главный способ и ясный переход в доверенную банковскую поверхность
- `avoid`: маркетинговый экран вместо деталей конкретного заказа
- `applicability`: high для A3Pay hosted page
- `IP/trade-dress risk`: low при заимствовании паттерна, не визуального стиля
- `output_location`: FigJam zone 2, customer happy path
- `decision`: applied

## VR2 — Stripe Checkout

- `source`: Lazyweb / [Stripe Checkout](https://stripe.com/payments/checkout)
- `surface_type`: hosted checkout
- `screen/state`: method selection and order confirmation
- `observed_pattern`: PSP владеет платежной поверхностью, мерчант получает стандартизированный flow
- `borrow`: отделить A3Pay checkout от merchant order page; не смешивать статус браузера и backend status
- `avoid`: лишние методы в single-method MVP
- `applicability`: high
- `IP/trade-dress risk`: low
- `output_location`: zones 2 and 5
- `decision`: applied

## VR3 — eBay review before pay

- `source`: Lazyweb / [eBay](https://www.ebay.com)
- `surface_type`: mobile checkout
- `screen/state`: final review
- `observed_pattern`: перед CTA видны item/order, payment method и final amount
- `borrow`: показать мерчанта, предмет и сумму до перехода в Ozon
- `avoid`: marketplace-specific shipping complexity
- `applicability`: medium-high
- `IP/trade-dress risk`: low
- `output_location`: zone 2
- `decision`: applied

## VR4 — Walmart phone as contact

- `source`: Lazyweb / [Walmart](https://www.walmart.com)
- `surface_type`: checkout
- `screen/state`: order review
- `observed_pattern`: телефон объяснен как канал order updates, отдельно от payment method
- `borrow`: если просим номер, подписать «отправить ссылку/статус», не выдавать его за payment credential
- `avoid`: обязательный телефон без объяснения
- `applicability`: high
- `IP/trade-dress risk`: low
- `output_location`: zone 3, fallback/error branches
- `decision`: applied

## VR5 — Xendit platform dashboard

- `source`: Lazyweb / [Xendit](https://www.xendit.co/en/products/xenplatform)
- `surface_type`: merchant/platform console
- `screen/state`: multiple businesses, balances and transaction totals
- `observed_pattern`: различение merchant accounts и агрегированных показателей
- `borrow`: merchant -> payments -> settlements hierarchy
- `avoid`: сложный partner hierarchy в MVP кабинете
- `applicability`: medium
- `IP/trade-dress risk`: low
- `output_location`: zone 4, merchant workflow
- `decision`: deferred to cabinet design

## Rejected references

- Generic card checkout без bank handoff — слишком слабое совпадение.
- BNPL selection screens — не входят в MVP.
- Merchant marketing landing pages без реального operational UI — не доказывают workflow.

