# A3Pay MVP frontend

Эта папка — единая точка разработки клиентской и мерчантской веток A3Pay × Ozon Bank.

## Что здесь лежит

- `A3PayDemo.tsx` — клиентский mobile-flow и мерчантский web-flow из Figma.
- `a3pay-demo.css` — изолированные стили продукта.
- `mock-api.ts` — dev-only Vite middleware для мокового payment API.
- `index.ts` — публичные экспорты для `App.tsx` и `vite.config.ts`.

## Внешние подключения

- `apps/frontend/src/App.tsx` только маршрутизирует `/a3pay-demo` в `A3PayDemo`.
- `apps/frontend/vite.config.ts` только подключает `a3payDemoMockApi()`.
- `tests/playwright/a3pay-demo.spec.ts` проверяет пользовательские сценарии, но лежит в общем каталоге Playwright-тестов проекта.

## Ветки продукта

- `/a3pay-demo` — клиентская ветка по умолчанию.
- `/a3pay-demo/pay/pay_91A0EF` — `A3Pay MVP`, клиентская mobile-ветка из Figma.
- `/a3pay-demo/merchant/orders/pay_91A0EF` — `A3Pay MVP Merchant`, web-ветка мерчанта из Figma.

## Публичные ссылки после Vercel deploy

После деплоя на Vercel корневой preview URL автоматически перенаправляет на клиентскую ветку. Если нужно дать точные ссылки, замени домен на домен проекта:

- `https://<vercel-domain>/a3pay-demo` — клиентская ветка.
- `https://<vercel-domain>/a3pay-demo/pay/pay_91A0EF` — ссылка для клиента.
- `https://<vercel-domain>/a3pay-demo/merchant/orders/pay_91A0EF` — ссылка для мерчанта.

`vercel.json` в корне проекта перенаправляет `/` на `/a3pay-demo` и направляет все route-paths в `index.html`, поэтому прямые ссылки на роли не должны падать в 404.

## Тестовые номера

- `+7 900 123-45-67` — успешный сценарий.
- `+7 903 000-00-02` — клиент не найден.
