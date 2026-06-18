# Контракт выходных данных агента (Agent Output Contract)

Каждый специалист (specialist) возвращает структурированный результат в следующем формате.

Контракт используется как дисциплина результата: агент должен явно фиксировать inputs, outputs, assumptions, risks, open questions и next step.

Если результат передается через runtime parser, предпочтительный формат — fenced block `agent-output-yaml` или `agent-output-json`. Допустимы также `artifact-json` и YAML frontmatter.

```yaml
agent_name: <имя_агента>
status: success|partial|blocked
summary: <краткое_описание_выполненной_работы>
inputs_used:
  - <использованные_входные_артефакты>
skills_used:
  - <skill-id из agent metadata, если применялся>
outputs:
  <имя_артефакта>: <содержимое_или_метаданные>
surface_output:
  surface_type: <тип_поверхности_или_not_applicable>
  scope_contract: <краткое_описание_scope_или_ссылка_на_surface-output-contract>
  coverage_gate:
    - input: <artifact/section>
      output_location: <page/frame/screen/component/section>
      status: covered|partial|skipped
  evidence_to_output_map:
    - evidence_source: <source/artifact/reference>
      decision: <продуктовое_или_дизайн_решение>
      output_location: <где_это_реализовано>
      status: applied|rejected|deferred
  verification:
    - check: <metadata/screenshot/build/test/object_inventory>
      result: pass|partial|fail|blocked
assumptions:
  - <допущения>
risks:
  - <риски>
open_questions:
  - <открытые_вопросы>
recommended_next_step: <рекомендуемый_следующий_шаг>
```

Правила:

- `inputs_used` обязан ссылаться на файлы из каталога `outputs/<project-slug>/<YYYY-MM-DD>/`.
- `skills_used` опционален, но если stage применял skill из agent frontmatter, укажи его id из `agent-pack/skills/*/SKILL.md`.
- `outputs` обязан содержать созданный артефакт текущего этапа (stage) по artifact name из `runtime/typescript/route.config.ts` или по file name из `runtime/typescript/workflow-stages.ts`.
- `surface_output` обязателен для `figma_board`, `product_ui`, `dashboard_console`, `landing`, `prototype`, `frontend`, `notion_wiki`, `research_report`, `presentation` и `handoff` outputs. Для неприменимых инженерных задач укажи `surface_type: not_applicable` и причину в `scope_contract`.
- `coverage_gate` должен показывать, какие ключевые входные артефакты/разделы попали в результат. Если есть `partial` или `skipped` по важному входу, `status: success` запрещен без waiver/deviation record.
- `evidence_to_output_map` должен связывать evidence с конкретным решением и местом в output. Простое перечисление источников в `inputs_used` не считается применением evidence.
- `verification` должен содержать реальную проверку результата: metadata/object inventory/screenshot/build/test/browser evidence или явный blocker.
- Если stage создаёт Markdown-файл, значение `outputs.<artifact>` должно быть полным Markdown-содержимым целевого файла, включая обязательные секции из `workflow-stages.ts`.
- Agent Output Critic в runtime проверяет этот контракт после ответа специалиста: `agent_name`, `inputs_used`, обязательный artifact output, status semantics и полноту Markdown. Если critic находит blocker, stage не может остаться `success`.
- `status: success` запрещён, если отсутствует хотя бы один обязательный artifact key текущего stage. В таком случае возвращай `partial` с warning/risk или `blocked`, если без артефакта нельзя продолжать.
- Статус `partial` (частичный успех) допустим только при наличии заполненных полей `risks` и/или `open_questions`.
- Статус `blocked` (заблокирован) требует указания конкретного блокирующего фактора (`blocker`) и следующего необходимого действия (`next required action`).
- Поясняющий контент пишется на русском языке; технические ключи, имена файлов, stage id, env vars и contract fields остаются на английском.
- Если для stage нужен внешний provider, external write или model provider call, а approval отсутствует, возвращай `status: blocked` или `status: partial`, но не `success`.

Пример:

```agent-output-yaml
agent_name: prd
status: success
summary: PRD сформирован по исследованию и брифу.
inputs_used:
  - recursive-brief.md
  - research-summary.md
  - scenario-user-flows.md
skills_used: []
outputs:
  prd: |
    # Product Requirements

    ## Inputs Used

    - `recursive-brief.md`
    - `research-summary.md`
    - `scenario-user-flows.md`

    ## Problem

    ...
assumptions: []
risks: []
open_questions: []
recommended_next_step: Передать PRD на IA stage.
surface_output:
  surface_type: research_report
  scope_contract: "PRD как продуктовая поверхность для IA/design/frontend; покрывает problem, goals, requirements, acceptance criteria."
  coverage_gate:
    - input: research-summary.md
      output_location: "Problem / Evidence to requirement map"
      status: covered
    - input: scenario-user-flows.md
      output_location: "Story map / Acceptance criteria"
      status: covered
  evidence_to_output_map:
    - evidence_source: research-summary.md
      decision: "P0 требования сформированы из source-backed findings"
      output_location: "Requirements"
      status: applied
    - evidence_source: scenario-user-flows.md
      decision: "P0 путь пользователя перенесен в requirements и acceptance criteria"
      output_location: "Story Map"
      status: applied
  verification:
    - check: schema_readiness
      result: pass
```
