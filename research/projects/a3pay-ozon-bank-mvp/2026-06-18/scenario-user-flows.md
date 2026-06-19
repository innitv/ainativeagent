# Customer workflows A3Pay × Ozon Банк

## Как читать подробные кейсы

Для каждого кейса используется цепочка **кто → ситуация → трение → решение → почему сработает → как проверяем**. Это не перечень экранов: путь пользователя связывает его вопрос, системное состояние, действие мерчанта и метрику результата.

## Сквозной user_flow / user flow

Шаг 1: покупатель заканчивает выбор у мерчанта и проверяет сумму. Шаг 2: выбирает A3Pay и понимает, что подтверждение пройдет в Ozon. Шаг 3: A3Pay создает конкретный payment intent и показывает получателя. Шаг 4: пользователь открывает Ozon по deeplink/QR. Шаг 5: проверяет сумму и подтверждает. Шаг 6: A3Pay получает provider status, а мерчант — signed webhook. Шаг 7: покупатель видит финальный результат и чек. Вопрос пользователя проходит три фазы: «это мой заказ?», «я подтверждаю правильному получателю?», «платеж действительно завершен?». Метрика проверки — конверсия между фазами, время в `pending`, повторные attempts и обращения в поддержку.

## Flow C1 — recommended happy path: mobile deeplink

`merchant checkout -> A3Pay payment intent -> hosted checkout -> Ozon deeplink -> user confirmation -> Ozon callback -> A3Pay webhook -> merchant success`

| Step | Вопрос пользователя | Экран/событие | Проверка |
|---|---|---|---|
| 1 | Сколько и кому я плачу? | Checkout показывает мерчанта, заказ, сумму | Данные совпадают с order summary |
| 2 | Почему Ozon? | Способ `Оплатить через Ozon` с коротким пояснением | Нет обещания несуществующей скидки |
| 3 | Меня не уведут на подделку? | Hosted page A3Pay, затем trusted Ozon surface | Проверяемый домен/deeplink |
| 4 | Что именно подтвердить? | Ozon показывает получателя и сумму | Нельзя скрывать merchant name |
| 5 | Оплата прошла? | Статус `Проверяем оплату`, затем success | Только server-side confirmation |
| 6 | Где чек? | Success page + e-mail/телефон | Фискальный и order receipt не смешаны |

## Flow C2 — desktop

1. Пользователь выбирает A3Pay.
2. A3Pay показывает QR и кнопку «Отправить ссылку на телефон» как вспомогательный канал.
3. QR/deep link открывает Ozon на телефоне.
4. Desktop остается в состоянии `waiting_for_confirmation` и polling с backoff.
5. После callback экран обновляется без ручного refresh.

Критично: QR должен быть динамическим, связанным с конкретным order и TTL; статический merchant QR не подходит для гарантированного сопоставления заказа без дополнительных шагов.

## Flow C3 — приложение Ozon не установлено

| Condition | UI | Backend status | Next action |
|---|---|---|---|
| Deeplink не открылся | «Не удалось открыть Ozon» | `requires_action` | `Открыть веб-версию`, `Скопировать ссылку`, `Попробовать снова` — только если поддержано Ozon |
| Нет допустимого fallback | Честное сообщение об ограничении MVP | `failed_method_unavailable` | Вернуться к мерчанту; не предлагать фиктивный способ |
| Метод у мерчанта единственный | Заказ сохраняется на ограниченный TTL | `payment_method_unavailable` | Мерчант решает: отменить или дать внешний альтернативный канал |

## Flow C4 — пользователь не клиент Ozon Банка

Это зависит от договорной модели:

- Если Ozon Pay принимает сохраненную карту/СБП — пользователь может продолжить по доступным методам, но тогда продукт не является «только счет Ozon Банка».
- Если разрешен только счет Ozon Банка — показать eligibility до финального CTA и остановить путь без сбора лишних данных.
- Не показывать «у вас нет Ozon Банка» на основании phone lookup, если такой disclosure не разрешен договором и privacy model.

## Flow C5 — неверный телефон

Телефон допустим только для доставки ссылки.

1. Пользователь сам вводит номер и видит маскированное подтверждение `+7 9•• •••-12-34`.
2. A3Pay отправляет нейтральное сообщение без раскрытия состава заказа сверх необходимого.
3. Оплата остается привязана к secure token, а не к номеру.
4. Получатель ссылки все равно должен войти/подтвердить платеж в Ozon surface.
5. На checkout есть `Изменить номер` и rate limit.

## Flow C6 — push/link не пришел

- Отделять `request_created`, `delivery_unknown/delivered` и `payment_pending`.
- Таймер 30-60 секунд не считать отказом банка.
- Дать `Открыть Ozon`, `Показать QR`, `Отправить ссылку снова` с cooldown.
- После TTL создать новый intent, не переиспользовать истекший.
- Support получает correlation id, но пользователь видит короткий код обращения.

## Flow C7 — недостаточно средств / decline

Ozon возвращает machine-readable reason group без чувствительных деталей. A3Pay показывает:

- `Не удалось подтвердить оплату`;
- безопасный следующий шаг;
- возможность повторить с новым attempt в рамках order;
- защиту от двойной оплаты, если поздний success еще возможен.

## Flow C8 — пользователь закрыл Ozon или вернулся раньше callback

Return URL не означает success. Экран A3Pay показывает `Проверяем оплату`; backend запрашивает статус. Через согласованный timeout:

- `succeeded` -> заказ оплачен;
- `failed/canceled` -> повторить;
- `unknown/pending` -> не создавать новый charge без предупреждения; продолжить проверку/поддержку.

## Flow C9 — duplicate tap / duplicate webhook

- CTA блокируется после первого submit.
- `idempotency_key = merchant_id + order_id + attempt_no`.
- Webhook consumer идемпотентен.
- Один order может иметь несколько attempts, но не более одного captured payment без explicit overpayment handling.

## Flow C10 — возврат

1. Мерчант инициирует полный возврат.
2. Пользователь получает понятный статус `Возврат оформлен` и ожидаемый SLA.
3. A3Pay различает `refund_created`, `refund_processing`, `refund_succeeded`, `refund_failed`.
4. Формируется чек `возврат прихода`, если обязанность лежит в этом контуре.
5. Merchant order не превращается обратно в `unpaid`; у него отдельный refund state.

## State model

`created -> requires_action -> pending -> succeeded`

Ветки: `created/requires_action -> expired|canceled|failed`; `succeeded -> refund_pending -> partially_refunded|refunded|refund_failed`.

Запрещено: `return_url -> succeeded` без backend confirmation.

## Метрики поведения

- `checkout_open -> method_selected`
- `method_selected -> bank_surface_opened`
- `bank_surface_opened -> payment_confirmed`
- `payment_confirmed -> merchant_acknowledged`
- доля `unknown > SLA`
- повторные attempts на order
- support contacts на 1 000 платежей
- refund completion time

## Inputs used

`research-summary.md`, `source-log.md`, visual patterns hosted checkout/pay-by-bank, правила C2B Банка России/НСПК.
