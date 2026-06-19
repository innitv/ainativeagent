# Figma Design System Result — A3Pay MVP Wireframes

- `status`: completed
- `surface_mode`: `figma_wireframe`
- `file`: [A3Pay × Ozon Банк — MVP wireframes](https://www.figma.com/design/BrobznrRK7IUMCf1FJg4Ln)
- `file_key`: `BrobznrRK7IUMCf1FJg4Ln`
- `design_system_page`: `A3Pay DS — MVP wireframes`
- `design_system_page_id`: `14:2`
- `structured_screens_page`: `MVP wireframes — structured v2`
- `structured_screens_page_id`: `14:3`
- `run_id`: `a3pay-mvp-wireframe-ds-v2-2026-06-18`
- `created_at`: `2026-06-18`

## Что изменено

Текущие Figma-макеты пересобраны по новому правилу `Figma Surface Mode Gate`: wireframes остаются low-fi, но больше не являются плоской россыпью rectangles/text. В текущем Figma-файле создана локальная A3Pay MVP design system и отдельная structured v2 страница с экранами, собранными через Auto Layout и instances.

Старая страница `MVP wireframes — phone first` сохранена как исходный черновик для сравнения.

## Foundations

| Слой | Результат |
|---|---|
| Variables | `A3Pay MVP Tokens`, 26 variables |
| Text styles | 8 локальных `A3Pay/*` styles |
| Effect styles | `A3Pay/Shadow/Card` |
| Component sets | `A3/Button`, `A3/Input`, `A3/StatusCard`, `A3/PaymentMethodCard` |
| Components | `A3/MerchantPaymentRow` |

## Components

| Component | Variants / structure |
|---|---|
| `A3/Button` | `Style=Primary/Secondary/Ghost × State=Default/Disabled`; variants разложены сеткой |
| `A3/Input` | `State=Empty/Filled/Error`; телефонный input для MVP-сценария |
| `A3/StatusCard` | `Kind=Info/Success/Warning/Error`; карточки статусов и recovery |
| `A3/PaymentMethodCard` | `State=Default/Selected/Disabled`; карточка способа оплаты |
| `A3/MerchantPaymentRow` | Auto Layout row для merchant dashboard |

## Structured screens v2

Создано 12 экранов на странице `MVP wireframes — structured v2`:

1. `01 Checkout / выбор оплаты`
2. `02 Customer / ввод телефона`
3. `03 Customer / проверка номера`
4. `04 Customer / ожидание push`
5. `05 Ozon mock / подтверждение`
6. `06 Customer / успех`
7. `07 Customer / recovery`
8. `08 Customer / pending late`
9. `09 Desktop checkout`
10. `10 Merchant / создание платежа`
11. `11 Merchant / платежи и статусы`
12. `12 Merchant / карточка платежа`

## Verification

Figma inventory после пересборки:

| Page | Result |
|---|---|
| `A3Pay DS — MVP wireframes` | 4 component sets, 17 component variants, 1 standalone component, 26 variables, 8 text styles, 1 effect style |
| `MVP wireframes — structured v2` | 12 screens, 12 Auto Layout screen frames, 39 Auto Layout frames, 41 component instances, 126 text nodes |

Screenshot smoke выполнен для:

- `A3Pay DS — MVP wireframes`
- `MVP wireframes — structured v2`

## Deviation / scope

Это не high-fidelity дизайн-макет. Статус именно `figma_wireframe`: структурно корректная low-fi версия для проверки сценария и последующей продуктовой/дизайнерской итерации. Для `figma_design_mockup` следующим этапом нужны визуальная полировка, расширенные states, компоненты с более полной variant API, возможно тёмный режим и привязка к финальной brand/system language.
