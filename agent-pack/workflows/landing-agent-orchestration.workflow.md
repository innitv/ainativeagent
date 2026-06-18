# Рабочий процесс оркестрации лендинга субагентами

## Цель

Превратить один продуктовый запрос пользователя в проверенный пакет артефактов и, если разрешено пропускными воротами (gates), в готовую реализацию фронтенда.

## Оркестрация в стиле менеджера (Manager-Style)

- `orchestrator` владеет диалогом с пользователем, маршрутизацией, контролем пропускных ворот и финальным ответом.
- Специалисты — это ограниченные возможности (capabilities), которые обычно вызываются как инструменты (tools).
- Передача управления (handoff) допускается только тогда, когда специалист должен владеть отдельной веткой работы.
- Финальный ответ собирает только `orchestrator`, а не специалист.
- Любой переход между агентами оформляется как delegation packet: stage id, цель, входы, разрешенные outputs, запреты, approval state, quality gate и следующий потребитель результата.
- Оркестратор отвечает за консенсус и разрешение противоречий между research, PRD, IA, design, frontend и QA; специалист не может молча изменить scope или продуктовую трактовку.

## Граф этапов (Stage Graph)

```text
00-intake (Вводные данные)
  -> 01-research (Исследование)
  -> 02-prd (Продуктовые требования)
  -> 03-ia (Информационная архитектура)
  -> 04-design (Дизайн-бриф)
  -> 05-copy (Копирайтинг)
  -> 06-screens (Экраны)
  -> 07-prototype (Прототип)
  -> 08-frontend (Фронтенд)
  -> 09-visual-reference-review (Сверка с визуальным референсом, если задан референс)
  -> 10-test-bench (Тест-бенч)
  -> 11-qa (QA-ревью)
  -> 12-release (Релиз)
```

Опционально:

```text
02-prd -> notion-prd-export.md (Плоская публикация PRD)
```

Экспорт интерактивной Agile-доски и пользовательских историй в Notion:
На этапе `12-release`, если в окружении, файле `.env` или scaffold-файлах обнаружены `NOTION_TOKEN` и родительский ID/URL страницы, движок может подготовить plan/dry-run интерактивной Agile-доски. Внешняя запись выполняется только после exact human approval и создает базы данных Персон и связанных с ними через Relation Пользовательских историй с чек-листами Acceptance Criteria.

Публикация в Notion — это внешняя запись, которая требует целевой страницы/базы данных и явного подтверждения человека (human approval).

## Возможности (Capabilities)

Executable source of truth для capability matrix: `runtime/typescript/agent-capability-registry.ts`. Таблица ниже остается человекочитаемой шпаргалкой; при изменении агента или маршрута сначала обновляй runtime registry/metadata и запускай `yarn workflow:test-agent-capabilities`.

| Этап | Агент | Обязательные артефакты |
|---|---|---|
| 00-intake | orchestrator | `run-plan.md`, `handoff-bundle.md`, `stage-gate-ledger.md`, `recursive-brief.md` |
| 01-research | research | `research-summary.md`, `scenario-user-flows.md`, `competitive-analysis.md`, `proto-personas.md`, `synthetic-interviews.md`, `swot.md` |
| 02-prd | prd | `prd.md` |
| 03-ia | ia | `ia-brief.md` |
| 04-design | design | `design-brief.md`; плюс `reference-analysis.md` только для профиля референса |
| 05-copy | copywriting | `copy-deck.md` |
| 06-screens | design-generator | `screens.md` |
| 07-prototype | prototype | `prototype-report.md` |
| 08-frontend | frontend | `frontend-result.md` |
| 09-visual-reference-review | qa-review | `visual-reference-review.md` только для профиля референса |
| 10-test-bench | test-bench | `test-bench-result.md` |
| 11-qa | qa-review | `qa-report.md` |
| 12-release | release | `release-notes.md` |

## Правила параллельного выполнения

`orchestrator` может запускать специалистов параллельно только тогда, когда их входные данные уже готовы и их области записи не конфликтуют.

Разрешенный параллелизм:

- Тест-бенч может стартовать после `recursive-brief.md` как сопутствующая работа, но финальный `test-bench-result.md` обязан обновиться после завершения PRD, IA, прототипа, фронтенда и сверки с референсом.
- Работа над исследованием может разделяться параллельно на поиск источников, конкурентный анализ, составление персон, синтетические интервью и SWOT, но этап исследования не считается завершенным, пока не созданы все обязательные артефакты исследования.
- IA и раннее исследование дизайна могут готовиться параллельно только после готовности PRD и результатов исследования, но последующие этапы `screens`, `prototype` и `frontend` должны использовать финальные переданные артефакты.

Запрещенный параллелизм:

- Фронтенд не может начаться до завершения этапов PRD, IA, дизайна, копирайта, экранов и прототипа, за исключением явного режима быстрого наброска (`quick draft`).
- `quick draft` допустим только по явному запросу пользователя, обязан фиксировать skipped/partial upstream artifacts и не может завершаться как финальный `success`. Для reference-driven задач режим `quick draft` запрещен.
- QA не может начаться до завершения фронтенда, сверки с референсом (если применимо) и финального тест-бенча.
- Релиз не может начаться, пока QA не пройдет успешно или не зафиксирует блокировку.
- Специалисты не формируют финальный ответ пользователю; `orchestrator` обобщает статус.

## Delegation Packet (Контракт передачи специалисту)

Перед запуском stage Оркестратор фиксирует в `handoff-bundle.md` или stage notes:

| Поле | Смысл |
|---|---|
| `stage_id` | Какой этап выполняется |
| `owner_agent` | Какой специалист владеет результатом |
| `objective` | Один проверяемый результат stage |
| `required_inputs` | Конкретные артефакты и секции, которые нужно прочитать |
| `allowed_outputs` | Какие файлы можно создать или обновить |
| `forbidden_actions` | Что нельзя делать без approval или отдельного stage |
| `quality_gate` | Какие проверки должны пройти перед handoff |
| `expected_envelope` | Какой `outputs.<artifact_name>` обязан вернуть специалист |
| `handoff_consumer` | Какой следующий агент использует результат |

Если delegation packet неполный, stage не должен стартовать.

## Consensus & Conflict Pass

Если результаты специалистов, источники или пользовательские вводные конфликтуют, Оркестратор обязан:

1. Зафиксировать конфликт в `stage-gate-ledger.md`.
2. Определить владельца решения: research, PRD, IA, design, frontend, QA или пользователь.
3. Выбрать решение по иерархии: project rules -> approval gates -> source-backed evidence -> user constraints -> quality gates -> downstream impact -> expert synthesis.
4. Записать rejected alternatives и причину отказа.
5. Пометить downstream artifacts как invalid/needs update, если конфликт меняет scope, claims, user flow или visual direction.

## Контроль во время выполнения (Runtime Enforcement)

- Источник определений этапов: `runtime/typescript/workflow-stages.ts`.
- Частичная валидация: `yarn workflow:validate outputs/<project-slug>/<YYYY-MM-DD> --through <stage-id>`.
- Полная валидация стандартного профиля: `yarn workflow:validate outputs/<project-slug>/<YYYY-MM-DD> --profile standard`.
- Полная валидация профиля референса: `yarn workflow:validate outputs/<project-slug>/<YYYY-MM-DD> --profile reference`.
- Ошибки блокируют завершение последующих этапов.
- Предупреждения (warnings) должны переноситься в риски/TODO.

## Исследовательская блокировка (Research Lock)

PRD и последующие этапы заблокированы, пока результаты исследования не будут включать JTBD, персон (proto personas), симулированные интервью (simulated interviews), конкурентный анализ, SWOT, статус источников/доказательств и план валидации.

## Блокировка фронтенда (Frontend Lock)

Фронтенд заблокирован до тех пор, пока артефакты PRD, IA, дизайна, копирайта, экранов и прототипа не будут полностью готовы, за исключением режима быстрого наброска (`quick draft`), который должен быть явно запрошен и отмечен как draft/partial.

## Блокировка референса (Visual Reference Lock)

Если пользователь предоставляет визуальный референс или просит соответствовать сайту, сверка с визуальным референсом блокируется до создания фронтенда и должна завершиться до финализации тест-бенча, QA и релиза.

## Обработка ошибок (Failure Handling)

- `partial`: продолжение работы возможно только тогда, когда риски явно зафиксированы, а последующие утверждения сохраняют пометку `needs validation` (требует валидации).
- `blocked`: остановка работы и запрос недостающих данных, подтверждения или источника.
- `qa fail`: возврат к соответствующему этапу с последующим повторным запуском валидации.
- `upstream change`: если пользователь меняет вводные после PRD/IA/design, Оркестратор запускает re-orchestration loop: affected artifacts, downstream invalidation, reusable artifacts, required rerun stages.
- `specialist drift`: если специалист добавил неподтвержденный scope, claims или visual direction, результат возвращается на stage review и не передается downstream как `success`.
