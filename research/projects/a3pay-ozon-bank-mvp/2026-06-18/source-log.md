# Source Log

Дата проверки: 2026-06-18.

| ID | Источник | Тип | Что подтверждает | Ограничение |
|---|---|---|---|---|
| S01 | [A3 — официальный сайт](https://www.a-3.ru) | primary/company | A3 работает как платежный сервис и поставщик решений для банков, поставщиков и платежных сервисов | Публичные страницы не описывают A3Pay × Ozon API |
| S02 | [Продукты A3 для платежных сервисов](https://www.a-3.ru/products/payment-services) | primary/company | Направление B2B payment services | Публичный контент частично динамический |
| S03 | [Приложение «А3 Платежи»](https://apps.apple.com/us/app/%D0%B03-%D0%BF%D0%BB%D0%B0%D1%82%D0%B5%D0%B6%D0%B8-%D0%BE%D0%BF%D0%BB%D0%B0%D1%82%D0%B0-%D0%B6%D0%BA%D1%85-%D0%BE%D0%BD%D0%BB%D0%B0%D0%B9%D0%BD/id1620317647) | primary/store listing | Существующий B2C опыт: регистрация по телефону, поиск начислений, карта, история, квитанция; перевод оказывает банк-партнер | Это ЖКХ-продукт, а не доказательство нового A3Pay |
| S04 | [A3 Household, ComNews](https://www.comnews.ru/digital-economy/content/229896/2023-11-01/2023-w44/1012/platyozhnyy-servis-a3-zapustil-servis-dlya-oplaty-uslug-zhkkh-adresu) | secondary/company claims | У A3 есть компетенция в агрегировании начислений и уведомлениях через банковские каналы | Метрики являются заявлениями компании |
| S05 | [Ozon Pay: интернет-эквайринг](https://finance.ozon.ru/business/acquiring/internet) | primary/product | Форма, приложение, payment links, CMS/API, карты и СБП, личный кабинет, отчеты, возвраты, онлайн-чеки; ставка «от 0,4%» | Публичная страница не описывает phone-triggered push и партнерскую white-label схему |
| S06 | [Ozon Pay для WordPress](https://docs.ozon.ru/common/yuridicheskim-litsam/ozon-pay/wordpress) | primary/docs | Интеграция использует `accessKey` и `secretKey` из кабинета Ozon Pay | Не раскрывает полный payment API |
| S07 | [Ozon Pay для Tilda](https://docs.ozon.ru/common/yuridicheskim-litsam/ozon-pay/tilda) | primary/docs | Есть готовое подключение платежного сервиса | Не раскрывает статусы/webhook contract |
| S08 | [Интерфакс: запуск Ozon Pay](https://www.interfax.ru/business/1020779) | reliable secondary | На старте заявлены карты всех российских банков, СБП и one-click для сохраненных данных Ozon | Новость 2025 года; текущие условия берем с S05 |
| S09 | [Банк России: СБП](https://www.cbr.ru/Psystem/sfp) | primary/regulator | Покупатель проверяет получателя/сумму и подтверждает платеж; для бизнеса комиссия ограничена по категориям | Не описывает коммерческую надбавку посредника |
| S10 | [Тарифы СБП C2B](https://www.cbr.ru/about_br/dir/rsd_2023-03-17_45_01) | primary/regulator | До 0,4% для ряда категорий, до 0,7% для прочих; ЖКУ — до 0,2% и не более 10 ₽ | Нужно проверить MCC/категорию каждого мерчанта |
| S11 | [СБП: FAQ для бизнеса](https://sbp.nspk.ru/faq/business) | primary/operator | Моментальное зачисление и максимальная комиссия 0,7% | Реальная ставка зависит от банка и категории |
| S12 | [СБП для бизнеса](https://sbp.nspk.ru/business) | primary/operator | QR, ссылка, NFC/кнопка и API — штатные C2B entry points | Телефон относится прежде всего к C2C, не является публично описанным C2B checkout trigger |
| S13 | [Банк России: разъяснения по 161-ФЗ](https://cbr.ru/psystem/acts/161-fz) | primary/regulator | Оператор перевода — банк; платежный агрегатор действует от имени привлекшего его оператора и заключает договоры с мерчантами | Конкретную роль A3 определит договорная схема |
| S14 | [ФНС: 54-ФЗ и интернет-расчеты](https://www.nalog.gov.ru) | primary/regulator | При расчетах с физлицами нужен электронный кассовый чек; возврат требует чека `возврат прихода` | Нужна предметная проверка исключений по сегменту мерчанта |
| S15 | [Роскомнадзор: персональные данные интернет-магазина](https://old.rkn.gov.ru/news/rsoc/news51712.htm) | primary/regulator | Телефон является персональными данными; обработке нужно правовое основание и прозрачная цель | Не является продуктовой спецификацией платежного push |
| S16 | [Lazyweb: Banked pay-by-bank](https://banked.com/en-us/consumer) | visual reference | Ясная модель «оплатить из банковского счета» с явным CTA и переходом к подтверждению | Иностранный рынок, не доказательство доступности rail в РФ |
| S17 | [Lazyweb: Stripe Checkout](https://stripe.com/payments/checkout) | visual reference | Hosted checkout, порядок выбора метода, возврат статуса в merchant surface | Не российская нормативная модель |
| S18 | [Lazyweb: eBay checkout](https://www.ebay.com) | visual reference | Review-before-pay: товар, доставка, способ и финальная сумма до подтверждения | Marketplace flow шире нужного MVP |
| S19 | [Lazyweb: Walmart checkout](https://www.walmart.com) | visual reference | Телефон отделен как контакт для обновлений, а не используется как платежный credential | Иностранный рынок |
| S20 | [Lazyweb: Xendit merchant platform](https://www.xendit.co/en/products/xenplatform) | visual reference | Разделение merchant accounts, balances и transaction totals | Нужна адаптация к ролям A3/Ozon |

## Source policy notes

- Тарифы, нормативные роли и C2B-механика опираются на Банк России/НСПК.
- Маркетинговые метрики A3 и Ozon используются только как claims и не превращаются в подтвержденные market facts.
- Отсутствие публичной документации phone-to-push не доказывает отсутствия частного партнерского API; это фиксируется как `partner-dependent`.

