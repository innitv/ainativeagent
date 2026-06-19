# Unit economics framework

## Формула полной стоимости

`effective_cost = acquiring_fee + fiscalization + payout/account fees + refund/dispute cost + support cost + integration amortization + failed-payment opportunity cost - incentives`

## Scenario table

| Scenario | Rail/public reference | Что добавить в расчет |
|---|---|---|
| Direct SBP general | up to 0.7% | bank tariff, integration, касса, support |
| Direct SBP selected categories | up to 0.4% | same |
| Direct SBP ЖКУ | up to 0.2%, cap 10 ₽ | same; likely hard to beat on fee alone |
| Ozon Pay | from 0.4%; online checks 0.49% optional | share of SBP/cards, account requirement, payouts, refunds |
| A3Pay via Ozon | unknown | Ozon fee + A3 margin/subsidy + operations |

## Example, not a quote

При обороте 1 000 000 ₽ и 1 000 платежах нельзя сравнивать только процент. Нужно запросить фактическую смесь методов. Если 70% пройдет по 0,4%, а 30% по карточной ставке `x`, acquiring cost = `2 800 ₽ + 3 000 × x`. К нему добавляются чеки, возвраты и операционные затраты. Это пример модели; `x` должен прийти из коммерческого оффера.

## Commercial experiment

На 3 pilot merchants сравнить за 4 недели:

- effective fee / GMV;
- checkout completion;
- median time to pay;
- manual reconciliation minutes / 100 payments;
- refunds/support tickets / 1 000 payments;
- onboarding days to first successful payment.

Позиционирование «выгоднее» допустимо только после такого all-in comparison по сегменту.

