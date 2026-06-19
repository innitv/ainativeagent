# Результат FigJam-визуализации

## Статус

`completed` — FigJam-доска создана, наполнена и проверена через inventory + screenshot.

## Target

- File: https://www.figma.com/board/HmmnIhGc21qxh24twdJ7yq
- File key: `HmmnIhGc21qxh24twdJ7yq`
- Name: `A3Pay × Ozon Банк — MVP payment workflow`
- Plan: `A-3` (`team::717400885143313666`)

## Approval record

Пользователь явно разрешил создать новый FigJam и уточнил scope: варианты MVP workflow и CJM без production UI.

## Создано

- Заголовок и пояснение доски.
- 7 sections: контекст, customer happy path, customer recovery, merchant journey, system sequence, MVP options, go/no-go.
- Customer-side CJM: рекомендуемый путь оплаты через hosted checkout + Ozon deeplink/QR.
- Customer recovery: нет приложения/web-flow, неверный телефон, push/link не пришел, pending после возврата, duplicate protection, refund.
- Merchant journey: onboarding, KYB/MCC, договор/тариф, sandbox, test payment/refund drill, go-live, операции.
- System sequence: buyer, merchant, A3Pay, Ozon/Ozon Pay, fiscalization.
- MVP options: O1 hosted checkout, O2 phone-to-push, O3 payment link, O4 embedded widget.
- Go/no-go: вопросы к Ozon Банку, API contract, legal/ops, pilot metrics.
- Дополнительно после уточнения пользователя: отдельная оформленная секция `08 MVP A: телефон → push` в той же FigJam-доске.

## Verification

| Check | Result | Notes |
|---|---|---|
| Figma write | pass | `use_figma` успешно записал все зоны |
| FigJam inventory | pass | `get_figjam` подтвердил 7 sections и созданные nodes/connectors/stickies |
| Screenshot smoke | pass | Screenshot `0:1`: 2400×1504, original canvas 5270×3301 |
| Russian Publication Gate | pass | Видимый текст на русском; английский оставлен для API/MVP/CMS/webhook/status |
| Scope fit | pass | Production UI не создавался; доска сфокусирована на workflow/CJM/MVP options |
| Phone MVP scheme | pass | `get_figjam` подтвердил секцию `08 MVP A: телефон → push`, заголовок, flow-shapes, connectors и sticky notes |
| Phone scheme screenshot | pass | Screenshot section `12:384`: 2000×548, original section 4300×1120 |

## Итоговое решение на доске

После уточнения пользователя телефонный сценарий зафиксирован как основной MVP-путь: пользователь вводит номер телефона, A3Pay создаёт payment intent, отправляет запрос в Ozon, пользователь подтверждает оплату в Ozon, A3Pay проверяет финальный статус и отправляет signed webhook мерчанту.

QR/ссылка/другой способ оплаты не удалены: они оставлены как recovery, если push не пришёл, номер неверный, статус неизвестен или истёк TTL.

## Исправление оформления телефонной схемы

Первичная вставка телефонного сценария была создана через Mermaid diagram и визуально не совпадала с предыдущими зонами доски. После замечания пользователя она заменена на полноценную FigJam-секцию:

- `section`: `08 MVP A: телефон → push`
- `section_node_id`: `12:384`
- `screenshot_check`: `https://www.figma.com/api/mcp/asset/23660b7f-53d8-4dbf-ac54-80cc400f220a`

Секция оформлена в стиле предыдущих блоков: светлая section-зона, H2-заголовок, цветные flow-shapes, decision diamond, success/recovery ветки и sticky notes с API-риском, UX-правилом, duplicate protection, MVP-метриками и merchant view.
