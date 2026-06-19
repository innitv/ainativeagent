# FigJam board specification

## Surface

- `surface_type`: `figma_board` / FigJam
- `title`: `A3Pay × Ozon Банк — MVP payment workflow`
- `audience`: product, partnership, engineering, legal, operations, sales
- `canvas`: 7 zones слева направо; customer flow сверху, merchant/system снизу
- `status`: ready_for_write_after_exact_target_approval

## Zone 1 — Контекст и факты

Cards:

- Публично подтверждено: Ozon Pay form/link/CMS/API, cards/SBP, reports, refunds, checks.
- Не подтверждено: phone lookup → Ozon Bank push.
- СБП: не более 0,4/0,7%; ЖКУ до 0,2%, cap 10 ₽.
- Product decision: не обещать «дешевле СБП» без segment economics.

## Zone 2 — Recommended customer happy path

Flowchart:

`Заказ у мерчанта -> Выбрать A3Pay -> A3Pay hosted checkout -> Ozon deeplink/QR -> Проверить получателя и сумму -> Подтвердить -> A3Pay получает provider callback -> Merchant получает signed webhook -> Успех + чек`

Красным note: `return_url != payment success`.

## Zone 3 — Customer recovery branches

Decision tree:

- App installed? yes -> deeplink; no -> web/fallback if supported.
- Ozon eligibility? yes -> confirm; no -> honest stop/fallback policy.
- Push/link missing -> open app / QR / resend with cooldown.
- Pending after return -> status check, never auto-repeat.
- Failed -> new attempt.
- Late success -> block duplicate fulfillment/payment.

## Zone 4 — Merchant journey

Swimlane:

`Application -> KYB/MCC -> contract/pricing -> sandbox -> test payment/refund -> go-live -> create link/API -> webhook fulfillment -> reconciliation -> refund/support`.

Roles: merchant, A3Pay, Ozon Bank, fiscal service.

## Zone 5 — System sequence

Participants: `Buyer`, `Merchant`, `A3Pay`, `Ozon`, `Fiscalization`.

Messages:

1. create order/payment
2. return payment URL
3. authorize in Ozon
4. provider status callback
5. A3Pay verify/store
6. signed merchant webhook
7. receipt request/result
8. browser status refresh

## Zone 6 — Options and decision

Four columns O1-O4 from `mvp-options.md`; O1 green `recommended`, O3 blue `pilot companion`, O2 red `partner-dependent`, O4 gray `P1`.

## Zone 7 — Unknowns, experiments, go/no-go

- API/role/legal checklist.
- 3 pilot merchants × 4 weeks.
- Metrics: completion, time-to-pay, effective fee, reconciliation minutes, support, refund time.
- Go: provider contract + sandbox + clear fallback + economics.
- No-go: only browser redirect status; no idempotency; no exact role; price claim unproven.

## Visual rules

- Russian Publication Gate: весь видимый текст на русском; `API`, `webhook`, `MVP`, `C2B`, `KYB`, `MCC` допустимы.
- Facts — белые cards с source tag; assumptions — желтые; decisions — синие; blockers — красные; metrics — зеленые.
- Не использовать декоративные charts: board объясняет последовательность, решения и ownership.
- Каждая зона имеет `inputs_used` note и ссылку на файл research pack.

## Verification after write

1. Получить inventory frames/sections/stickies/connectors.
2. Проверить наличие всех 7 zones.
3. Получить screenshot всей board и 2 key zones.
4. Сверить customer/merchant/error coverage.
5. Записать node ids и deviations в `figma-visualization-result.md`.

## Inputs used

Весь research pack, `visual-reference-cards.md`, `surface-output-contract.md`.

