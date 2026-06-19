import * as React from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import "./a3pay-demo.css";

type DemoStatus =
  | "draft"
  | "phone_entered"
  | "checking_phone"
  | "client_found"
  | "client_not_found"
  | "push_sent"
  | "push_received"
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
const NOT_FOUND_PHONE = "79030000002";

const statusCopy: Record<DemoStatus, { title: string; description: string; tone: DemoEvent["tone"] }> = {
  draft: {
    title: "Ожидает оплаты",
    description: "Заказ готов. Можно отправить запрос оплаты по телефону клиента.",
    tone: "neutral",
  },
  phone_entered: {
    title: "Телефон введён",
    description: "Номер принят, проверка клиента ещё не запущена.",
    tone: "info",
  },
  checking_phone: {
    title: "Проверяем клиента",
    description: "A3Pay ищет активный Ozon Bank по номеру телефона.",
    tone: "info",
  },
  client_found: {
    title: "Клиент найден",
    description: "Номер связан с Ozon Bank. Можно отправить push на оплату.",
    tone: "success",
  },
  client_not_found: {
    title: "Клиент не найден",
    description: "Проверьте телефон клиента или предложите другой способ оплаты.",
    tone: "error",
  },
  push_sent: {
    title: "Push отправлен",
    description: "Клиенту отправлен запрос на подтверждение оплаты.",
    tone: "info",
  },
  push_received: {
    title: "Push получен",
    description: "Клиент видит банковское уведомление на телефоне.",
    tone: "info",
  },
  payment_opened: {
    title: "Оплата открыта",
    description: "Клиент перешёл из push в экран подтверждения Ozon Bank.",
    tone: "warning",
  },
  paid: {
    title: "Оплачено",
    description: "Платёж подтверждён. Заказ можно выдавать клиенту.",
    tone: "success",
  },
  expired: {
    title: "Push истёк",
    description: "Клиент не открыл уведомление вовремя. Можно отправить повторно.",
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
    id: orderId,
    status: "draft",
    amount: 3490,
    merchantName: "Фитнес-клуб Balance",
    orderNumber: "ORD-2048",
    phone: "",
    pushAttempts: 0,
    updatedAt: Date.now(),
    events: [makeEvent("Заказ создан, оплата ожидает запуска", "neutral")],
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
    updatedAt: Date.now(),
    events: patch.event ? [patch.event, ...current.events].slice(0, 10) : current.events,
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
          // ignore malformed demo state
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

  return { payment, updatePayment, reset };
}

function getRoleFromPath(pathname: string): DemoRole {
  return pathname.includes("/merchant/orders/") ? "merchant" : "client";
}

function getOrderIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? DEFAULT_ORDER_ID;
}

export function A3PayDemo() {
  const pathname = window.location.pathname;
  const role = getRoleFromPath(pathname);
  const orderId = role === "merchant" ? getOrderIdFromPath(pathname) : pathname.includes("/pay/") ? getOrderIdFromPath(pathname) : DEFAULT_ORDER_ID;
  const demo = useDemoPayment(orderId);

  if (role === "merchant") {
    return <MerchantOrderView {...demo} />;
  }

  return <ClientPaymentView {...demo} />;
}

function ClientPaymentView({
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

  React.useEffect(() => {
    if (payment.status === "push_sent") {
      const timer = window.setTimeout(() => {
        updatePayment({
          status: "push_received",
          event: makeEvent("Push доставлен на телефон клиента", "info"),
        });
      }, 650);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [payment.status, updatePayment]);

  const requestPush = () => {
    if (!isValidPhone(phone)) {
      setPhoneError("Введите номер в формате +7 900 123-45-67");
      return;
    }

    const normalized = normalizePhone(phone);
    setPhoneError("");

    updatePayment({
      phone: normalized,
      status: "checking_phone",
      event: makeEvent(`Клиент ввёл номер ${formatPhone(phone)}`, "info"),
    });

    window.setTimeout(() => {
      if (normalized === NOT_FOUND_PHONE) {
        updatePayment({
          phone: normalized,
          status: "client_not_found",
          event: makeEvent("Ozon Bank по номеру клиента не найден", "error"),
        });
        return;
      }

      updatePayment({
        phone: normalized,
        status: "push_sent",
        pushAttempts: payment.pushAttempts + 1,
        event: makeEvent("A3Pay отправил push в Ozon Bank", "info"),
      });
    }, 700);
  };

  const openBankPayment = () => {
    updatePayment({
      status: "payment_opened",
      event: makeEvent("Клиент открыл оплату из push", "warning"),
    });
  };

  const confirmPayment = () => {
    updatePayment({
      status: "paid",
      event: makeEvent("Клиент подтвердил оплату в Ozon Bank", "success"),
    });
  };

  if (payment.status === "payment_opened") {
    return (
      <main className="a3pay-client-app a3pay-client-app--bank">
        <BankPaymentScreen payment={payment} onConfirm={confirmPayment} />
      </main>
    );
  }

  if (payment.status === "paid") {
    return (
      <main className="a3pay-client-app">
        <ClientSuccessScreen payment={payment} onReset={reset} />
      </main>
    );
  }

  const showPush = payment.status === "push_sent" || payment.status === "push_received";

  if (showPush) {
    return (
      <main className="a3pay-lockscreen">
        <div className="a3pay-lockscreen__status">
          <span>9:41</span>
          <span>5G 100%</span>
        </div>
        <section className="a3pay-lockscreen__center">
          <strong>9:41</strong>
          <span>сегодня, 19 июня</span>
        </section>
        <button className="a3pay-bank-push" type="button" onClick={openBankPayment}>
          <span className="a3pay-bank-push__icon">O</span>
          <span>
            <strong>Ozon Bank</strong>
            <small>Подтвердите оплату A3Pay</small>
            <em>{payment.amount.toLocaleString("ru-RU")} ₽ · {payment.merchantName}</em>
          </span>
        </button>
        <div className="a3pay-lockscreen__home" />
      </main>
    );
  }

  return (
    <main className="a3pay-client-app">
      <StatusBar />
      <section className="a3pay-client-summary">
        <div>
          <span>Заказ {payment.orderNumber}</span>
          <h1>{payment.merchantName}</h1>
        </div>
        <strong>{payment.amount.toLocaleString("ru-RU")} ₽</strong>
      </section>

      <section className="a3pay-client-card">
        <div className="a3pay-pay-method">
          <span className="a3pay-pay-method__logo">A3</span>
          <div>
            <strong>A3Pay</strong>
            <small>Запрос оплаты в Ozon Bank</small>
          </div>
          <CheckCircle2 size={20} />
        </div>

        <Input
          invalid={Boolean(phoneError)}
          label="Номер телефона"
          hint={phoneError || "На этот номер придёт push из банковского приложения"}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          inputMode="tel"
          leftIcon={<Smartphone size={18} />}
          disabled={payment.status === "checking_phone"}
        />

        {payment.status === "client_not_found" ? (
          <div className="a3pay-inline-error">
            <XCircle size={19} />
            <span>Клиент не найден. Проверьте номер или выберите другой способ оплаты.</span>
          </div>
        ) : (
          <div className="a3pay-client-note">
            <ShieldCheck size={19} />
            <span>После отправки откроется банковское уведомление для подтверждения оплаты.</span>
          </div>
        )}

        <Button
          size="l"
          className="a3pay-client-primary"
          onClick={requestPush}
          disabled={payment.status === "checking_phone"}
          leadingIcon={payment.status === "checking_phone" ? <Loader2 size={18} className="a3pay-spin" /> : <Bell size={18} />}
        >
          {payment.status === "checking_phone" ? "Проверяем номер" : "Получить push для оплаты"}
        </Button>
      </section>
    </main>
  );
}

function StatusBar() {
  return (
    <div className="a3pay-statusbar">
      <span>9:41</span>
      <span>5G 100%</span>
    </div>
  );
}

function BankPaymentScreen({ onConfirm, payment }: { onConfirm: () => void; payment: DemoPayment }) {
  return (
    <section className="a3pay-bank-screen">
      <StatusBar />
      <div className="a3pay-bank-screen__brand">
        <span>O</span>
        <div>
          <strong>Ozon Bank</strong>
          <small>Подтверждение оплаты</small>
        </div>
      </div>

      <div className="a3pay-bank-screen__amount">
        <span>К оплате</span>
        <strong>{payment.amount.toLocaleString("ru-RU")} ₽</strong>
      </div>

      <dl className="a3pay-details-list">
        <div>
          <dt>Получатель</dt>
          <dd>{payment.merchantName}</dd>
        </div>
        <div>
          <dt>Заказ</dt>
          <dd>{payment.orderNumber}</dd>
        </div>
        <div>
          <dt>Телефон</dt>
          <dd>{formatPhone(payment.phone)}</dd>
        </div>
      </dl>

      <Button size="l" className="a3pay-client-primary" onClick={onConfirm} leadingIcon={<Check size={18} />}>
        Подтвердить оплату
      </Button>
    </section>
  );
}

function ClientSuccessScreen({ onReset, payment }: { onReset: () => void; payment: DemoPayment }) {
  return (
    <section className="a3pay-client-success">
      <StatusBar />
      <span className="a3pay-success-orb">
        <Check size={34} />
      </span>
      <h1>Оплата прошла</h1>
      <p>
        Заказ {payment.orderNumber} на сумму {payment.amount.toLocaleString("ru-RU")} ₽ оплачен.
      </p>
      <Button variant="outline" size="m" onClick={onReset} leadingIcon={<RotateCcw size={16} />}>
        Новая оплата
      </Button>
    </section>
  );
}

function MerchantOrderView({
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

  const checkAndSendPush = () => {
    if (!isValidPhone(phone)) {
      setPhoneError("Номер должен начинаться с +7 и содержать 11 цифр");
      return;
    }

    const normalized = normalizePhone(phone);
    setPhoneError("");

    updatePayment({
      phone: normalized,
      status: "checking_phone",
      event: makeEvent(`Мерчант проверяет номер ${formatPhone(phone)}`, "info"),
    });

    window.setTimeout(() => {
      if (normalized === NOT_FOUND_PHONE) {
        updatePayment({
          phone: normalized,
          status: "client_not_found",
          event: makeEvent("Клиент не найден по номеру телефона", "error"),
        });
        return;
      }

      updatePayment({
        phone: normalized,
        status: "push_sent",
        pushAttempts: payment.pushAttempts + 1,
        event: makeEvent("Мерчант отправил push клиенту", "info"),
      });
    }, 700);
  };

  const sendPushAgain = () => {
    updatePayment({
      status: "push_sent",
      pushAttempts: payment.pushAttempts + 1,
      event: makeEvent("Мерчант повторно отправил push клиенту", "info"),
    });
  };

  const expirePush = () => {
    updatePayment({
      status: "expired",
      event: makeEvent("Push истёк: клиент не открыл уведомление", "warning"),
    });
  };

  const markAsPaid = () => {
    updatePayment({
      status: "paid",
      event: makeEvent("Оплата отмечена как успешная", "success"),
    });
  };

  return (
    <main className="a3pay-merchant-page">
      <header className="a3pay-merchant-topbar">
        <div className="a3pay-merchant-brand">A3Pay</div>
        <div>
          <span>Заказ</span>
          <strong>{payment.orderNumber}</strong>
        </div>
        <StatusBadge status={payment.status} />
      </header>

      <section className="a3pay-merchant-layout">
        <article className="a3pay-merchant-card a3pay-merchant-card--wide">
          <div className="a3pay-merchant-title">
            <div>
              <span>{payment.merchantName}</span>
              <h1>Создание платежа</h1>
            </div>
            <strong>{payment.amount.toLocaleString("ru-RU")} ₽</strong>
          </div>

          <div className="a3pay-merchant-form">
            <Input label="ID заказа" value={payment.orderNumber} readOnly />
            <Input label="Сумма" value={`${payment.amount.toLocaleString("ru-RU")} ₽`} readOnly />
            <Input
              invalid={Boolean(phoneError)}
              label="Телефон клиента"
              hint={phoneError || "Например: +7 900 123-45-67"}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              leftIcon={<Smartphone size={18} />}
              disabled={payment.status === "checking_phone"}
            />
          </div>

          <div className="a3pay-merchant-actions">
            <Button
              size="l"
              onClick={checkAndSendPush}
              disabled={payment.status === "checking_phone" || payment.status === "paid"}
              leadingIcon={payment.status === "checking_phone" ? <Loader2 size={18} className="a3pay-spin" /> : <Send size={18} />}
            >
              {payment.status === "checking_phone" ? "Проверяем клиента" : "Проверить и отправить push"}
            </Button>
            <Button
              variant="outline"
              size="l"
              onClick={sendPushAgain}
              aria-label="Повторить запрос оплаты"
              disabled={payment.status !== "push_sent" && payment.status !== "push_received" && payment.status !== "expired"}
              leadingIcon={<RefreshCw size={18} />}
            >
              Повторить запрос
            </Button>
          </div>
        </article>

        <article className="a3pay-merchant-card">
          <h2>Статус платежа</h2>
          <StatusPanel status={payment.status} />

          {payment.status === "client_not_found" ? (
            <div className="a3pay-merchant-state a3pay-merchant-state--error">
              <XCircle size={32} />
              <strong>Клиент не найден</strong>
              <span>Номер не связан с активным Ozon Bank.</span>
            </div>
          ) : null}

          {payment.status === "paid" ? (
            <div className="a3pay-merchant-state a3pay-merchant-state--success">
              <CheckCircle2 size={32} />
              <strong>Оплачено</strong>
              <span>Клиент подтвердил платёж в приложении банка.</span>
            </div>
          ) : null}

          <div className="a3pay-merchant-mini-actions">
            <Button variant="outline" size="m" onClick={expirePush} disabled={payment.status !== "push_sent" && payment.status !== "push_received"}>
              Истёк timeout
            </Button>
            <Button variant="outline" size="m" onClick={markAsPaid} disabled={payment.status === "paid"}>
              Отметить успех
            </Button>
            <Button variant="outline" size="m" onClick={reset} leadingIcon={<RotateCcw size={16} />}>
              Сбросить
            </Button>
          </div>
        </article>

        <article className="a3pay-merchant-card">
          <h2>Детали заказа</h2>
          <dl className="a3pay-details-list">
            <div>
              <dt>Payment ID</dt>
              <dd>{payment.id}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{formatPhone(payment.phone)}</dd>
            </div>
            <div>
              <dt>Попытки push</dt>
              <dd>{payment.pushAttempts}</dd>
            </div>
            <div>
              <dt>Обновлено</dt>
              <dd>{new Date(payment.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</dd>
            </div>
          </dl>
        </article>

        <article className="a3pay-merchant-card">
          <h2>История событий</h2>
          <ol className="a3pay-event-list">
            {payment.events.map((event) => (
              <li key={event.id} data-tone={event.tone}>
                <span>{event.time}</span>
                <p>{event.label}</p>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  );
}

function StatusPanel({ status }: { status: DemoStatus }) {
  const copy = statusCopy[status];
  const Icon = getStatusIcon(status);

  return (
    <section className="a3pay-status-panel" data-tone={copy.tone}>
      <span className="a3pay-status-panel__icon">
        <Icon size={22} />
      </span>
      <div>
        <strong>{copy.title}</strong>
        <p>{copy.description}</p>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DemoStatus }) {
  const copy = statusCopy[status];
  const Icon = getStatusIcon(status);

  return (
    <span className="a3pay-status-badge" data-tone={copy.tone}>
      <Icon size={15} />
      {copy.title}
    </span>
  );
}

function getStatusIcon(status: DemoStatus) {
  if (status === "paid") {
    return CheckCircle2;
  }

  if (status === "client_not_found") {
    return XCircle;
  }

  if (status === "checking_phone") {
    return Search;
  }

  if (status === "push_sent" || status === "push_received") {
    return Bell;
  }

  if (status === "expired") {
    return AlertCircle;
  }

  if (status === "payment_opened") {
    return CreditCard;
  }

  return Clock3;
}
