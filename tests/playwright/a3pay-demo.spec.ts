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

test("client uses native-style iOS navigation between payment steps", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  await expect(page.locator(".a3pay-ios-statusbar")).toHaveCount(0);
  await expect(page.locator(".a3pay-ios-navbar").getByText("A3Pay")).toBeVisible();
  await expect(page.getByRole("button", { name: "Назад" })).toHaveCount(0);

  await page.getByRole("button", { name: "Отправить push на оплату" }).click();
  await expect(page.getByRole("button", { name: "Назад" })).toBeVisible({ timeout: 3_000 });
  await page.getByRole("button", { name: "Назад" }).click();

  await expect(page.getByRole("heading", { name: "Проверьте оплату" })).toBeVisible();
});

test("client sees Ozon Bank validation for an inactive phone", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  await page.getByLabel("Телефон, привязанный к Ozon Bank").fill("+7 903 000-00-02");
  await page.getByRole("button", { name: "Отправить push на оплату" }).click();

  await expect(page.getByRole("heading", { name: "Ozon Bank не найден" })).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("Мы не нашли активный аккаунт Ozon Bank для этого телефона")).toBeVisible();
});

test("mobile payment surface adapts to a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto(`/a3pay-demo/pay/${orderId}`);

  const surface = page.locator(".a3pay-phone-surface");
  await expect(surface).toBeVisible();
  const bounds = await surface.boundingBox();
  expect(bounds?.height).toBeLessThanOrEqual(667);

  const submit = page.getByRole("button", { name: "Отправить push на оплату" });
  await submit.scrollIntoViewIfNeeded();
  await expect(submit).toBeVisible();
});

test("merchant can see the client-not-found state", async ({ page }) => {
  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);

  await page.getByLabel("Телефон клиента").fill("+7 903 000-00-02");
  await page.getByRole("button", { name: /Создать запрос на оплату/ }).click();

  await expect(page.getByText("Клиент не найден").first()).toBeVisible({ timeout: 3_000 });
  await expect(page.getByText("Push не отправлен. Деньги не списаны, платёж не создан в банке.")).toBeVisible();
});

test("merchant create screen keeps the compact Figma layout", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);

  await expect(page.getByText("A3Pay merchant")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Реестр платежей" })).toBeVisible();

  const preview = await page.locator(".a3pay-request-preview").boundingBox();
  const form = await page.locator(".a3pay-merchant-form-surface").boundingBox();
  expect(Math.abs((preview?.width ?? 0) - (form?.width ?? 0))).toBeLessThanOrEqual(2);
  expect(preview?.height).toBeLessThanOrEqual(230);
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

test("merchant and client surfaces load Inter", async ({ page }) => {
  await page.goto(`/a3pay-demo/pay/${orderId}`);
  await expect(page.locator(".a3pay-mobile-branch")).toHaveCSS("font-family", /Inter/);

  const clientFontLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Inter"');
  });
  expect(clientFontLoaded).toBe(true);

  await page.goto(`/a3pay-demo/merchant/orders/${orderId}`);
  await expect(page.locator(".a3pay-merchant-product")).toHaveCSS("font-family", /Inter/);

  const merchantFontLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Inter"');
  });
  expect(merchantFontLoaded).toBe(true);
});
