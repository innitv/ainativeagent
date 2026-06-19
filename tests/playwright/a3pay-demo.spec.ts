import { expect, test } from "@playwright/test";

const orderId = "pay_91A0EF";

test("client can complete the A3Pay push payment demo", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  await page.getByLabel("Телефон, привязанный к Ozon Bank").fill("+7 900 123-45-67");
  await page.getByRole("button", { name: "Отправить push на оплату" }).click();

  await expect(page.locator(".a3pay-bank-push")).toBeVisible({ timeout: 4_000 });
  await page.locator(".a3pay-bank-push").click();

  await expect(page.getByRole("button", { name: "Подтвердить оплату" })).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить оплату" }).click();

  await expect(page.getByRole("heading", { name: "Оплата прошла" })).toBeVisible();
});

test("merchant can see the client-not-found state", async ({ page }) => {
  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);

  await page.getByLabel("Телефон клиента").fill("+7 903 000-00-02");
  await page.getByRole("button", { name: /Создать запрос на оплату/ }).click();

  await expect(page.getByText("Клиент не найден").first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("Номер не связан с активным Ozon Bank.").first()).toBeVisible();
});

test("merchant and client routes share the same demo order state", async ({ context, page }) => {
  const merchant = page;
  const client = await context.newPage();

  await merchant.goto(`/a3pay-demo/merchant/orders/${orderId}`);
  await client.goto(`/a3pay-demo/pay/${orderId}`);

  await merchant.getByRole("button", { name: /Создать запрос на оплату/ }).click();

  await expect(client.locator(".a3pay-bank-push")).toBeVisible({ timeout: 4_000 });
  await client.locator(".a3pay-bank-push").click();
  await client.getByRole("button", { name: "Подтвердить оплату" }).click();

  await expect(merchant.getByText("Оплачено").first()).toBeVisible({ timeout: 4_000 });
});
