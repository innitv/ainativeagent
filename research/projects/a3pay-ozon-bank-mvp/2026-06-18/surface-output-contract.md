# Surface Output Contract

- `surface_type`: `research_report`, `figma_board`, `handoff`
- `audience`: продуктовая, коммерческая, техническая и операционная команды A3Pay
- `scope`: MVP приема платежей внешним мерчантом через A3Pay с единственным партнерским контуром Ozon Банка
- `must_cover`: customer journey, merchant journey, payment lifecycle, error/recovery states, integration choices, economics, compliance, assumptions, experiments
- `expected_output`: 1 research pack; FigJam-ready доска из 6-8 зон; минимум 3 альтернативы MVP; одна рекомендуемая схема
- `non_goals`: юридическое заключение; обещание недокументированного Ozon API; дизайн production UI; точный коммерческий тариф без оффера партнеров
- `quality_bar`: каждый крупный вывод связан с источником или явно помечен как hypothesis/partner-dependent; все критические состояния имеют владельца и recovery action
- `verification_plan`: source audit, research lint, workflow inspect; для FigJam — node inventory и screenshot после записи

## Coverage map

| Вход | Output location | Status |
|---|---|---|
| Позиционирование A3 вне ЖКХ | `research-summary.md` | in_progress |
| Оплата покупателем через Ozon Банк | `scenario-user-flows.md` | in_progress |
| Сценарии без Ozon Банка/с неверным номером | `scenario-user-flows.md` | in_progress |
| Подключение и операции мерчанта | `merchant-workflows.md` | in_progress |
| Сравнение с СБП | `competitive-analysis.md`, `unit-economics.md` | in_progress |
| FigJam workflow | `figjam-board-spec.md` | in_progress |

