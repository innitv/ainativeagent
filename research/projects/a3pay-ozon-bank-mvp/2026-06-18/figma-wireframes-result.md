# Figma wireframes result

- `status`: completed
- `surface_type`: `figma_design`
- `file`: [A3Pay × Ozon Банк — MVP wireframes](https://www.figma.com/design/BrobznrRK7IUMCf1FJg4Ln)
- `file_key`: `BrobznrRK7IUMCf1FJg4Ln`
- `wrapper_node_id`: `2:2`
- `screenshot_check`: `https://www.figma.com/api/mcp/asset/9d6eb362-5e49-4374-9193-22177dea431f`
- `created_at`: `2026-06-18`

## Что сделано

Создан low-fi набор wireframes для MVP A3Pay × Ozon Банк. После уточнения пользователя телефонный сценарий вынесен в основной путь MVP, а QR/ссылка/hosted checkout оставлены как recovery-ветки и страховка на случай, если push не пришёл, номер неверный или у пользователя нет привязанного Ozon Банка.

## Состав экранов

| № | Frame | Назначение |
|---|---|---|
| 01 | `Customer / Merchant checkout — choose A3Pay` | Выбор A3Pay на стороне витрины мерчанта |
| 02 | `Customer / Phone entry — primary MVP` | Основной MVP-шаг: ввод телефона для запроса оплаты |
| 03 | `Customer / Confirm masked phone` | Подтверждение маскированного номера перед отправкой запроса |
| 04 | `Customer / Waiting for push` | Ожидание push/перехода в Ozon, с QR/ссылкой как fallback |
| 05 | `Ozon mock / Confirm payment` | Условный экран подтверждения в Ozon Банке |
| 06 | `Customer / Success and receipt` | Успех, чек, возврат к мерчанту |
| 07 | `Customer / Recovery: no push or wrong phone` | Нет push, неверный номер, номер не связан с Ozon |
| 08 | `Customer / Pending late status` | Задержка финального статуса и защита от дублей |
| 09 | `Desktop checkout / QR plus phone fallback` | Desktop/web сценарий: QR + телефон как быстрый путь |
| 10 | `Merchant / Create payment request` | Создание платежа мерчантом, `phone_mode` и состав данных |
| 11 | `Merchant / Payments dashboard statuses` | Операционный список платежей и статусы |
| 12 | `Merchant / Payment detail and refund` | Карточка платежа, timeline событий, возврат и повтор webhook |

## Ключевое продуктовое решение

В wireframes зафиксированы две ветки, но с разным приоритетом:

- `MVP A`: телефон → запрос оплаты → push/открытие Ozon → подтверждение → webhook → success.
- `Fallback`: QR/ссылка/другой способ оплаты, если телефонный путь не сработал.

Такой вариант позволяет не спорить с MVP-гипотезой компании про номер телефона, но защищает конверсию и поддержку от сценариев, где push-доставка или проверка номера не подтверждаются провайдером.

## Проверка

- Figma metadata подтвердила wrapper `2:2` и 12 отдельных frame-экранов.
- Screenshot создан через Figma MCP для wrapper `2:2`.
- Russian Publication Gate: видимый UX-copy на русском; технические статусы/API термины оставлены в английском как системные идентификаторы.

## Update 2026-06-18 — copywriter pass

- `copy_deck`: `copy-deck.md`
- `figma_update`: применён draft copywriter pass к 84 текстовым слоям Figma wireframes.
- `scope`: структура и layout экранов не менялись; обновлены заголовки, helper text, CTA, recovery-сообщения, merchant/admin microcopy.
- `claim_safety`: удалено видимое утверждение `комиссия ниже`; заменено на `тариф пилота` / `требует подтверждения`.
- `mobile_fit_fix`: H1 экрана ввода телефона сокращён до `Куда отправить запрос?`, чтобы не конфликтовать с subtitle.

Основные правила copywriter pass: телефон — главный MVP-сценарий; QR/ссылка — recovery; макеты проверяют понятность пути, а не финальный API-контракт Ozon. Осторожные формулировки сохранены только там, где они защищают UX от ложных причин ошибки.

## Update 2026-06-18 — structured Figma v2

- `surface_mode`: `figma_wireframe`
- `design_system_result`: `figma-design-system-result.md`
- `design_system_page`: `A3Pay DS — MVP wireframes`
- `structured_screens_page`: `MVP wireframes — structured v2`
- `scope`: старая flat-версия сохранена как черновик; рядом создана structured v2 версия с локальной дизайн-системой.

После уточнения правила для wireframes создан локальный A3Pay MVP wireframe kit: 26 variables, 8 text styles, 1 effect style, 4 component sets и 1 reusable merchant row component. Экраны пересобраны как Auto Layout wireframes: 12 экранов, 12 Auto Layout screen frames, 39 Auto Layout frames и 41 component instance.

Это закрывает прежний deviation: v1 был полезен как продуктовая схема, но не был корректным Figma-артефактом. v2 остаётся low-fi, но теперь собран структурно: components/styles/tokens/instances + screenshot/object inventory verification.

## Update 2026-06-18 — corrected v3 after visual regression

- `surface_mode`: `figma_wireframe`
- `figma_page`: `A3Pay MVP — corrected v3 / systemized`
- `board_node_id`: `20:15`
- `component_shelf_node_id`: `20:3`
- `screenshot_check`: `https://www.figma.com/api/mcp/asset/ee783ca4-ed21-4388-b487-e174b37464ee`
- `status`: corrected after design-system visual regression

После review пользователя зафиксирована ошибка v2: дизайн-система была применена как технический слой ради components/tokens, но не сохранила живую композицию первого наброска. v3 исправляет порядок работы: сначала сценарий и визуальная иерархия, затем локальные компоненты и Auto Layout.

Что изменено в v3:

- создана отдельная Figma-страница `A3Pay MVP — corrected v3 / systemized`, старые версии сохранены как control;
- основной клиентский flow собран слева направо: выбор A3Pay → ввод телефона → проверка номера → ожидание push → подтверждение в банке → success;
- телефонный MVP-шаг визуально вынесен в главный сценарий, QR/ссылка оставлены как fallback, а не как конкурирующий primary path;
- добавлена recovery-ветка `Push не пришёл` с действиями `Изменить номер` и `Показать QR / ссылку`;
- merchant-side вынесен в отдельные desktop-экраны: `create payment_intent` и `statuses dashboard`;
- создан локальный corrected component shelf: `A3/Button/Primary`, `A3/Button/Secondary`, `A3/Input/Phone`, `A3/Card/Info`, `A3/Chip/Status`;
- verification после записи: 5 локальных компонентов, 75 Auto Layout frames, 9 screen frames, screenshot review, исправлено обрезание recovery-экрана во втором ряду.

Статус v2 понижен до `partial`: структурно она была полезна, но визуально проигрывала v1. Рабочим вариантом для дальнейшей итерации считается v3.

## Update 2026-06-18 — Lazyweb-grounded v4 visual correction

- `surface_mode`: `figma_wireframe`
- `figma_page`: `A3Pay MVP — v4 Lazyweb grounded`
- `board_node_id`: `26:16`
- `component_shelf_node_id`: `26:3`
- `lazyweb_report`: `.lazyweb/design-improve/a3pay-payment-flow-2026-06-18/report.html`
- `screenshot_check`: `https://www.figma.com/api/mcp/asset/04b16e4b-946a-48b9-8b5e-060db8e3d080`
- `local_screenshot_evidence`: `.lazyweb/design-improve/a3pay-payment-flow-2026-06-18/references/figma-v4-final.png`
- `status`: completed after Lazyweb visual review

После Lazyweb-разбора создана отдельная v4-страница. Прежняя v3 сохранена как карта логики, но текущей визуальной версией для обсуждения MVP считается v4.

Что изменено в v4:

- клиентский flow сокращён до 5 более крупных mobile surfaces: `checkout review + phone`, `push request status`, `Ozon Bank confirmation`, `paid receipt`, `no Ozon Bank fallback`;
- телефонный MVP-сценарий остался главным: ввод телефона находится внутри платёжного review-шага вместе с суммой, мерчантом, заказом и CTA;
- экран ожидания push пересобран как operational status: запрос создан, push отправлен, ожидание подтверждения, TTL и recovery actions;
- экран Ozon Bank пересобран как банковское подтверждение: крупная сумма, источник списания, получатель, ID операции, комиссия и primary confirmation action;
- success пересобран как receipt, а не декоративный success-state: сумма, дата/время, способ оплаты, ID операции, чек и возврат в магазин;
- merchant-side пересобран в 2 desktop surfaces: создание платёжного запроса и реестр платежей с KPI, фильтрами, таблицей, статусами и row actions;
- добавлен блок `Evidence → решение → место в макете`, чтобы было видно, как Lazyweb-референсы повлияли на Figma-результат.

Lazyweb image-compare по приватному Figma-скриншоту был отклонён политикой доступа, поэтому анализ выполнен безопасно: текущий скрин сохранён локально, а Lazyweb использован через текстовый поиск реальных checkout, bank confirmation и merchant dashboard паттернов. Использованные визуальные ориентиры: Walmart/Farfetch/Best Buy для checkout-плотности, Discover/Capital One/Chime для confirmation/receipt, Yardbook/Stripe/Hokodo для merchant dashboard density.

## Риски и next step

- Для текущего MVP-драфта не требуется фиксировать финальный API Ozon. Достаточно проверить сценарий с пользователями/мерчантами: понятен ли ввод телефона, ожидание push, recovery и финальный статус.
- Перед техническим PRD всё равно нужно отдельно уточнить: какие статусы возвращает платёжный слой, как отличать неверный номер от недоставленного push и когда можно безопасно показывать success.
