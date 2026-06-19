# MVP options and decision

## O1 — Hosted checkout + Ozon deeplink/QR

- `confidence`: high для продуктовой формы, medium для конкретного Ozon API contract
- `customer`: выбирает A3Pay, проверяет сумму, переходит в Ozon, подтверждает
- `merchant`: payment link или API + webhook
- `pros`: совпадает с публично доступными паттернами; ясный consent; хороший recovery
- `cons`: межприложенческий переход; нужна надежная link routing
- `decision`: **recommended**

## O2 — Phone-to-push request

- `confidence`: low, partner-dependent
- `customer`: вводит телефон, получает push, подтверждает в Ozon
- `merchant`: создает request с phone
- `pros`: потенциально коротко на desktop/call-center
- `cons`: privacy, wrong number, delivery uncertainty, phishing perception, account discovery, отсутствующая публичная документация
- `decision`: discovery prototype после API workshop, не baseline MVP

## O3 — Payment link sent by SMS/messenger

- `confidence`: high как delivery pattern
- `customer`: получает secure link и сам открывает trusted checkout
- `merchant`: создает ссылку без разработки
- `pros`: быстрый pilot для услуг/social commerce; телефон не является payment credential
- `cons`: delivery cost, phishing risk, нужен branded domain
- `decision`: включить в pilot alongside O1

## O4 — Embedded Ozon Pay widget in merchant checkout

- `confidence`: medium, зависит от SDK/widget
- `pros`: меньше контекстных переходов
- `cons`: PCI/security scope и партнерский API; сложнее поддержка
- `decision`: P1 после hosted flow

## Decision criteria

| Criterion | O1 | O2 | O3 | O4 |
|---|---:|---:|---:|---:|
| Публично подтвержденный pattern | 3 | 0 | 3 | 2 |
| Privacy simplicity | 3 | 1 | 2 | 3 |
| Recovery clarity | 3 | 1 | 2 | 2 |
| Pilot speed | 2 | 0 | 3 | 1 |
| Merchant automation | 3 | 2 | 1 | 3 |
| Итого | 14 | 4 | 11 | 11 |

Шкала 0-3 является экспертной оценкой для выбора прототипа, а не рыночным фактом.

## Go/no-go questions for Ozon Bank

1. Какая модель доступна: Ozon Pay checkout, account-to-account, saved credential, private RtP?
2. Может ли A3 быть aggregator/agent/technology provider, кто заключает договор с merchant?
3. Обязателен ли расчетный счет мерчанта в Ozon Банке?
4. Есть ли multi-merchant/platform API и sub-merchant onboarding?
5. Какие способы можно ограничить до «Ozon account only»?
6. Есть ли phone lookup/push API; какое правовое основание и disclosure?
7. Какие webhook events, signatures, retries, SLA и status query?
8. Partial refunds, cancellation, chargebacks/disputes?
9. 54-ФЗ: кто пользователь ККТ, кто формирует чек и коррекцию?
10. Settlement schedule, reserves, limits, MCC exclusions, pricing?

## Inputs used

`research-summary.md`, `scenario-user-flows.md`, `merchant-workflows.md`.

