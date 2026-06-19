---
id: landing-builder
name: landing-builder
title: "Bespoke UI Landing Builder"
description: "Use when implementing stage 08-frontend for a landing, console, or product UI from approved PRD/IA/design/copy/screens/prototype artifacts. Builds bespoke React/Vite/Tailwind UI, derives style from design artifacts or reference-analysis, preserves workflow gates, and writes frontend_result evidence."
platforms:
  - codex
  - open-code
mcp_servers:
  - playwright
strictness_profile: strict
owner_stage_ids:
  - 08-frontend
required_inputs:
  - prd
  - ia_brief
  - design_brief
  - screens
  - copy_deck
  - prototype_report
required_outputs:
  - frontend_result
approval_actions: []
validation_commands:
  - yarn typecheck
  - yarn build
contract_schema: agent-pack/templates/skill.template.md
---

# Skill: Bespoke UI Landing Builder

## 1. Назначение

Применяй skill только для `08-frontend`, когда уже есть `prd.md`, `ia-brief.md`, `design-brief.md`, `screens.md`, `copy-deck.md` и `prototype-report.md`. Frontend в полном workflow нельзя начинать раньше этих артефактов, кроме явно отмеченного `quick draft`.

Стек по умолчанию: React + Vite + Tailwind CSS. Верстка самостоятельного продукта живет в отдельном каталоге `apps/frontend/src/views/<product-slug>/`; личный сайт хранится отдельно в `siteportfolio/src/`. Не переиспользуй код одного продукта как основу другого без явного решения. `App.tsx` держи тонким роутером, который подключает только актуальные surfaces.

## 2. Обязательные inputs

Перед изменением кода прочитай:
- `prd.md`: цели, acceptance criteria, analytics.
- `ia-brief.md`: sitemap, primary flow, главный экран и действие.
- `design-brief.md`: визуальные токены, компоненты, responsive, accessibility.
- `screens.md`: порядок экранов/секций и состояния.
- `copy-deck.md`: финальные тексты, CTA, SEO, claims.
- `prototype-report.md`: transition map и интерактивные сценарии.
- `reference-analysis.md`, если задача reference-driven.

## 3. Процедура

1. Извлеки implementation checklist из входных артефактов: секции, состояния, CTA, формы, analytics hooks, responsive breakpoints, accessibility notes.
2. Перед кодом зафиксируй короткий frontend thesis:
   - `visual thesis`: настроение, материал, плотность, энергия;
   - `content plan`: hero/primary workspace, support/detail, conversion or task completion;
   - `interaction thesis`: 2-3 осмысленных motion/feedback решения;
   - `defaults to reject`: 3 типовых AI/default решения, которых нельзя допустить.
3. Определи тип поверхности:
   - `marketing/landing`: первый viewport работает как brand/product signal, composition-first, минимум chrome;
   - `app/dashboard/console`: primary workspace, navigation, inspector/context, плотная повторяемая работа;
   - blended projects разделяй на разные views/sections, не смешивай marketing hero с операционным dashboard.
4. Собери UI bespoke-стилем: CSS Grid/Flexbox и Tailwind только как запись значений из design/reference artifacts. Не используй готовые шаблоны, дефолтные сетки и стандартный "component library look".
5. В reference-driven задаче layout, gaps, column counts, aspect ratios и section order бери только из `reference-analysis.md`; не подставляй Bootstrap-like/12-column defaults.
6. В обычной задаче стиль выводи из `design-brief.md`, `STYLE_GUIDE.md` и `figma-handoff-bundle.md` при наличии. Не навязывай glassmorphism, gradients, blur или темную тему, если они не заданы дизайном.
7. Синхронизируй tokens/components:
   - Figma variables/design tokens -> CSS custom properties или Tailwind theme values;
   - Figma Auto Layout intent -> Flex/Grid, gap, padding, min/max, fixed/fill/hug equivalents;
   - component states/variants -> React props, data attributes или local state.
8. Реализуй component architecture: компоненты сфокусированы на одной задаче, без over-configured props, без prop drilling глубже 3 уровней. Состояние выбирай минимально достаточное: local state, lifted state, URL state, context или store только по необходимости.
9. Реализуй состояния: loading/empty/error/success для форм и ключевых интерактивных элементов, selected/active для навигации и списков, hover/focus/disabled для controls.
10. Подключи analytics hooks из PRD без отправки PII в event payload.
11. Проведи frontend QA inventory до финального ответа: пользовательские claims, важные controls, state changes, viewport requirements, визуально критичные зоны.
12. Обнови `frontend-result.md` в run directory: changed files, inputs read, implemented screens/sections, tokens/components mapping, analytics hooks, accessibility/responsive notes, validation commands и known deviations.

## 4. Component Architecture

- Держи view-level композицию отдельно от переиспользуемых компонентов.
- Компонент должен иметь одну ответственность; если файл компонента разрастается и смешивает layout, data mapping и behavior, выдели подкомпоненты или hook.
- Избегай "config-object UI", где компонент пытается принять все варианты через огромный набор props. Предпочитай composition: `Card`, `CardHeader`, `CardBody`, `ActionRow`.
- Для repeated UI опиши стабильные размеры и responsive constraints, чтобы длинный текст, hover/focus state или loading label не меняли layout.
- Не добавляй новую UI-библиотеку ради одного компонента. Используй существующий стек проекта.

## 5. Anti-Patterns

- Generic AI aesthetic: фиолетово-синие градиенты, одинаковые карточки, чрезмерный `rounded-2xl`, декоративные shadows, "hero card" без связи с продуктом.
- Placeholder copy, который прячет реальные переносы текста.
- Uniform card mosaics вместо purpose-driven hierarchy.
- Сырые hex/pixel values, если есть tokens.
- Цвет как единственный индикатор статуса.
- Hover-only UX без keyboard/focus equivalent.
- Full-bleed hero, который теряет brand/product signal в первом viewport.
- Dashboard, где все панели равны и пользователь не видит primary workspace/action.

## 6. Evidence и failure modes

`frontend-result.md` обязан содержать:
- список измененных файлов;
- какие inputs прочитаны;
- какие acceptance criteria закрыты;
- какие tokens/components из design/Figma handoff использованы;
- какие команды проверки запущены и их результат;
- какие screenshots/viewport checks выполнены или почему они skipped;
- известные ограничения, deviations или blockers.

Блокируй stage как `blocked`/`partial`, если нет обязательных upstream artifacts, задача reference-driven без `reference-analysis.md`, frontend просит Figma write/deploy без approval, build/typecheck не проходит или визуально критичный viewport невозможно проверить.

## 7. Validation gates

- [ ] `yarn typecheck` проходит.
- [ ] `yarn build` проходит.
- [ ] Первый viewport не ломается на desktop/mobile.
- [ ] Нет horizontal overflow, перекрытия текста, битых изображений.
- [ ] Keyboard focus видим на интерактивных элементах.
- [ ] Loading/empty/error/success states проверены.
- [ ] Длинный текст не ломает кнопки, cards, table rows и nav.
- [ ] Motion не использует `transition: all`, поддерживает reduced motion и hover gated для fine pointer.
- [ ] Figma/design tokens имеют frontend equivalents или deviations записаны.
- [ ] Analytics hooks соответствуют PRD и не содержат PII.
- [ ] Для визуально значимой UI-задачи есть Playwright/browser screenshot evidence на desktop и mobile или явный blocker.
