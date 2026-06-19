# Merchant workflows

## M1 — onboarding

1. Мерчант оставляет заявку и выбирает сегмент/сценарий.
2. Система собирает ИНН/ОГРН, расчетный счет, сайт/канал продаж, MCC/категорию, описание fulfillment и refund policy.
3. Compliance определяет допустимость категории и договорную роль A3/Ozon Банка.
4. Мерчант получает оффер: ставка по методам, payout schedule, reserve/limits, refund/dispute fees, 54-ФЗ option.
5. После KYB создаются test credentials, webhook secret и sandbox.
6. Go-live разрешен после test payment, webhook verification и refund drill.

## M2 — pilot без разработки

`merchant cabinet -> create payment link -> amount/order/receipt -> send link -> monitor -> receipt/refund`

Подходит для фитнес-студии, обучения, бытовых услуг, брони услуги. Не подходит для сложного cart inventory и автоматического fulfillment без API.

## M3 — API integration

Минимальные операции:

- `POST /payments` с idempotency key;
- `GET /payments/{id}`;
- webhook `payment.status_changed`;
- `POST /payments/{id}/cancel` до capture/окончательного исполнения, если rail допускает;
- `POST /payments/{id}/refunds`;
- `GET /refunds/{id}`;
- reports/settlements export.

Обязательные поля: merchant/order ids, amount, currency, description, receipt items/tax, customer receipt contact, success/fail URLs, expiry, metadata allowlist.

## M4 — payment operations

| Status | Что видит мерчант | Разрешенное действие |
|---|---|---|
| `created` | ссылка создана, клиент не начал | скопировать, отменить |
| `requires_action` | клиент должен открыть/подтвердить | напомнить, показать QR |
| `pending` | банк обрабатывает | ждать; не выдавать товар без risk waiver |
| `succeeded` | сумма, комиссия, payout ETA | выполнить заказ, вернуть |
| `failed` | reason group, attempt | создать новый attempt |
| `expired` | TTL истек | новая ссылка/intent |
| `refunded` | сумма и дата возврата | выгрузить документы |

## M5 — fulfillment

Fulfillment запускается по webhook `succeeded`, но consumer обязан:

1. проверить signature и timestamp;
2. дедуплицировать event id;
3. сверить payment id, merchant id, order id, amount и currency;
4. при расхождении запросить payment status у A3Pay;
5. записать immutable audit event;
6. вернуть 2xx быстро, а бизнес-обработку выполнять асинхронно.

## M6 — reconciliation and settlement

Ежедневный report должен связывать:

`merchant_order_id -> payment_id -> provider_payment_id -> gross -> fee -> refund -> net -> payout_id -> payout_date`.

Отдельные очереди: payment succeeded but order not fulfilled; order fulfilled but payment unknown; refund in provider but not in merchant; payout mismatch; duplicate/overpayment.

## M7 — refund

- Полный возврат входит в MVP.
- Частичный возврат — P1, если Ozon API и фискализация поддерживают line-level corrections.
- Cabinet требует reason и подтверждение роли.
- API использует idempotency key.
- Нельзя обещать мгновенное зачисление возврата без provider SLA.

## M8 — support

L1 ищет по payment/order id и видит безопасный timeline. L2 видит provider correlation id и webhook attempts. L3 передает кейс Ozon Банку по согласованному SLA.

Нельзя просить у клиента CVV, пароль, SMS-код или полный номер карты. Нельзя советовать повторить оплату, пока поздний success не исключен.

## Merchant scenarios

### Фитнес

Администратор создает ссылку на абонемент; клиент платит; CRM активирует абонемент после webhook. Проверка: доля ссылок, оплаченных за 30 минут, и ручные сверки.

### Услуга/продажа через мессенджер

Продавец создает ссылку с предметом и суммой; клиент видит юридическое имя получателя; после оплаты продавец получает status. Проверка: время от ссылки до подтверждения и возвраты из-за неверного описания.

### Недвижимость

Допустимы сервисный сбор, бронь или комиссия при ясном договоре и refund policy. Основной расчет за объект, escrow/аккредитив и split между участниками не входят в этот MVP.

## Inputs used

`research-summary.md`, `scenario-user-flows.md`, Ozon Pay public product page, 161-ФЗ/54-ФЗ sources.

