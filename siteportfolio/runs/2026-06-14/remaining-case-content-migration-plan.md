# План миграции оставшихся кейсов

## Тип задачи

`siteportfolio update` / ограниченная контентная миграция существующих страниц.

## Источники и локальные маршруты

| Источник | Локальный case id | Статус |
|---|---|---|
| `https://ivan-ignatov.online/rtk/redisign` | `subscriptions` | completed |
| `https://ivan-ignatov.online/rtk/web` | `web-services` | completed |
| `https://ivan-ignatov.online/rtk/onboarding` | `onboarding` | completed |
| `https://ivan-ignatov.online/smlt/mdg` | `mdg` | completed |
| `https://ivan-ignatov.online/smlt/map` | `options-map` | completed |

## Шаги

1. Для каждой страницы извлечь заголовок, все секции, списки, подписи и URL изображений.
2. Заполнить `coverImage` и `detailSections` соответствующего локального кейса без потери исходного контента.
3. Сохранить количественные эффекты в отдельных разделах, не смешивая их с общими выводами.
4. Проверить загрузку всех изображений, число секций и отсутствие horizontal overflow.
5. Проверить мобильные галереи на ширине 390 px.
6. Выполнить `yarn typecheck` и `yarn build`, обновить `handoff-bundle.md` и `stage-gate-ledger.md`.

## Definition of Done

- заполнены все пять оставшихся кейсов;
- все source sections имеют локальное место;
- все source images загружаются;
- desktop/mobile overflow равен `0`;
- проверки сборки проходят.

## Результат проверки

- desktop: все 5 маршрутов открываются, 26 контентных секций и соответствующие пункты содержания отображаются;
- media: 8 изображений и 3 видео успешно загружены;
- mobile 390×844: изображения и видео помещаются в viewport, page overflow отсутствует, содержание остаётся в одну строку и прокручивается горизонтально;
- `yarn typecheck` и `yarn build` прошли.
