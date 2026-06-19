# Recursive brief: A3Pay CJM

## Inputs Used

- User request in current chat.
- `C:\Users\mrfra\Desktop\A3Pay_Research_Request_Extended.md`
- `research/projects/a3pay-cjm/2026-06-05/source-drafts/a3pay-cjm-research.md`

## Expansion

Нужно исследовать A3 Pay как платежный продукт, который позволяет платить за товары и услуги по номеру телефона и объединяет несколько платежных методов в один пользовательский сценарий. Запрос не ограничен одним checkout: пользователь просит карту CJM по ключевым сценариям жизни и потребления в России, места встраивания A3 Pay, карту возможностей, backlog, ICE/RICE и стратегию на 12-24 месяца.

Обязательные сценарии:

- покупка, владение и обслуживание недвижимости;
- покупка, импорт и владение автомобилем;
- путешествия;
- государственные и коммунальные платежи;
- повседневные покупки;
- подписки и регулярные платежи.

## Deepening

Исследование должно ответить на вопросы:

- какие платежные методы уже привычны пользователям и где возникает фрагментация;
- где платеж по номеру телефона снижает friction сильнее всего;
- какие сценарии требуют не просто платежа, а оркестрации нескольких платежных rails;
- где нужны trust, escrow, split payment, recurring mandate, reminder, installment или подтверждение статуса;
- какие участники влияют на conversion: банки, merchant, marketplace, госреестр, поставщик услуги, оператор платежей, страховая, брокер, travel-provider;
- какие барьеры связаны с реквизитами, лимитами, ошибками начислений, непонятным статусом, возвратами и безопасностью.

## Consolidation

Definition of Done для research stage:

- создан обязательный research pack: `research-summary.md`, `competitive-analysis.md`, `proto-personas.md`, `synthetic-interviews.md`, `swot.md`;
- создан `cjm-map.md` с journey maps по всем шести сценариям;
- выводы отделяют source-backed facts от hypotheses;
- каждый artifact содержит `inputs_used`;
- подготовлен `notion-research-export-ru.md` без raw workflow dump;
- подготовлен `figma-handoff-bundle.md` и обновлена существующая Figma-доска при доступном write;
- `handoff-bundle.md` и `stage-gate-ledger.md` обновлены;
- runtime metadata синхронизированы через `workflow:sync`, validation выполнена или blocker записан.

## Assumptions

- A3 Pay использует номер телефона как payment identity and request-to-pay entry point.
- Текущий run ограничен research/CJM/Notion/Figma, без запуска PRD/frontend/release stages.

## Open Questions

- Нужно ли запускать следующий workflow slice: PRD, IA, design brief, prototype, frontend и QA?
- Какие partner channels A3 считает первичными: banks, merchants, Госуслуги/ЖКХ, travel, auto brokers?
