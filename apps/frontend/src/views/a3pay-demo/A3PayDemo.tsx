import * as React from "react";
import {
  Check,
  ChevronLeft,
  Search,
  ShieldCheck,
} from "lucide-react";

import "./a3pay-demo.css";

type DemoStatus =
  | "draft"
  | "checking_phone"
  | "client_not_found"
  | "push_sent"
  | "push_received"
  | "bank_launching"
  | "payment_opened"
  | "paid"
  | "expired";

type DemoEvent = {
  id: string;
  label: string;
  time: string;
  tone: "neutral" | "info" | "success" | "warning" | "error";
};

type DemoPayment = {
  id: string;
  status: DemoStatus;
  amount: number;
  merchantName: string;
  orderNumber: string;
  phone: string;
  pushAttempts: number;
  updatedAt: number;
  events: DemoEvent[];
};

type DemoRole = "client" | "merchant";

const DEFAULT_ORDER_ID = "pay_91A0EF";
const ACTIVE_PHONE = "79001234567";
const NOT_FOUND_PHONE = "79030000002";

const statusCopy: Record<DemoStatus, { title: string; description: string; tone: DemoEvent["tone"] }> = {
  draft: {
    title: "Ожидает запуска",
    description: "Платёж создан, клиент ещё не получил push в Ozon Bank.",
    tone: "neutral",
  },
  checking_phone: {
    title: "Проверяем телефон",
    description: "A3Pay проверяет, можно ли отправить банковский push.",
    tone: "info",
  },
  client_not_found: {
    title: "Клиент не найден",
    description: "Номер не связан с активным Ozon Bank.",
    tone: "error",
  },
  push_sent: {
    title: "Push отправлен",
    description: "Клиент должен открыть уведомление в Ozon Bank.",
    tone: "warning",
  },
  push_received: {
    title: "Push доставлен",
    description: "На клиентском телефоне показано банковское уведомление.",
    tone: "info",
  },
  bank_launching: {
    title: "Открываем Ozon Bank",
    description: "Клиент перешёл в банковское приложение из push.",
    tone: "info",
  },
  payment_opened: {
    title: "Открыто в банке",
    description: "Клиент проверяет сумму и получателя перед списанием.",
    tone: "warning",
  },
  paid: {
    title: "Оплачено",
    description: "Webhook обновил заказ мерчанта, чек можно показать клиенту.",
    tone: "success",
  },
  expired: {
    title: "Истекло",
    description: "Повтор можно делать только после явного timeout или действия клиента.",
    tone: "warning",
  },
};

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) {
    return `7${digits.slice(1)}`;
  }
  return digits;
}

function formatPhone(value: string) {
  const digits = normalizePhone(value);
  if (digits.length !== 11) {
    return value || "—";
  }
  return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

function getNowLabel() {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function makeEvent(label: string, tone: DemoEvent["tone"] = "neutral"): DemoEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    time: getNowLabel(),
    tone,
  };
}

function createInitialPayment(orderId: string): DemoPayment {
  return {
    amount: 12480,
    events: [makeEvent("Мерчант создал payment_intent #A3-2048", "neutral")],
    id: orderId,
    merchantName: "FitSpace Club",
    orderNumber: "A3-2048",
    phone: "",
    pushAttempts: 0,
    status: "draft",
    updatedAt: Date.now(),
  };
}

function getStorageKey(orderId: string) {
  return `a3pay-demo:${orderId}`;
}

function loadPayment(orderId: string): DemoPayment {
  const stored = window.localStorage.getItem(getStorageKey(orderId));
  if (!stored) {
    return createInitialPayment(orderId);
  }

  try {
    return { ...createInitialPayment(orderId), ...JSON.parse(stored) } as DemoPayment;
  } catch {
    return createInitialPayment(orderId);
  }
}

function isValidPhone(value: string) {
  return normalizePhone(value).length === 11 && normalizePhone(value).startsWith("7");
}

function reducePayment(
  current: DemoPayment,
  patch: Partial<DemoPayment> & { event?: DemoEvent },
): DemoPayment {
  return {
    ...current,
    ...patch,
    events: patch.event ? [patch.event, ...current.events].slice(0, 10) : current.events,
    updatedAt: Date.now(),
  };
}

function useDemoPayment(orderId: string) {
  const [payment, setPaymentState] = React.useState<DemoPayment>(() => loadPayment(orderId));
  const channelRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    const channel = new BroadcastChannel(`a3pay-demo:${orderId}`);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<DemoPayment>) => {
      if (event.data?.id === orderId) {
        setPaymentState(event.data);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === getStorageKey(orderId) && event.newValue) {
        try {
          setPaymentState(JSON.parse(event.newValue) as DemoPayment);
        } catch {
          // Ignore malformed demo state.
        }
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [orderId]);

  const persist = React.useCallback(
    (next: DemoPayment) => {
      window.localStorage.setItem(getStorageKey(orderId), JSON.stringify(next));
      channelRef.current?.postMessage(next);
      setPaymentState(next);
    },
    [orderId],
  );

  const updatePayment = React.useCallback(
    (patch: Partial<DemoPayment> & { event?: DemoEvent }) => {
      setPaymentState((current) => {
        const next = reducePayment(current, patch);
        window.localStorage.setItem(getStorageKey(orderId), JSON.stringify(next));
        channelRef.current?.postMessage(next);
        return next;
      });
    },
    [orderId],
  );

  const reset = React.useCallback(() => {
    persist(createInitialPayment(orderId));
  }, [orderId, persist]);

  return { payment, reset, updatePayment };
}

function getRoleFromPath(pathname: string): DemoRole {
  if (pathname.includes("/merchant")) {
    return "merchant";
  }
  if (pathname.includes("/pay/")) {
    return "client";
  }
  return "client";
}

function getOrderIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? DEFAULT_ORDER_ID;
}

function getOrderId(role: DemoRole, pathname: string) {
  if (role === "client" && !pathname.includes("/pay/")) {
    return DEFAULT_ORDER_ID;
  }
  return getOrderIdFromPath(pathname);
}

export function A3PayDemo() {
  const pathname = window.location.pathname;
  const role = getRoleFromPath(pathname);
  const orderId = getOrderId(role, pathname);
  const demo = useDemoPayment(orderId);

  if (role === "merchant") {
    return <MerchantBranch {...demo} />;
  }

  return <ClientBranch {...demo} />;
}

function ClientBranch({
  payment,
  reset,
  updatePayment,
}: {
  payment: DemoPayment;
  reset: () => void;
  updatePayment: (patch: Partial<DemoPayment> & { event?: DemoEvent }) => void;
}) {
  const [phone, setPhone] = React.useState(payment.phone ? formatPhone(payment.phone) : "+7 900 123-45-67");
  const [phoneError, setPhoneError] = React.useState("");

  const requestPush = () => {
    const phoneForValidation = phone.startsWith("+7") ? phone : `+7 ${phone}`;
    if (!isValidPhone(phoneForValidation)) {
      setPhoneError("Введите номер в формате +7 900 123-45-67");
      return;
    }

    const normalized = normalizePhone(phoneForValidation);
    setPhoneError("");

    updatePayment({
      event: makeEvent(`Клиент ввёл номер ${formatPhone(phoneForValidation)}`, "info"),
      phone: normalized,
      status: "checking_phone",
    });

    window.setTimeout(() => {
      if (normalized !== ACTIVE_PHONE) {
        updatePayment({
          event: makeEvent("Ozon Bank по номеру клиента не найден", "error"),
          phone: normalized,
          status: "client_not_found",
        });
        return;
      }

      updatePayment({
        event: makeEvent("A3Pay отправил push в Ozon Bank", "info"),
        phone: normalized,
        pushAttempts: payment.pushAttempts + 1,
        status: "push_sent",
      });
    }, 700);
  };

  const openBankPayment = () => {
    updatePayment({
      event: makeEvent("Клиент открыл оплату из push", "warning"),
      status: "bank_launching",
    });
  };

  const confirmPayment = () => {
    updatePayment({
      event: makeEvent("Клиент подтвердил оплату в Ozon Bank", "success"),
      status: "paid",
    });
  };

  if (payment.status === "push_sent") {
    return <PushStatusScreen payment={payment} onBack={reset} onOpen={openBankPayment} />;
  }

  if (payment.status === "push_received") {
    return <PushStatusScreen payment={payment} onBack={reset} onOpen={openBankPayment} />;
  }

  if (payment.status === "bank_launching") {
    return <BankLaunchScreen updatePayment={updatePayment} />;
  }

  if (payment.status === "payment_opened") {
    return (
      <BankConfirmScreen
        payment={payment}
        onBack={() => updatePayment({ status: "push_sent" })}
        onConfirm={confirmPayment}
      />
    );
  }

  if (payment.status === "paid") {
    return <ReceiptScreen payment={payment} onReset={reset} />;
  }

  if (payment.status === "client_not_found") {
    return (
      <ClientShell onBack={reset}>
        <h1>Ozon Bank не найден</h1>
        <p className="a3pay-mobile-note">Fallback без тупика: поправить номер или перейти на QR/link.</p>
        <section className="a3pay-error-card">
          <span>номер не найден</span>
          <h2>Мы не нашли активный аккаунт Ozon Bank для этого телефона</h2>
          <p>Проверьте телефон или выберите QR/link. Деньги не списаны, запрос в банк не ушёл.</p>
        </section>
        <button className="a3pay-figma-button" type="button" onClick={reset}>
          Изменить номер телефона
        </button>
      </ClientShell>
    );
  }

  return (
    <ClientShell>
      <h1>Проверьте оплату</h1>
      <p className="a3pay-mobile-note">Пользователь видит, кому и сколько платит до ввода телефона.</p>
      <PaymentSummary payment={payment} />
      <section className="a3pay-phone-card">
        <label htmlFor="a3pay-client-phone">Телефон, привязанный к Ozon Bank</label>
        <div className="a3pay-phone-input-line">
          <span>+7</span>
          <input
            id="a3pay-client-phone"
            disabled={payment.status === "checking_phone"}
            inputMode="tel"
            onChange={(event) => setPhone(event.target.value)}
            value={phone.replace(/^\+7\s*/, "")}
          />
        </div>
        <p>{phoneError || "Мы отправим push в Ozon Bank. Деньги спишутся только после подтверждения в банке."}</p>
      </section>
      <div className="a3pay-mobile-spacer" />
      <section className="a3pay-bottom-bar">
        <div>
          <span>К оплате</span>
          <strong>{formatMoney(payment.amount)}</strong>
        </div>
        <button
          className="a3pay-figma-button"
          disabled={payment.status === "checking_phone"}
          onClick={requestPush}
          type="button"
        >
          {payment.status === "checking_phone" ? "Проверяем телефон" : "Отправить push на оплату"}
        </button>
      </section>
    </ClientShell>
  );
}

function ClientShell({
  children,
  onBack,
  title = "A3Pay",
}: {
  children: React.ReactNode;
  onBack?: () => void;
  title?: string;
}) {
  return (
    <main className="a3pay-mobile-branch" aria-label="A3Pay">
      <section className="a3pay-phone-surface">
        <MobileNavigationBar onBack={onBack} title={title} />
        {children}
      </section>
    </main>
  );
}

function MobileNavigationBar({ onBack, title }: { onBack?: () => void; title: string }) {
  return (
    <header className="a3pay-ios-navbar">
      <div className="a3pay-ios-navbar__side">
        {onBack ? (
          <button aria-label="Назад" onClick={onBack} type="button">
            <ChevronLeft aria-hidden="true" size={27} strokeWidth={2.1} />
          </button>
        ) : null}
      </div>
      <strong>{title}</strong>
      <div className="a3pay-ios-navbar__side" aria-hidden="true" />
    </header>
  );
}

function PushStatusScreen({
  onBack,
  onOpen,
  payment,
}: {
  onBack: () => void;
  onOpen: () => void;
  payment: DemoPayment;
}) {
  const [notificationVisible, setNotificationVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setNotificationVisible(true), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ClientShell onBack={onBack}>
      <h1>Push отправлен</h1>
      <p className="a3pay-mobile-note">Экран объясняет статус и не заставляет пользователя гадать.</p>
      <PaymentSummary payment={payment} />
      <section className="a3pay-push-status-card">
        <div className="a3pay-push-status-card__head">
          <span>↗</span>
          <div>
            <strong>Откройте push в Ozon Bank</strong>
            <small>Запрос активен ещё 04:32</small>
          </div>
        </div>
        <div className="a3pay-mobile-timeline">
          <p><span data-tone="success" />Запрос создан</p>
          <p><span data-tone="success" />Push отправлен на +7 900 ••-45-67</p>
          <p><span data-tone="warning" />Ожидаем подтверждение в Ozon Bank</p>
        </div>
      </section>
      <button
        className="a3pay-ios-notification"
        data-visible={notificationVisible}
        onClick={onOpen}
        type="button"
      >
        <span className="a3pay-ios-notification__icon">O</span>
        <span>
          <strong>Ozon Bank</strong>
          <small>Подтвердите оплату A3Pay</small>
          <em>{formatMoney(payment.amount)} · {payment.merchantName}</em>
        </span>
        <b>сейчас</b>
      </button>
    </ClientShell>
  );
}

function PaymentSummary({ payment }: { payment: DemoPayment }) {
  return (
    <section className="a3pay-payment-summary">
      <div className="a3pay-payment-summary__top">
        <span className="a3pay-rouble">₽</span>
        <div>
          <strong>{payment.merchantName}</strong>
          <small>Заказ #{payment.orderNumber} · оплата сегодня</small>
        </div>
        <b>{formatMoney(payment.amount)}</b>
      </div>
      <div className="a3pay-divider" />
      <span className="a3pay-blue-chip">через Ozon Bank</span>
    </section>
  );
}

function BankLaunchScreen({
  updatePayment,
}: {
  updatePayment: (patch: Partial<DemoPayment> & { event?: DemoEvent }) => void;
}) {
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      updatePayment({
        event: makeEvent("Ozon Bank открыл экран подтверждения", "info"),
        status: "payment_opened",
      });
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [updatePayment]);

  return (
    <ClientShell title="Ozon Bank">
      <section className="a3pay-bank-launch" aria-label="Открывается Ozon Bank">
        <span>O</span>
        <strong>Ozon Bank</strong>
        <div><i /></div>
      </section>
    </ClientShell>
  );
}

function BankConfirmScreen({
  onBack,
  onConfirm,
  payment,
}: {
  onBack: () => void;
  onConfirm: () => void;
  payment: DemoPayment;
}) {
  return (
    <ClientShell onBack={onBack} title="Ozon Bank">
      <h1>Подтвердите списание</h1>
      <p className="a3pay-mobile-note">Банковская поверхность: сумма, источник, получатель, действие.</p>
      <section className="a3pay-bank-hero">
        <span>Оплата A3Pay</span>
        <strong>{formatMoney(payment.amount)}</strong>
        <small>{payment.merchantName} · заказ #{payment.orderNumber}</small>
      </section>
      <KeyValueCard
        rows={[
          ["Списать со счёта", "Ozon Bank •• 0428"],
          ["Комиссия для вас", "0 ₽"],
          ["Получатель", payment.merchantName],
          ["ID операции", payment.id],
        ]}
      />
      <section className="a3pay-safety-note">
        <ShieldCheck size={20} />
        <span>Проверьте получателя и сумму. A3Pay не спишет деньги без подтверждения в банке.</span>
      </section>
      <div className="a3pay-mobile-spacer" />
      <section className="a3pay-bottom-bar">
        <div>
          <span>К оплате</span>
          <strong>{formatMoney(payment.amount)}</strong>
        </div>
        <button className="a3pay-figma-button" type="button" onClick={onConfirm}>
          Подтвердить оплату
        </button>
      </section>
    </ClientShell>
  );
}

function ReceiptScreen({ onReset, payment }: { onReset: () => void; payment: DemoPayment }) {
  return (
    <ClientShell onBack={onReset}>
      <h1>Оплата прошла</h1>
      <p className="a3pay-mobile-note">Receipt-style success: видно сумму, способ оплаты, чек и возврат в магазин.</p>
      <section className="a3pay-success-hero">
        <span>
          <Check size={30} />
        </span>
        <strong>{formatMoney(payment.amount)}</strong>
        <small>Заказ #{payment.orderNumber} оплачен</small>
      </section>
      <KeyValueCard
        rows={[
          ["Дата и время", "19.06, 18:44"],
          ["Способ оплаты", "Ozon Bank через A3Pay"],
          ["Номер операции", payment.id],
          ["Чек", "отправлен мерчанту"],
        ]}
      />
      <section className="a3pay-next-actions">
        <button className="a3pay-figma-button" type="button" onClick={onReset}>Вернуться в магазин</button>
        <button className="a3pay-figma-button a3pay-figma-button--outline" type="button">
          Скачать квитанцию
        </button>
      </section>
    </ClientShell>
  );
}

function KeyValueCard({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="a3pay-kv-card">
      {rows.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MerchantBranch({
  payment,
  updatePayment,
}: {
  payment: DemoPayment;
  updatePayment: (patch: Partial<DemoPayment> & { event?: DemoEvent }) => void;
}) {
  const [view, setView] = React.useState<"create" | "payment" | "registry">("create");
  const [phone, setPhone] = React.useState(payment.phone ? formatPhone(payment.phone) : "+7 900 123-45-67");
  const [phoneError, setPhoneError] = React.useState("");

  const checkAndSendPush = () => {
    if (!isValidPhone(phone)) {
      setPhoneError("Номер должен начинаться с +7 и содержать 11 цифр");
      return;
    }

    const normalized = normalizePhone(phone);
    setPhoneError("");
    setView("payment");

    updatePayment({
      event: makeEvent(`Мерчант проверяет номер ${formatPhone(phone)}`, "info"),
      phone: normalized,
      status: "checking_phone",
    });

    window.setTimeout(() => {
      if (normalized === NOT_FOUND_PHONE) {
        updatePayment({
          event: makeEvent("Клиент не найден по номеру телефона", "error"),
          phone: normalized,
          status: "client_not_found",
        });
        return;
      }

      updatePayment({
        event: makeEvent("Мерчант отправил push клиенту", "info"),
        phone: normalized,
        pushAttempts: payment.pushAttempts + 1,
        status: "push_sent",
      });
    }, 700);
  };

  const setMerchantStatus = (status: "push_sent" | "client_not_found" | "paid") => {
    const eventCopy = {
      client_not_found: makeEvent("Клиент не найден по номеру телефона", "error"),
      paid: makeEvent("Ozon Bank подтвердил списание", "success"),
      push_sent: makeEvent("Push отправлен клиенту", "info"),
    }[status];

    updatePayment({ event: eventCopy, status });
  };

  return (
    <main className="a3pay-merchant-product" aria-label="A3Pay Merchant">
      <section className="a3pay-merchant-surfaces">
        {view === "create" ? (
          <MerchantCreateSurface
            payment={payment}
            phone={phone}
            phoneError={phoneError}
            onPhoneChange={setPhone}
            onOpenRegistry={() => setView("registry")}
            onSubmit={checkAndSendPush}
          />
        ) : null}
        {view === "payment" ? (
          <MerchantStatusSurface
            payment={payment}
            onCreate={() => setView("create")}
            onOpenRegistry={() => setView("registry")}
            onStatusChange={setMerchantStatus}
          />
        ) : null}
        {view === "registry" ? (
          <MerchantDashboardSurface
            payment={payment}
            onCreate={() => setView("create")}
            onOpenPayment={() => setView("payment")}
          />
        ) : null}
      </section>
    </main>
  );
}

function MerchantCreateSurface({
  onPhoneChange,
  onOpenRegistry,
  onSubmit,
  payment,
  phone,
  phoneError,
}: {
  onPhoneChange: (value: string) => void;
  onOpenRegistry: () => void;
  onSubmit: () => void;
  payment: DemoPayment;
  phone: string;
  phoneError: string;
}) {
  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--create">
      <MerchantTopNav onOpenRegistry={onOpenRegistry} />
      <header className="a3pay-merchant-screen-header">
        <h1>Создать платёж A3Pay</h1>
        <p>Мерчант создаёт запрос: сумма, заказ, телефон клиента, fallback ссылка.</p>
      </header>
      <div className="a3pay-create-grid">
        <section className="a3pay-request-preview">
          <h2>Что увидит клиент</h2>
          <PaymentSummary payment={payment} />
        </section>
        <section className="a3pay-merchant-form-surface">
          <h2>Данные платежа</h2>
          <div className="a3pay-merchant-form-grid">
            <MerchantFormField label="Сумма" value={formatMoney(payment.amount)} />
            <MerchantFormField label="Описание" value="Абонемент FitSpace" />
            <label className="a3pay-merchant-inline-input">
              <span>Телефон клиента:</span>
              <input
                aria-label="Телефон клиента"
                disabled={payment.status === "checking_phone"}
                inputMode="tel"
                onChange={(event) => onPhoneChange(event.target.value)}
                value={phone}
              />
            </label>
            <MerchantFormField label="Сколько активен запрос" value="20 мин" />
          </div>
          {phoneError ? <p className="a3pay-merchant-form-error">{phoneError}</p> : null}
          <button
            className="a3pay-merchant-submit"
            disabled={payment.status === "checking_phone" || payment.status === "paid"}
            onClick={onSubmit}
            type="button"
          >
            {payment.status === "checking_phone" ? "Проверяем клиента" : "Создать запрос на оплату и отправить push в Ozon банк"}
          </button>
        </section>
      </div>
    </article>
  );
}

function MerchantStatusSurface({
  onCreate,
  onOpenRegistry,
  onStatusChange,
  payment,
}: {
  onCreate: () => void;
  onOpenRegistry: () => void;
  onStatusChange: (status: "push_sent" | "client_not_found" | "paid") => void;
  payment: DemoPayment;
}) {
  const variant = payment.status === "client_not_found" ? "phone_not_found" : payment.status === "paid" ? "paid" : "push_sent";
  const copy = {
    push_sent: {
      chip: "ожидает клиента",
      description: "Ожидаем подтверждение в Ozon Bank. Запрос активен ещё 04:32.",
      icon: "↗",
      title: "Push отправлен клиенту",
      tone: "warning",
    },
    phone_not_found: {
      chip: "phone_not_found",
      description: "Push не отправлен. Деньги не списаны, платёж не создан в банке.",
      icon: "!",
      title: "Клиент не найден",
      tone: "error",
    },
    paid: {
      chip: "paid",
      description: "Ozon Bank подтвердил списание. Мерчант может выдать товар/услугу.",
      icon: "✓",
      title: "Оплачено",
      tone: "success",
    },
  }[variant];

  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--status">
      <MerchantTopNav onOpenRegistry={onOpenRegistry} />
      <header className="a3pay-merchant-screen-header">
        <span>Реестр платежей / {payment.id}</span>
        <h1>Платёж {payment.id}</h1>
      </header>
      <section className="a3pay-status-switcher" aria-label="Переключить статус платежа">
        <span>Показать состояние</span>
        <div>
          <button data-active={variant === "push_sent"} onClick={() => onStatusChange("push_sent")} type="button">
            Push отправлен
          </button>
          <button data-active={variant === "phone_not_found"} onClick={() => onStatusChange("client_not_found")} type="button">
            Клиент не найден
          </button>
          <button data-active={variant === "paid"} onClick={() => onStatusChange("paid")} type="button">
            Оплачено
          </button>
        </div>
      </section>
      <div className="a3pay-merchant-status-column">
        <section className="a3pay-merchant-status-card" data-tone={copy.tone}>
          <div className="a3pay-merchant-status-summary">
            <strong className="a3pay-merchant-status-icon">{copy.icon}</strong>
            <div>
              <h2>{copy.title}</h2>
              <p>{copy.description}</p>
            </div>
            <span className="a3pay-status-pill">{copy.chip}</span>
          </div>
          <div className="a3pay-facts-grid">
            <MerchantField label="Сумма" value={variant === "phone_not_found" ? "8 900 ₽" : formatMoney(payment.amount)} />
            <MerchantField label="Клиент" value={variant === "phone_not_found" ? "+7 903 ••-90-02" : payment.phone ? maskPhone(payment.phone) : "+7 912 ••-04-11"} />
            <MerchantField label="Заказ мерчанта" value="ORD-2048" />
            <MerchantField label="Метод" value="Ozon Bank" />
          </div>
        </section>
        <section className="a3pay-timeline-card">
          <h2>История статусов по заказу</h2>
        {getMerchantTimeline(variant).map((event) => (
          <div className="a3pay-timeline-row" key={event.title}>
            <span data-tone={event.tone}>{event.icon}</span>
            <div>
              <strong>{event.title}</strong>
              <small>{event.meta}</small>
            </div>
          </div>
        ))}
        </section>
        <button className="a3pay-create-new-order" onClick={onCreate} type="button">Создать новый заказ</button>
      </div>
    </article>
  );
}

function MerchantDashboardSurface({
  onCreate,
  onOpenPayment,
  payment,
}: {
  onCreate: () => void;
  onOpenPayment: () => void;
  payment: DemoPayment;
}) {
  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--dashboard">
      <MerchantTopNav onCreate={onCreate} />
      <header className="a3pay-merchant-screen-header">
        <h1>Реестр платежей</h1>
        <p>Операционная поверхность: фильтры, статусы, спорные платежи и детали операции.</p>
      </header>
      <div className="a3pay-kpi-row">
        <Kpi label="Сегодня оплачено" value="248 900 ₽" hint="+12% к вчера" tone="success" />
        <Kpi label="Ожидают push" value="14" hint="проверить очередь" tone="warning" />
        <Kpi label="Ошибки номера" value="6" hint="нужна проверка номера" tone="error" />
        <Kpi label="Среднее подтверждение" value="43 сек" hint="норма" tone="info" />
      </div>
      <div className="a3pay-filters-row">
        <span><Search size={14} /> Поиск по ID / телефону</span>
        <span>Статус: все</span>
        <span>Метод: Ozon Bank</span>
        <span>Период: сегодня</span>
      </div>
      <div className="a3pay-payments-table" role="table" aria-label="Операции A3Pay">
        <div className="a3pay-table-head" role="row">
          <span>Номер заказа</span>
          <span>Клиент</span>
          <span>Сумма</span>
          <span>Статус</span>
          <span>Последнее событие</span>
          <span>Действие</span>
        </div>
        <PaymentRow action="Открыть" amount="12 480 ₽" client="+7 900 ••-45-67" event="Ozon Bank подтвердил · 18:42" id="pay_8F4C21" onOpen={onOpenPayment} status="оплачено" tone="paid" />
        <PaymentRow action="Напомнить" amount="4 300 ₽" client="+7 912 ••-04-11" event="Ждём подтверждение банка" id={payment.id} onOpen={onOpenPayment} status="отправлен в банк" tone="push_sent" />
        <PaymentRow action="Напомнить" amount="4 300 ₽" client="+7 912 ••-04-11" event="Ждём клиента · 03:12 осталось" id={payment.id} status="ожидает оплаты" tone="push_sent" />
        <PaymentRow action="Дать ссылку" amount="8 900 ₽" client="+7 903 ••-90-02" event="Ozon Bank не найден" id="pay_BD2019" status="клиент не найден" tone="phone_not_found" />
        <PaymentRow action="Создать заново" amount="2 750 ₽" client="+7 999 ••-88-10" event="Запрос истёк" id="pay_A8110C" status="не оплачен" tone="expired" />
      </div>
    </article>
  );
}

function MerchantTopNav({
  onCreate,
  onOpenRegistry,
}: {
  onCreate?: () => void;
  onOpenRegistry?: () => void;
}) {
  return (
    <nav className="a3pay-merchant-nav">
      {onCreate ? <button onClick={onCreate} type="button">Создать платёж</button> : null}
      {onOpenRegistry ? <button onClick={onOpenRegistry} type="button">Реестр платежей</button> : null}
    </nav>
  );
}

function MerchantFormField({ label, value }: { label: string; value: string }) {
  return (
    <div className="a3pay-merchant-form-field">
      <span>{label}:</span>
      <strong>{value}</strong>
    </div>
  );
}

function MerchantField({ label, value }: { label: string; value: string }) {
  return (
    <section className="a3pay-merchant-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function Kpi({ hint, label, tone, value }: { hint: string; label: string; tone: string; value: string }) {
  return (
    <section className="a3pay-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small data-tone={tone}>{hint}</small>
    </section>
  );
}

function PaymentRow({
  action,
  amount,
  client,
  event,
  id,
  onOpen,
  status,
  tone,
}: {
  action: string;
  amount: string;
  client: string;
  event: string;
  id: string;
  onOpen?: () => void;
  status: string;
  tone: string;
}) {
  const openFromKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onOpen && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      className="a3pay-table-row"
      data-actionable={Boolean(onOpen)}
      onClick={onOpen}
      onKeyDown={openFromKeyboard}
      role="row"
      tabIndex={onOpen ? 0 : undefined}
    >
      <span>{id}</span>
      <span>{client}</span>
      <span>{amount}</span>
      <span className="a3pay-table-chip" data-tone={tone}>{status}</span>
      <span>{event}</span>
      {onOpen ? <button className="a3pay-table-action" onClick={(event) => { event.stopPropagation(); onOpen(); }} type="button">{action}</button> : <strong>{action}</strong>}
    </div>
  );
}

function getTableStatus(status: DemoStatus) {
  if (status === "paid") {
    return "paid";
  }
  if (status === "client_not_found") {
    return "phone_not_found";
  }
  if (status === "expired") {
    return "expired";
  }
  if (status === "draft" || status === "checking_phone") {
    return "draft";
  }
  return "push_sent";
}

function getMerchantTimeline(variant: "push_sent" | "phone_not_found" | "paid") {
  if (variant === "paid") {
    return [
      { icon: "✓", meta: "18:37 · мерчант создал payment request", title: "Запрос оплаты создан", tone: "success" },
      { icon: "✓", meta: "18:38 · Ozon Bank принял запрос на доставку", title: "Push отправлен клиенту", tone: "success" },
      { icon: "✓", meta: "18:41 · клиент перешёл из уведомления", title: "Клиент открыл Ozon Bank", tone: "success" },
      { icon: "✓", meta: "18:42 · Ozon Bank подтвердил списание", title: "Платёж подтверждён", tone: "success" },
      { icon: "✓", meta: "18:42 · webhook доставлен мерчанту", title: "Статус передан мерчанту", tone: "success" },
    ];
  }
  if (variant === "phone_not_found") {
    return [
      { icon: "✓", meta: "18:37 · мерчант создал payment request", title: "Запрос оплаты создан", tone: "success" },
      { icon: "!", meta: "18:38 · Ozon Bank не нашёл активный аккаунт", title: "Ozon Bank не найден для телефона", tone: "error" },
      { icon: "!", meta: "18:38 · деньги не списаны, запрос не доставлен", title: "Push не отправлен", tone: "error" },
    ];
  }
  return [
    { icon: "✓", meta: "18:37 · мерчант создал payment request", title: "Запрос оплаты создан", tone: "success" },
    { icon: "✓", meta: "18:38 · Ozon Bank принял запрос на доставку", title: "Push отправлен", tone: "success" },
    { icon: "…", meta: "18:41 · истекает срок первого запроса", title: "Клиент не подтвердил оплату", tone: "warning" },
  ];
}

function maskPhone(value: string) {
  return formatPhone(value).replace(/(\+7 \d{3}) \d{3}-(\d{2})-(\d{2})/, "$1 ••-$2-$3");
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}
