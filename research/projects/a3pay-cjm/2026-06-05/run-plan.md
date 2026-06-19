# Run plan: A3Pay CJM research workflow

| Поле | Значение |
|---|---|
| Project slug | `a3pay-cjm` |
| Run date | `2026-06-05` |
| Workflow type | `full product workflow / research-focused` |
| Requested output | Полноценное исследование CJM платежных сценариев для A3 Pay, выгрузка research pack в Notion, обновление Figma-доски |
| Current status | `ready` |

## Цель

Провести research stage по проектному контракту: собрать source-backed исследование платежных сценариев в России, оформить обязательный research pack, CJM, opportunity map, ICE/RICE и 12-24 month roadmap, затем подготовить человекочитаемый export для Notion и обновить существующую Figma-доску.

## Запрос

Провести полноценный workflow по исследованию A3Pay CJM согласно проектным правилам, завершить выгрузкой research pack в Notion и обновлением уже собранной Figma-доски.

## План этапов

1. Intake и recursive brief.
2. Research pack: summary, competitors, proto personas, synthetic interviews, SWOT.
3. CJM map, opportunity map, ICE/RICE и roadmap.
4. Notion export, publication plan, approval record и публикация.
5. Figma handoff, approval record, обновление доски и screenshot evidence.
6. `workflow:sync` и `workflow:validate`.

## Ограничения

- Не печатать и не сохранять secrets.
- Не смешивать этот run с unrelated dirty tree.
- Не заявлять DeepSeek/Gemini/Tavily coverage как выполненный, если provider call не прошел.
- Не завершать Notion/Figma external write без approval record.

## Inputs used

- Пользовательский файл: `C:\Users\mrfra\Desktop\A3Pay_Research_Request_Extended.md`
- Предыдущий быстрый черновик: `research/projects/a3pay-cjm/2026-06-05/source-drafts/a3pay-cjm-research.md`
- Research templates: `agent-pack/artifacts/research/*.template.md`
- Notion publication rules: `agent-pack/skills/notion-sync/SKILL.md`
- Figma handoff rules: `agent-pack/skills/figma-handoff/SKILL.md`
- Existing Figma file: `https://www.figma.com/design/AeXnwaRn8cOKNpKb4HGyOH`

## Stages

| Stage | Status | Required artifacts | Gate |
|---|---:|---|---|
| 00-intake | `completed` | `recursive-brief.md` | Brief содержит expansion/deepening/consolidation |
| 01-research | `completed` | `research-summary.md`, `competitive-analysis.md`, `proto-personas.md`, `synthetic-interviews.md`, `swot.md`, `cjm-map.md` | Source-backed evidence + provider status |
| Notion publication | `completed` | `notion-research-export-ru.md`, publication evidence | Exact target approval recorded |
| Figma update | `completed` | `figma-handoff-bundle.md`, screenshot evidence | Exact target approval recorded |
| Validation | `completed` | `run-state.json`, `run-meta.json`, `artifact-manifest.json`, `run-index.md` | `workflow:sync`, `workflow:validate` |

## Provider status

| Provider | Status | Notes |
|---|---|---|
| Tavily MCP | `used_after_retry` | Repeat validation pass returned 8 source-backed sources. |
| Web search | `used` | Used for public/source-backed evidence. |
| DeepSeek | `used` | Runtime provider call executed for contradiction review. |
| Gemini | `used` | Runtime provider call executed for second synthesis review. |

## External writes

| Action | Target | Approval state |
|---|---|---|
| `figma_write` | `figma:file:AeXnwaRn8cOKNpKb4HGyOH` | User requested Figma update in current task; record before write. |
| `notion_research_publish` | `3696473174e58006af5fd367ef89d978` | User requested Notion finalization in current task; exact approval recorded before API write. |

## Risks / Follow-up

- Не печатать secrets из `.env` в артефакты, логи или финальный ответ.
- Notion API и Figma MCP write уже выполнены; при будущих обновлениях снова нужен exact target approval.
- DeepSeek/Gemini coverage закрыт validation pass, но модельный synthesis не является source-backed evidence.
