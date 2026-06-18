# Каркас TypeScript Runtime

Эта папка содержит вспомогательный runtime для работы через Codex в IDE: локальные проверки, scaffold, persisted workflow state, validation, research/reference adapters и QA-команды.

Пользовательский сценарий проекта один: запросы выполняются через Codex внутри IDE/чата. Runtime не является отдельным способом работы.

## Основные файлы

- `workflow.manifest.ts` — единый source of truth для stage ids, route steps, владельцев, артефактов, профилей и route→stage mapping; человекочитаемая матрица этого контракта живет в `agent-pack/workflows/stage-handoff-contract.md`.
- `workflow-stages.ts`, `route.config.ts` — compatibility facades для существующих imports.
- `workflow-state.ts` — persisted `run-state.json` и `stage-results/*.json`.
- `output-metadata.ts` — `run-meta.json`, `artifact-manifest.json`, `run-index.md` и listing индекса запусков в `outputs`.
- `workflow-engine.ts` — start/resume/status/run-stage для persisted workflow.
- `workflow-stage-executors.ts` — тонкий dispatcher между research, local и approval-gated agentic executor.
- `executors/` — реализации stage execution: `research-executor.ts`, `local-executor.ts`, `agentic-executor.ts`, Notion export helper и общие executor utilities.
- `agent-output/` — parser/normalizer structured specialist output, JSON Schema validation по `agent-pack/schemas/agent-output.schema.json` и Markdown artifact fallback.
- `agent-capability-registry.ts` — executable Agent Capability Registry: role, stages, route tools, inputs/outputs, approval actions, skills и external-write behavior для каждого агента.
- `agent-contracts/` — executable Delegation Packet Validator и Agent Output Critic для agentic handoff/output gates.
- `workflow-cli.ts` — command dispatch, intent parsing, approval commands и agentic preflight/readiness formatting.
- `run-workflow-engine.ts` — тонкий CLI entrypoint и compatibility exports для тестов/скриптов.
- `agentic-rollout.ts`, `agentic-approval-targets.ts` — staged rollout agentic stages и стабильные approval targets для model provider calls.
- `run-local-workflow.ts` — deterministic local artifact generator.
- `run-landing-workflow.ts` — scaffold workflow-папки.
- `research-stage-runner.ts` — artifact-driven research stage runner для `research-summary.md`, `scenario-user-flows.md`, `competitive-analysis.md`, `proto-personas.md`, `synthetic-interviews.md`, `swot.md`; перед provider calls собирает контекст из всех доступных файлов run directory (`.md`, `.json`, `.yaml`, `.yml`, `.txt`), использует его для synthesis/rendering и фиксирует реальные `inputs_used`.
- `reference-scan.ts`, `visual-diff.ts`, `visual-section-diff.ts`, `visual-reference-review.ts` — visual reference и screenshot QA.
- `approval-gate.ts` — локальный helper approval records для внешних записей.
- `doctor.ts` — диагностика структуры проекта, шаблонов и optional provider keys.
- `context-truncator.ts` — State Truncation Gate для поздних стадий.
- `agent-metadata.ts` — парсинг и semantic validation YAML frontmatter в `agent-pack/agents/*.agent.md`, включая сверку artifact inputs/outputs с `routeTools`.
- `agents.registry.ts`, `agents.sdk.ts`, `route.config.ts` — регистрация агентов и маршрутов для инспекции/совместимости.

## Runtime Contract

- Codex остаётся главным исполнителем и оркестратором в IDE.
- Runtime помогает сохранять артефакты, проверять структуру, вести state и запускать локальные проверки.
- Каждый persisted run синхронизирует `run-meta.json`, `artifact-manifest.json` и `run-index.md`; `outputs/registry.json` остаётся навигационным индексом, а не source of truth.
- `workflow:validate` считает missing `run-meta.json`/`artifact-manifest.json`/`run-index.md` ошибкой для полного persisted run и warning для промежуточного `--through`.
- Все внешние записи проходят через approval gate.
- Agentic model-provider calls проходят через target-scoped approval gate и включаются только для staged rollout stages.
- Отсутствующие optional provider keys считаются предупреждением, а не ошибкой проекта.
- Outputs валидируются по JSON Schema или required Markdown sections перед передачей следующему этапу.
- Перед model-provider specialist call runtime строит Delegation Packet, проверяет stage id, owner, objective, inputs, allowed outputs, forbidden actions, approval state, quality gate и expected envelope; invalid packet блокирует stage до вызова специалиста.
- После specialist response Agent Output Critic проверяет structured envelope, agent_name, `inputs_used`, обязательные artifact outputs и статусные условия; blockers понижают stage до `partial`.
- Research runner обязан использовать весь текущий run ledger как вход: `run-plan.md`, `recursive-brief.md`, `handoff-bundle.md`, `stage-gate-ledger.md`, прошлые research/export/CJM artifacts и `stage-results/*.json`, если они есть. Provider output дополняет этот контекст, но не заменяет его.
- Research rendering проходит candidate quality/write gate: слабый или generic candidate не должен молча затирать более полный artifact; решение о записи фиксируется в handoff и ledger.
- Agentic specialist output должен содержать structured envelope и Markdown для обязательного artifact в `outputs.<artifact_name>` или `outputs.<file_name>`; иначе stage понижается до `partial`.
- Agent instruction frontmatter валидируется как machine-readable contract; artifact inputs/outputs должны совпадать с `routeTools` и stage contract, а перед передачей в Agents SDK frontmatter удаляется из prompt body.
- Agent Capability Registry собирается из metadata, route tools и stage definitions; `agents.sdk.ts` использует его descriptions для tool handoff descriptions.
- Sensitive inputs/outputs не сохраняются в traces для production-like запусков.

## Команды

```bash
yarn validate:config
yarn typecheck
yarn agents:inspect
yarn landing:run "<landing workflow goal>"
yarn workflow:run-local "<landing workflow goal>"
yarn workflow:start "<landing workflow goal>"
yarn workflow:start "<workflow goal>" --mode agentic
yarn workflow:start "<reference workflow goal>" --profile reference
yarn workflow:resume outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:status outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:list
yarn workflow:inspect outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:outputs outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:skills
yarn workflow:cleanup-temp
yarn workflow:cleanup-temp --force
yarn workflow:archive outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:archive outputs/<project-slug>/<YYYY-MM-DD> --force
yarn workflow:run-stage outputs/<project-slug>/<YYYY-MM-DD> 01-research --force
yarn workflow:agentic-stages
yarn workflow:test-agent-capabilities
yarn workflow:test-agent-contracts
yarn workflow:agentic-preflight outputs/<project-slug>/<YYYY-MM-DD> --strict
yarn workflow:agentic-approval-commands outputs/<project-slug>/<YYYY-MM-DD> --by human --missing-only
yarn workflow:agentic-readiness outputs/<project-slug>/<YYYY-MM-DD> --strict
yarn workflow:approval-request outputs/<project-slug>/<YYYY-MM-DD> notion_research_publish --target <notion-parent-page-id> --by human --reason "Публикация research pack в Notion"
yarn workflow:approve outputs/<project-slug>/<YYYY-MM-DD> notion_research_publish --target <notion-parent-page-id> --by human
yarn workflow:deny outputs/<project-slug>/<YYYY-MM-DD> notion_research_publish --target <notion-parent-page-id> --by human
yarn workflow:approvals outputs/<project-slug>/<YYYY-MM-DD>
yarn workflow:validate outputs/<project-slug>/<YYYY-MM-DD> --profile standard
yarn workflow:validate outputs/<project-slug>/<YYYY-MM-DD> --profile reference
yarn workflow:doctor
yarn research:run outputs/<project-slug>/<YYYY-MM-DD> ["research query"]
yarn reference:scan "<reference url>" [slug]
yarn reference:diff reports/visual-review/<reference-slug> reports/visual-review/<local-slug> [output-dir]
yarn reference:section-diff "<reference url>" "<local url>" [output-dir]
yarn reference:review reports/visual-review/<slug> [local-url] [output-path] [--local-dir reports/visual-review/<local-slug>]
```

`workflow:validate` поддерживает профили `standard`, `reference` и `auto`. Standard workflow не требует `visual-reference-review.md`; reference workflow требует его строго.
