import type { IncomingMessage, ServerResponse } from "node:http";

import type { Plugin } from "vite";

type DemoStatus =
  | "draft"
  | "phone_entered"
  | "client_found"
  | "client_not_found"
  | "push_sent"
  | "push_received"
  | "payment_opened"
  | "paid"
  | "expired";

type DemoEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warning" | "error" | "brand";
};

type DemoOrder = {
  id: string;
  merchantOrderId: string;
  merchantName: string;
  amount: number;
  status: DemoStatus;
  phone: string;
  attempt: number;
  pushVisible: boolean;
  lastUpdatedAt: string;
  events: DemoEvent[];
};

type DemoAction =
  | { type: "reset" }
  | { type: "set_phone"; phone: string }
  | { type: "check_phone"; phone: string }
  | { type: "send_push"; source: "merchant" | "client" }
  | { type: "receive_push" }
  | { type: "open_payment" }
  | { type: "confirm_payment" }
  | { type: "expire" };

const demoOrderId = "pay_91A0EF";

const nowTime = () =>
  new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

const demoEvent = (
  title: string,
  detail: string,
  tone: DemoEvent["tone"] = "neutral",
): DemoEvent => ({
  at: nowTime(),
  detail,
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  title,
  tone,
});

const createDemoOrder = (): DemoOrder => ({
  amount: 12480,
  attempt: 0,
  events: [demoEvent("Заказ создан", "Мерчант сформировал ссылку на оплату A3Pay.")],
  id: demoOrderId,
  lastUpdatedAt: new Date().toISOString(),
  merchantName: "FitSpace Club",
  merchantOrderId: "ORD-2048",
  phone: "",
  pushVisible: false,
  status: "draft",
});

let demoOrder = createDemoOrder();

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const isValidPhone = (phone: string) => {
  const normalized = normalizePhone(phone);
  return normalized.length === 11 && normalized.startsWith("7");
};

const isNotFoundPhone = (phone: string) => normalizePhone(phone) === "79030000002";

const updateDemoOrder = (
  status: DemoStatus,
  event: DemoEvent,
  patch: Partial<DemoOrder> = {},
) => {
  demoOrder = {
    ...demoOrder,
    ...patch,
    events: [...demoOrder.events, event].slice(-8),
    lastUpdatedAt: new Date().toISOString(),
    status,
  };
  return demoOrder;
};

const applyDemoAction = (action: DemoAction) => {
  if (action.type === "reset") {
    demoOrder = createDemoOrder();
    return demoOrder;
  }

  if (action.type === "set_phone") {
    demoOrder = {
      ...demoOrder,
      lastUpdatedAt: new Date().toISOString(),
      phone: action.phone,
      status: action.phone ? "phone_entered" : "draft",
    };
    return demoOrder;
  }

  if (action.type === "check_phone") {
    const phone = action.phone.trim();

    if (!isValidPhone(phone)) {
      return updateDemoOrder(
        "phone_entered",
        demoEvent("Номер не прошёл валидацию", "Нужен российский номер в формате +7 ХХХ ХХХ-ХХ-ХХ.", "error"),
        { phone, pushVisible: false },
      );
    }

    if (isNotFoundPhone(phone)) {
      return updateDemoOrder(
        "client_not_found",
        demoEvent("Клиент не найден", "Ozon Bank не нашёл активного клиента по этому номеру.", "error"),
        { phone, pushVisible: false },
      );
    }

    return updateDemoOrder(
      "client_found",
      demoEvent("Клиент найден", "Ozon Bank готов принять push на банковское приложение.", "success"),
      { phone, pushVisible: false },
    );
  }

  if (action.type === "send_push") {
    if (!demoOrder.phone || !isValidPhone(demoOrder.phone)) {
      return updateDemoOrder(
        "phone_entered",
        demoEvent("Push не отправлен", "Сначала нужен корректный номер клиента.", "error"),
      );
    }

    if (isNotFoundPhone(demoOrder.phone)) {
      return updateDemoOrder(
        "client_not_found",
        demoEvent("Push не отправлен", "По номеру нет активного Ozon Bank для оплаты.", "error"),
        { pushVisible: false },
      );
    }

    return updateDemoOrder(
      "push_sent",
      demoEvent(
        action.source === "merchant" ? "Мерчант отправил push" : "Запрошен push",
        "Клиент должен получить уведомление в приложении банка.",
        "brand",
      ),
      { attempt: demoOrder.attempt + 1, pushVisible: false },
    );
  }

  if (action.type === "receive_push") {
    return updateDemoOrder(
      "push_received",
      demoEvent("Push доставлен", "На клиентском устройстве показано банковское уведомление.", "brand"),
      { pushVisible: true },
    );
  }

  if (action.type === "open_payment") {
    return updateDemoOrder(
      "payment_opened",
      demoEvent("Клиент открыл оплату", "Переход из push в экран подтверждения Ozon Bank."),
      { pushVisible: false },
    );
  }

  if (action.type === "confirm_payment") {
    return updateDemoOrder(
      "paid",
      demoEvent("Платёж подтверждён", "Webhook обновил заказ мерчанта, товар можно выдавать.", "success"),
      { pushVisible: false },
    );
  }

  if (action.type === "expire") {
    return updateDemoOrder(
      "expired",
      demoEvent("Push истёк", "Клиент не открыл уведомление вовремя. Можно повторить отправку.", "warning"),
      { pushVisible: false },
    );
  }

  return demoOrder;
};

const readJsonBody = async (request: IncomingMessage) =>
  await new Promise<unknown>((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

const sendJson = (response: ServerResponse, statusCode: number, data: unknown) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
};

export function a3payDemoMockApi(): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = request.url ?? "";
        const isOrderRoute = url === `/api/a3pay-demo/orders/${demoOrderId}`;
        const isActionRoute = url === `/api/a3pay-demo/orders/${demoOrderId}/actions`;

        if (request.method === "GET" && isOrderRoute) {
          sendJson(response, 200, demoOrder);
          return;
        }

        if (request.method === "POST" && isActionRoute) {
          try {
            const action = (await readJsonBody(request)) as DemoAction;
            sendJson(response, 200, applyDemoAction(action));
          } catch {
            sendJson(response, 400, { error: "invalid_json" });
          }
          return;
        }

        next();
      });
    },
    name: "a3pay-demo-mock-api",
  };
}
