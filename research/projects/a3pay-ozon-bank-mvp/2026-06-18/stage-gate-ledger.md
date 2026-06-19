# Stage Gate Ledger

| Stage | Status | Required artifacts | Gate notes |
|---|---|---|---|
| 00-intake | completed | run plan, surface contract | Тип работы и границы зафиксированы |
| 01-research | completed | research pack, source log | Публичные возможности и assumptions разделены |
| visual evidence | completed | visual plan, reference cards | Lazyweb + official web evidence зафиксированы |
| FigJam write | completed | board spec, exact target, approval | File `HmmnIhGc21qxh24twdJ7yq` создан, наполнен и проверен через inventory/screenshot; добавлена отдельная схема `MVP A: телефон → push в Ozon Банк` |
| Figma wireframes | completed | wireframes result, metadata, screenshot | File `BrobznrRK7IUMCf1FJg4Ln` создан; телефонный MVP-путь вынесен в основной сценарий; QR/ссылка сохранены как recovery |
| Copywriter pass | completed | copy-deck, Figma text update | Draft copy применён к Figma wireframes; телефонный MVP-сценарий усилен; API Ozon оставлен как later validation, без блокировки драфта |
| Figma structured v2 | partial | figma-design-system-result, component/style inventory, screenshots | Создана локальная A3Pay MVP design system: 26 variables, 8 text styles, 4 component sets, 1 row component; structured v2 содержит 12 Auto Layout screens и 41 component instance, но после review пользователя признана visual regression: структурно корректна, визуально слабее v1 |
| Figma corrected v3 | completed | corrected v3 board, local components, metadata, screenshot | Создана страница `A3Pay MVP — corrected v3 / systemized`, board `20:15`; 5 локальных компонентов, 75 Auto Layout frames, 9 screen frames; recovery clipping исправлен; screenshot verification выполнен |
| Lazyweb visual correction v4 | completed | lazyweb report, v4 board, screenshot evidence | Создан отчёт `.lazyweb/design-improve/a3pay-payment-flow-2026-06-18/report.html`; создана Figma-страница `A3Pay MVP — v4 Lazyweb grounded`, board `26:16`; v4 пересобрана как payment surfaces: 5 mobile screens и 2 merchant desktop screens; screenshot verification выполнен |
| validation | completed | lint, sync, inspect | `research:lint` pass; metadata present |
