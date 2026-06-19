import * as React from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
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
  | "checking_phone"
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

type DemoRole = "hub" | "client" | "merchant";

const DEFAULT_ORDER_ID = "pay_91A0EF";
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

const rows = [
  { order: "#A3-2048", phone: "+7 900 **-45-67", status: "pending_user_action", webhook: "ожидает", amount: "12 480 ₽" },
  { order: "#A3-2047", phone: "+7 911 **-22-10", status: "delivery_unknown", webhook: "retry через 1 мин", amount: "8 200 ₽" },
  { order: "#A3-2046", phone: "+7 916 **-18-30", status: "succeeded", webhook: "200 OK", amount: "4 900 ₽" },
  { order: "#A3-2045", phone: "+7 903 **-00-02", status: "expired", webhook: "не отправлять дубль", amount: "2 400 ₽" },
];

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
  return "hub";
}

function getOrderIdFromPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.at(-1) ?? DEFAULT_ORDER_ID;
}

function getOrderId(role: DemoRole, pathname: string) {
  if (role === "hub") {
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

  if (role === "client") {
    return <ClientBranch {...demo} />;
  }

  return <DemoHub payment={demo.payment} reset={demo.reset} />;
}

function DemoHub({ payment, reset }: { payment: DemoPayment; reset: () => void }) {
  return (
    <main className="a3pay-hub">
      <section className="a3pay-hub__panel">
        <div className="a3pay-hub__eyebrow">A3Pay × Ozon Bank</div>
        <h1>Две ветки демо из Figma v4</h1>
        <p>
          Клиентская ветка повторяет mobile flow: телефон, push, подтверждение в Ozon Bank, чек и recovery.
          Мерчантская ветка повторяет web flow: создание payment_intent и реестр платежей.
        </p>
        <div className="a3pay-hub__links">
          <a href={`/a3pay-demo/pay/${payment.id}`}>A3Pay Demo MVP</a>
          <a href={`/a3pay-demo/merchant/orders/${payment.id}`}>A3Pay Demo MVP Merchant</a>
        </div>
        <Button variant="outline" size="m" onClick={reset} leadingIcon={<RotateCcw size={16} />}>
          Сбросить demo state
        </Button>
      </section>
    </main>
  );
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

  React.useEffect(() => {
    if (payment.status === "push_sent") {
      const timer = window.setTimeout(() => {
        updatePayment({
          event: makeEvent("Push показан на экране клиента", "info"),
          status: "push_received",
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
      event: makeEvent(`Клиент ввёл номер ${formatPhone(phone)}`, "info"),
      phone: normalized,
      status: "checking_phone",
    });

    window.setTimeout(() => {
      if (normalized === NOT_FOUND_PHONE) {
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
      status: "payment_opened",
    });
  };

  const confirmPayment = () => {
    updatePayment({
      event: makeEvent("Клиент подтвердил оплату в Ozon Bank", "success"),
      status: "paid",
    });
  };

  if (payment.status === "push_sent" || payment.status === "push_received") {
    return <LockScreen payment={payment} onOpen={openBankPayment} />;
  }

  if (payment.status === "payment_opened") {
    return <BankConfirmScreen payment={payment} onConfirm={confirmPayment} />;
  }

  if (payment.status === "paid") {
    return <ReceiptScreen payment={payment} onReset={reset} />;
  }

  if (payment.status === "client_not_found") {
    return (
      <ClientShell subtitle="Recovery">
        <ScreenChip>Screen 05</ScreenChip>
        <h1>Ozon Bank не найден</h1>
        <p className="a3pay-mobile-note">Показываем понятный fallback без обещания, которого банк ещё не подтвердил.</p>
        <section className="a3pay-error-card">
          <span>номер не найден</span>
          <h2>Не получилось отправить push</h2>
          <p>Проверьте телефон или выберите другой способ оплаты. Новый платёж не создаётся, пока текущий запрос не закрыт.</p>
        </section>
        <Button size="l" className="a3pay-client-primary" onClick={reset}>
          Изменить номер телефона
        </Button>
        <section className="a3pay-merchant-note">
          <strong>Что увидит мерчант</strong>
          <span>Статус `delivery_unknown` или `expired`, без автоматического дубля payment_intent.</span>
        </section>
      </ClientShell>
    );
  }

  return (
    <ClientShell subtitle="Оплата по номеру телефона">
      <ScreenChip>Screen 01</ScreenChip>
      <h1>Проверьте оплату</h1>
      <p className="a3pay-mobile-note">Пользователь видит, кому и сколько платит до ввода телефона.</p>
      <PaymentSummary payment={payment} />
      <section className="a3pay-phone-card">
        <Input
          disabled={payment.status === "checking_phone"}
          hint={phoneError || "Мы отправим push в Ozon Bank. Деньги спишутся только после подтверждения в банке."}
          inputMode="tel"
          invalid={Boolean(phoneError)}
          label="Телефон, привязанный к Ozon Bank"
          leftIcon={<Smartphone size={18} />}
          onChange={(event) => setPhone(event.target.value)}
          value={phone}
        />
      </section>
      <div className="a3pay-mobile-spacer" />
      <section className="a3pay-bottom-bar">
        <div>
          <span>К оплате</span>
          <strong>{formatMoney(payment.amount)}</strong>
        </div>
        <Button
          disabled={payment.status === "checking_phone"}
          leadingIcon={payment.status === "checking_phone" ? <Loader2 className="a3pay-spin" size={18} /> : <Bell size={18} />}
          onClick={requestPush}
          size="l"
        >
          {payment.status === "checking_phone" ? "Проверяем телефон" : "Отправить push на оплату"}
        </Button>
      </section>
    </ClientShell>
  );
}

function ClientShell({ children, subtitle }: { children: React.ReactNode; subtitle: string }) {
  return (
    <main className="a3pay-mobile-branch" aria-label="A3Pay Demo MVP">
      <section className="a3pay-phone-frame">
        <div className="a3pay-phone-surface">
          <div className="a3pay-topbar">
            <span className="a3pay-mark">A3</span>
            <div>
              <strong>A3Pay</strong>
              <span>{subtitle}</span>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function ScreenChip({ children }: { children: React.ReactNode }) {
  return <span className="a3pay-screen-chip">{children}</span>;
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

function LockScreen({ onOpen, payment }: { onOpen: () => void; payment: DemoPayment }) {
  return (
    <main className="a3pay-mobile-branch" aria-label="A3Pay Demo MVP">
      <section className="a3pay-phone-frame">
        <div className="a3pay-lockscreen-v4">
          <div className="a3pay-lockscreen-v4__status">
            <span>18:42</span>
            <span>5G 100%</span>
          </div>
          <div className="a3pay-lockscreen-v4__time">
            <strong>18:42</strong>
            <span>пятница, 19 июня</span>
          </div>
          <p className="a3pay-lockscreen-v4__hint">A3Pay ожидает подтверждение в банке</p>
          <button className="a3pay-bank-push" type="button" onClick={onOpen}>
            <span className="a3pay-bank-push__icon">O</span>
            <span>
              <strong>Ozon Bank</strong>
              <small>Запрос на оплату A3Pay</small>
              <em>{formatMoney(payment.amount)} · {payment.merchantName}</em>
            </span>
            <ExternalLink size={18} />
          </button>
          <div className="a3pay-lockscreen-v4__home" />
        </div>
      </section>
    </main>
  );
}

function BankConfirmScreen({ onConfirm, payment }: { onConfirm: () => void; payment: DemoPayment }) {
  return (
    <ClientShell subtitle="Ozon Bank">
      <ScreenChip>Screen 03</ScreenChip>
      <h1>Подтвердите оплату</h1>
      <p className="a3pay-mobile-note">Банк показывает сумму, получателя, комиссию и ID операции до списания.</p>
      <section className="a3pay-bank-hero">
        <span>Сумма</span>
        <strong>{formatMoney(payment.amount)}</strong>
        <small>{payment.merchantName}</small>
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
        <Button size="l" onClick={onConfirm} leadingIcon={<Check size={18} />}>
          Подтвердить оплату
        </Button>
      </section>
    </ClientShell>
  );
}

function ReceiptScreen({ onReset, payment }: { onReset: () => void; payment: DemoPayment }) {
  return (
    <ClientShell subtitle="Оплата завершена">
      <ScreenChip>Screen 04</ScreenChip>
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
        <Button size="l" onClick={onReset}>Вернуться в магазин</Button>
        <Button variant="outline" size="l" leadingIcon={<Copy size={16} />}>Скачать квитанцию</Button>
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

  const sendPushAgain = () => {
    updatePayment({
      event: makeEvent("Мерчант повторно отправил push клиенту", "info"),
      pushAttempts: payment.pushAttempts + 1,
      status: "push_sent",
    });
  };

  const expirePush = () => {
    updatePayment({
      event: makeEvent("Push истёк: клиент не открыл уведомление", "warning"),
      status: "expired",
    });
  };

  const markAsPaid = () => {
    updatePayment({
      event: makeEvent("Webhook обновил платёж как успешный", "success"),
      status: "paid",
    });
  };

  return (
    <main className="a3pay-merchant-branch" aria-label="A3Pay Demo MVP Merchant">
      <header className="a3pay-merchant-header">
        <div>
          <span>A3Pay Demo MVP Merchant</span>
          <h1>Платежи и статусы</h1>
          <p>Мерчант видит, где находится оплата: запрос, ожидание клиента, банк, webhook.</p>
        </div>
        <StatusBadge status={payment.status} />
      </header>

      <section className="a3pay-merchant-grid">
        <article className="a3pay-merchant-panel a3pay-merchant-panel--create">
          <div className="a3pay-merchant-panel__heading">
            <div>
              <span>Screen 10</span>
              <h2>Создание платежа</h2>
            </div>
            <strong>{formatMoney(payment.amount)}</strong>
          </div>
          <p className="a3pay-merchant-muted">
            Мерчант создаёт заказ, A3Pay собирает телефон на checkout или получает его с согласием клиента.
          </p>
          <div className="a3pay-merchant-form-v4">
            <Input label="merchant_order_id" value={payment.orderNumber} readOnly />
            <Input label="amount" value={formatMoney(payment.amount)} readOnly />
            <Input label="phone_mode" value="collect_on_a3pay_checkout" readOnly />
            <Input
              disabled={payment.status === "checking_phone"}
              hint={phoneError || "Если номер передаёт мерчант, нужно согласие клиента."}
              inputMode="tel"
              invalid={Boolean(phoneError)}
              label="Телефон клиента"
              leftIcon={<Smartphone size={18} />}
              onChange={(event) => setPhone(event.target.value)}
              value={phone}
            />
          </div>
          <section className="a3pay-items-table">
            <strong>Позиции чека</strong>
            <span>Абонемент FitSpace • 12 480 ₽ • НДС 20% • quantity 1</span>
            <span>TTL: 15 минут · return_url · webhook_url · merchant_order_id</span>
          </section>
          <div className="a3pay-merchant-actions">
            <Button
              disabled={payment.status === "checking_phone" || payment.status === "paid"}
              leadingIcon={payment.status === "checking_phone" ? <Loader2 className="a3pay-spin" size={18} /> : <Send size={18} />}
              onClick={checkAndSendPush}
              size="l"
            >
              {payment.status === "checking_phone" ? "Проверяем клиента" : "Отправить push"}
            </Button>
            <Button
              disabled={payment.status !== "push_sent" && payment.status !== "push_received" && payment.status !== "expired"}
              leadingIcon={<RefreshCw size={18} />}
              onClick={sendPushAgain}
              size="l"
              variant="outline"
            >
              Повторить запрос
            </Button>
          </div>
          <section className="a3pay-risk-card">
            <strong>Риск MVP</strong>
            <span>Без подтверждённого API Ozon Bank телефонный push остаётся partner-dependent. QR/ссылка нужны как recovery.</span>
          </section>
        </article>

        <article className="a3pay-merchant-panel a3pay-merchant-panel--dashboard">
          <div className="a3pay-merchant-panel__heading">
            <div>
              <span>Screen 11</span>
              <h2>Payments dashboard statuses</h2>
            </div>
            <Button variant="outline" size="m" onClick={reset} leadingIcon={<RotateCcw size={16} />}>
              Сбросить
            </Button>
          </div>
          <div className="a3pay-kpi-row">
            <Kpi label="pending_user_action" value={payment.status === "paid" ? "0" : "1"} />
            <Kpi label="succeeded" value={payment.status === "paid" ? "1" : "12"} />
            <Kpi label="webhook health" value={payment.status === "paid" ? "200 OK" : "ожидает"} />
          </div>
          <div className="a3pay-status-table" role="table" aria-label="Платежи и статусы">
            <div className="a3pay-status-table__head" role="row">
              <span>order</span>
              <span>phone</span>
              <span>status</span>
              <span>webhook</span>
              <span>amount</span>
            </div>
            <PaymentRow
              amount={formatMoney(payment.amount)}
              order={`#${payment.orderNumber}`}
              phone={payment.phone ? formatPhone(payment.phone).replace(/\d{2}-\d{2}$/, "**-**") : "+7 900 **-45-67"}
              status={statusCopy[payment.status].title}
              webhook={payment.status === "paid" ? "200 OK" : payment.status === "client_not_found" ? "нет клиента" : "ожидает"}
            />
            {rows.slice(1).map((row) => (
              <PaymentRow key={row.order} {...row} />
            ))}
          </div>
          {payment.status === "client_not_found" ? (
            <section className="a3pay-merchant-state a3pay-merchant-state--error">
              <XCircle size={26} />
              <strong>Клиент не найден</strong>
              <span>Номер не связан с активным Ozon Bank.</span>
            </section>
          ) : null}
          {payment.status === "paid" ? (
            <section className="a3pay-merchant-state a3pay-merchant-state--success">
              <CheckCircle2 size={26} />
              <strong>Оплачено</strong>
              <span>Клиент подтвердил платёж в приложении банка.</span>
            </section>
          ) : null}
          <div className="a3pay-merchant-mini-actions">
            <Button variant="outline" size="m" onClick={expirePush} disabled={payment.status !== "push_sent" && payment.status !== "push_received"}>
              Истёк timeout
            </Button>
            <Button variant="outline" size="m" onClick={markAsPaid} disabled={payment.status === "paid"}>
              Отметить успех
            </Button>
          </div>
          <div className="a3pay-merchant-rule-row">
            <section>
              <strong>Правило против дублей</strong>
              <span>Не создавать новую попытку при pending. Повтор — после expired/failed или действия клиента.</span>
            </section>
            <section>
              <strong>Webhook health</strong>
              <span>Показывать last_webhook_at, attempts, response_code, next_retry_at.</span>
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <section className="a3pay-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

function PaymentRow({
  amount,
  order,
  phone,
  status,
  webhook,
}: {
  amount: string;
  order: string;
  phone: string;
  status: string;
  webhook: string;
}) {
  return (
    <div className="a3pay-status-table__row" role="row">
      <span>{order}</span>
      <span>{phone}</span>
      <span>{status}</span>
      <span>{webhook}</span>
      <span>{amount}</span>
    </div>
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
    return Clock3;
  }
  return ShieldCheck;
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}
