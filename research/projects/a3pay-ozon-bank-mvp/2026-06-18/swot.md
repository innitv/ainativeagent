# SWOT A3Pay × Ozon Банк MVP

## Strengths

- У A3 есть платежная B2B-компетенция, банковские интеграции и опыт уведомлений/начислений.
- Ozon Pay публично предлагает links, checkout, CMS/API, reports, refunds и 54-ФЗ service.
- Hosted flow позволяет быстро пилотировать без хранения card data у A3/merchant.

## Weaknesses

- Один партнер означает single point of commercial/technical failure.
- Неясно, добавляет ли A3 ценность поверх прямого Ozon Pay.
- Тезис о цене слаб против прямого СБП.
- Phone-to-push не подтвержден публичным контрактом.

## Opportunities

- Payment links для service merchants, которым важнее сверка, чем множество методов.
- Domain payment objects и отраслевые workflows.
- В будущем — multi-acquirer routing после доказанного single-partner MVP.
- Embedded distribution через партнерскую сеть A3.

## Threats

- Мерчанты подключатся к Ozon Pay напрямую.
- Ozon изменит тариф/условия или не даст platform API.
- Privacy/anti-fraud ограничения заблокируют phone lookup.
- Слабый fallback снизит conversion у пользователей без нужного Ozon state.
- Неверное обещание «дешевле СБП» создаст юридический и репутационный риск.

## Risk responses

| Risk | Mitigation | Owner | Validation |
|---|---|---|---|
| Нет platform API | начать с links/hosted integration | product/partnership | API workshop |
| Нет phone push | O1 deeplink/QR baseline | product | prototype test |
| Цена не ниже | all-in сегментный оффер | commercial | 3 merchant pilot |
| Неясная роль 161-ФЗ | договорная схема до development | legal | signed responsibility matrix |
| Double payment | idempotency + late-success handling | engineering | chaos/test cases |

