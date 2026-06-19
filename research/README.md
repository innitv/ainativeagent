# Research

`research/` — отдельный каталог для исследовательских запусков, CJM, market research, Notion-ready research exports и связанных evidence.

Этот каталог отделен от `outputs/`, чтобы продуктовые прототипы, временные workflow-запуски и исследовательские артефакты не смешивались.

## Структура

```text
research/
  README.md
  registry.json
  projects/
    <research-slug>/
      <YYYY-MM-DD>/
        run-index.md
        run-state.json
        run-meta.json
        artifact-manifest.json
        research-summary.md
        competitive-analysis.md
        scenario-user-flows.md
        source-log.md
        notion-research-export-ru.md
        ...
  archive/
    <research-slug>/
  temp/
    <scratch-or-smoke-run>/
```

## Что куда класть

| Зона | Назначение |
|---|---|
| `projects/` | Активные или полезные research/CJM/market-research runs. |
| `archive/` | Старые research runs, которые больше не являются рабочим контекстом. |
| `temp/` | Временные research-проверки, черновики, smoke runs. |

## Текущие проекты

- `projects/a3pay-cjm/`
- `projects/a3pay-cjm-new/`
- `projects/a3pay-ozon-bank-mvp/`
- `projects/crm-russia-payments/`
- `projects/real-estate-payments-russia-company-workflows-market-research/`

## Правила работы

- Для research-задач сначала искать здесь, а не в `outputs/`.
- `run-index.md` остается первым файлом для человека внутри конкретного запуска.
- `run-meta.json`, `run-state.json` и `artifact-manifest.json` остаются machine-readable ledger.
- Исторические записи в `stage-gate-ledger.md`, publication records и release notes можно не переписывать после переноса, если они фиксируют команды или пути, которые реально использовались в момент запуска.
- Новые research runs по умолчанию создавать в `research/projects/<research-slug>/<YYYY-MM-DD>/`, если пользователь явно не просит временный запуск.
- `outputs/` больше не использовать как место хранения исследований; он остается для runtime/temp/legacy output-зоны.
