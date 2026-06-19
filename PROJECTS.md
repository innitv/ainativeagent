# Карта актуальных проектов

Актуально на 2026-06-20. Этот файл отвечает на вопрос «где лежит рабочий результат», а не описывает runtime-процедуры.

## Продуктовые поверхности

| Поверхность | Source of truth | Route | Проверка |
| --- | --- | --- | --- |
| A3Pay Demo, клиент | `apps/frontend/src/views/a3pay-demo/` | `/`, `/a3pay-demo/pay/pay_91A0EF` | `tests/playwright/a3pay-demo.spec.ts` |
| A3Pay Demo, мерчант | `apps/frontend/src/views/a3pay-demo/` | `/a3pay-demo/merchant/orders/pay_91A0EF` | `tests/playwright/a3pay-demo.spec.ts` |
| Сайт-портфолио | `siteportfolio/src/` | `/portfolio` | ledger и evidence в `siteportfolio/runs/2026-06-14/` |

`apps/frontend/src/App.tsx` является только маршрутизатором этих поверхностей и design-system playground `/components`.

## Исследования

Все сохраняемые исследования находятся в `research/projects/`. Навигационный список поддерживается в `research/registry.json`; первый файл конкретного run — `run-index.md`.

## Инфраструктура, а не отдельные проекты

- `agent-pack/` — инструкции, специалисты, workflow и шаблоны.
- `runtime/` — исполняемый workflow runtime.
- `design/figma/a3-design-system/` — долгоживущая карта design system, используемая research/design процессом.
- `apps/frontend/src/components/` и `/components` — design-system playground.
- `tooling/`, `integrations/`, `tests/` — инструменты и проверки.

## Временные зоны

- `outputs/temp/`, `dist/`, `test-results/`, `reports/logs/` не являются source of truth.
- `outputs/products/` — пустая legacy/archive-зона, не место для новых проектов.
- После QA generated build, screenshots, traces и логи можно удалять; обязательные evidence остаются только внутри ledger соответствующего продукта или исследования.

## Ветки

- `main` — базовая ветка репозитория.
- `codex/a3pay-demo-mvp` — актуальная ветка A3Pay и текущей очистки.

После финальной проверки эту ветку следует слить в `main`, а затем удалить feature-ветку локально и на remote, чтобы снова осталась одна рабочая линия.
