import { expect, test } from "@playwright/test";

const orderId = "pay_91A0EF";

test("client can complete the A3Pay push payment flow", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  await page.getByLabel("Телефон, привязанный к Ozon Bank").fill("+7 900 123-45-67");
  await page.getByRole("button", { name: "Отправить push на оплату" }).click();

  await expect(page.locator(".a3pay-ios-notification")).toBeVisible({ timeout: 5_000 });
  await page.locator(".a3pay-ios-notification").click();

  await expect(page.getByRole("button", { name: "Подтвердить оплату" })).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить оплату" }).click();

  await expect(page.getByRole("heading", { name: "Оплата прошла" })).toBeVisible();
});

test("client sees Ozon Bank validation for an inactive phone", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  await page.getByLabel("Телефон, привязанный к Ozon Bank").fill("+7 903 000-00-02");
  await page.getByRole("button", { name: "Отправить push на оплату" }).click();

  await expect(page.getByRole("heading", { name: "Ozon Bank не найден" })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("Мы не нашли активный аккаунт Ozon Bank для этого телефона")).toBeVisible();
});

test("merchant can see the client-not-found state", async ({ page }) => {
  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);

  await page.getByLabel("Телефон клиента").fill("+7 903 000-00-02");
  await page.getByRole("button", { name: /Создать запрос на оплату/ }).click();

  await expect(page.getByText("Клиент не найден").first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("Push не отправлен. Деньги не списаны, платёж не создан в банке.")).toBeVisible();
});

test("merchant follows payment statuses and opens the registry", async ({ page }) => {
  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);

  await expect(page.getByRole("heading", { name: "Создать платёж A3Pay" })).toBeVisible();
  await page.getByRole("button", { name: /Создать запрос на оплату/ }).click();
  await expect(page.getByRole("heading", { name: `Платёж ${orderId}` })).toBeVisible();
  await expect(page.getByText("Push отправлен клиенту")).toBeVisible({ timeout: 3_000 });

  const statusSwitcher = page.getByLabel("Переключить статус платежа");
  await statusSwitcher.getByRole("button", { name: "Клиент не найден" }).click();
  await expect(page.getByText("Push не отправлен. Деньги не списаны, платёж не создан в банке.")).toBeVisible();

  await statusSwitcher.getByRole("button", { name: "Оплачено" }).click();
  await expect(page.getByText("Ozon Bank подтвердил списание. Мерчант может выдать товар/услугу.")).toBeVisible();

  await page.getByRole("button", { name: "Реестр платежей" }).click();
  await expect(page.getByRole("heading", { name: "Операции A3Pay" })).toBeVisible();
  await page.getByRole("button", { name: "Открыть" }).first().click();
  await expect(page.getByRole("heading", { name: `Платёж ${orderId}` })).toBeVisible();
});

test("merchant and client routes share the same order state", async ({ context, page }) => {
  const merchant = page;
  const client = await context.newPage();

  await merchant.goto(`/a3pay-demo/merchant/orders/${orderId}`);
  await client.goto(`/a3pay-demo/pay/${orderId}`);

  await merchant.getByRole("button", { name: /Создать запрос на оплату/ }).click();

  await expect(client.locator(".a3pay-ios-notification")).toBeVisible({ timeout: 5_000 });
  await client.locator(".a3pay-ios-notification").click();
  await client.getByRole("button", { name: "Подтвердить оплату" }).click();

  await expect(merchant.getByText("Оплачено").first()).toBeVisible({ timeout: 4_000 });
});
