# Handoff Bundle

- `status`: completed for research + FigJam workflow board + Lazyweb-grounded Figma wireframes v4; downstream PRD/frontend stages are out of scope
- `completed`: полный research pack, customer/merchant workflows, MVP options, unit economics, visual evidence, FigJam board spec, Figma wireframes, local A3Pay MVP design system, structured Auto Layout wireframes v2, corrected v3 visual pass, Lazyweb visual review, v4 payment-surface wireframes, research lint, workflow sync/inspect
- `decisions`: старые A3Pay материалы не являются доказательством; после уточнения пользователя сценарий phone-to-push вынесен в основной MVP-путь, но остаётся partner-dependent до подтверждения API; QR/ссылка сохранены как recovery-ветки
- `assumptions`: Ozon Банк — единственный платежный партнер MVP; мерчант находится в РФ; платеж C2B; нужен online-first сценарий
- `risks`: тариф A3Pay может не быть ниже СБП; нет публичного API для phone-triggered push; merchant of record/acquirer/PSP roles пока не определены
- `open_questions`: договорная роль A3 и Ozon Банка; доступные API; KYC/KYB; 54-ФЗ; settlement; refunds; webhooks; dispute ownership
- `next_required_artifact`: PRD/API/legal workshop packet или следующий design polish pass на базе v4, если пользователь попросит переводить wireframes в полноценный дизайн
- `inputs_used`: запрос пользователя, AGENTS.md, research/README.md, текущие web/Lazyweb источники

## Figma correction note — 2026-06-18

Пользователь указал, что версия, собранная через дизайн-систему, получилась визуально хуже свободного наброска. Причина зафиксирована как visual regression: v2 доказала наличие компонентов/Auto Layout, но потеряла композицию, плотность и живой сценарный ритм. Исправление выполнено в Figma как отдельная страница `A3Pay MVP — corrected v3 / systemized`, board node `20:15`.

Рабочий статус:

- v1 flat wireframes: useful as visual/control draft, но технически неструктурны;
- v2 structured DS wireframes: `partial`, потому что структурно корректны, но визуально слабее;
- v3 corrected wireframes: текущий рабочий вариант для дальнейшей итерации.

## Lazyweb visual correction note — 2026-06-18

Пользователь попросил проверить визуальные ошибки через Lazyweb. Прямой image-compare приватного Figma-скриншота был отклонён политикой доступа, поэтому анализ выполнен безопасно: локальный screenshot + Lazyweb text-search по checkout, bank confirmation/receipt и merchant dashboard patterns.

Создан отчёт `.lazyweb/design-improve/a3pay-payment-flow-2026-06-18/report.html` и новая Figma-страница `A3Pay MVP — v4 Lazyweb grounded`, board node `26:16`.

Рабочий статус после v4:

- v3 corrected wireframes: остаётся полезной как карта логики и контрольная версия;
- v4 Lazyweb grounded wireframes: текущая актуальная визуальная версия для обсуждения MVP;
- основные исправления v4: phone-first checkout review, operational push status, Ozon Bank confirmation, receipt-style success, no-Ozon fallback, merchant create request и merchant payments dashboard.
