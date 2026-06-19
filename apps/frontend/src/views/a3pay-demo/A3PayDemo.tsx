import * as React from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
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

type DemoRole = "client" | "merchant";

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
    <main className="a3pay-mobile-branch" aria-label="A3Pay">
      <section className="a3pay-phone-surface">
        <div className="a3pay-topbar">
          <span className="a3pay-mark">A3</span>
          <div>
            <strong>A3Pay</strong>
            <span>{subtitle}</span>
          </div>
        </div>
        {children}
      </section>
    </main>
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

function LockScreen({ onOpen, payment }: { onOpen: () => void; payment: DemoPayment }) {
  return (
    <main className="a3pay-mobile-branch" aria-label="A3Pay">
      <section className="a3pay-lockscreen-v4">
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
      </section>
    </main>
  );
}

function BankConfirmScreen({ onConfirm, payment }: { onConfirm: () => void; payment: DemoPayment }) {
  return (
    <ClientShell subtitle="Ozon Bank">
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
  updatePayment,
}: {
  payment: DemoPayment;
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

  return (
    <main className="a3pay-merchant-product" aria-label="A3Pay Merchant">
      <section className="a3pay-merchant-surfaces">
        <MerchantCreateSurface
          payment={payment}
          phone={phone}
          phoneError={phoneError}
          onPhoneChange={setPhone}
          onSubmit={checkAndSendPush}
        />
        <MerchantDetailSurface payment={payment} />
        <MerchantDashboardSurface payment={payment} />
      </section>
    </main>
  );
}

function MerchantCreateSurface({
  onPhoneChange,
  onSubmit,
  payment,
  phone,
  phoneError,
}: {
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
  payment: DemoPayment;
  phone: string;
  phoneError: string;
}) {
  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--create">
      <MerchantTopNav />
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
          <MerchantField label="Сумма" value={formatMoney(payment.amount)} />
          <MerchantField label="Описание" value="Абонемент FitSpace" />
          <Input
            disabled={payment.status === "checking_phone"}
            hint={phoneError || "Push уйдёт в Ozon Bank после проверки номера."}
            inputMode="tel"
            invalid={Boolean(phoneError)}
            label="Телефон клиента"
            leftIcon={<Smartphone size={18} />}
            onChange={(event) => onPhoneChange(event.target.value)}
            value={phone}
          />
          <MerchantField label="Сколько активен запрос" value="20 мин" />
          <Button
            disabled={payment.status === "checking_phone" || payment.status === "paid"}
            leadingIcon={payment.status === "checking_phone" ? <Loader2 className="a3pay-spin" size={18} /> : <Send size={18} />}
            onClick={onSubmit}
            size="l"
          >
            {payment.status === "checking_phone" ? "Проверяем клиента" : "Создать запрос на оплату и отправить push в Ozon банк"}
          </Button>
        </section>
      </div>
    </article>
  );
}

function MerchantDetailSurface({ payment }: { payment: DemoPayment }) {
  const isError = payment.status === "client_not_found";
  const isPaid = payment.status === "paid";
  const title = isError ? "Клиент не найден" : isPaid ? "Платёж оплачен" : "Push отправлен клиенту";
  const description = isError
    ? "Номер не связан с активным Ozon Bank."
    : isPaid
      ? "Webhook подтвердил оплату, заказ можно отдавать клиенту."
      : "Ожидаем подтверждение в Ozon Bank. Запрос активен ещё 04:32.";
  const tone = isError ? "error" : isPaid ? "success" : "warning";

  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--detail">
      <MerchantTopNav />
      <header className="a3pay-merchant-screen-header">
        <span>Реестр платежей / {payment.id}</span>
        <h1>Платёж {payment.id}</h1>
      </header>
      <section className="a3pay-merchant-status-card" data-tone={tone}>
        {isError ? <XCircle size={30} /> : isPaid ? <CheckCircle2 size={30} /> : <Bell size={30} />}
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <StatusPill status={payment.status} />
      </section>
      <div className="a3pay-facts-grid">
        <MerchantField label="Сумма" value={formatMoney(payment.amount)} />
        <MerchantField label="Клиент" value={payment.phone ? maskPhone(payment.phone) : "+7 900 ••-45-67"} />
        <MerchantField label="Заказ мерчанта" value={`ORD-${payment.orderNumber}`} />
        <MerchantField label="Метод" value="Ozon Bank" />
      </div>
      <section className="a3pay-timeline-card">
        <h2>История событий</h2>
        {getMerchantTimeline(payment).map((event) => (
          <div className="a3pay-timeline-row" key={event}>
            <span />
            <strong>{event}</strong>
          </div>
        ))}
      </section>
    </article>
  );
}

function MerchantDashboardSurface({ payment }: { payment: DemoPayment }) {
  return (
    <article className="a3pay-merchant-screen a3pay-merchant-screen--dashboard">
      <MerchantTopNav />
      <header className="a3pay-merchant-screen-header">
        <h1>Операции A3Pay</h1>
        <p>Реестр платежей показывает статус клиента, push и webhook без ручной сверки с банком.</p>
      </header>
      <div className="a3pay-kpi-row">
        <Kpi label="Сегодня оплачено" value={payment.status === "paid" ? "1 248 000 ₽" : "1 235 520 ₽"} hint="+12% к вчера" />
        <Kpi label="Ожидают push" value={payment.status === "paid" ? "7" : "8"} hint="проверить очередь" />
        <Kpi label="Ошибки номера" value={payment.status === "client_not_found" ? "4" : "3"} hint="нужен fallback" />
        <Kpi label="Среднее подтверждение" value="42 сек" hint="норма" />
      </div>
      <div className="a3pay-filters-row">
        <span><Search size={16} /> Поиск по ID / телефону</span>
        <span>Статус: все</span>
        <span>Метод: Ozon Bank</span>
        <span>Период: сегодня</span>
      </div>
      <div className="a3pay-payments-table" role="table" aria-label="Операции A3Pay">
        <div className="a3pay-table-head" role="row">
          <span>ID</span>
          <span>Клиент</span>
          <span>Сумма</span>
          <span>Статус</span>
          <span>Последнее событие</span>
          <span>Действие</span>
        </div>
        <PaymentRow
          action={payment.status === "client_not_found" ? "fallback" : "Открыть"}
          amount={formatMoney(payment.amount)}
          client={payment.phone ? maskPhone(payment.phone) : "+7 900 ••-45-67"}
          event={statusCopy[payment.status].description}
          id={payment.id}
          status={getTableStatus(payment.status)}
        />
        <PaymentRow action="Открыть" amount="8 200 ₽" client="+7 911 ••-22-10" event="Ожидаем подтверждение клиента" id="pay_91A0EE" status="push_sent" />
        <PaymentRow action="Повторить" amount="4 900 ₽" client="+7 916 ••-18-30" event="Webhook 200 OK" id="pay_91A0ED" status="paid" />
        <PaymentRow action="fallback" amount="2 400 ₽" client="+7 903 ••-00-02" event="Номер не связан с Ozon Bank" id="pay_91A0EC" status="phone_not_found" />
      </div>
    </article>
  );
}

function MerchantTopNav() {
  return (
    <nav className="a3pay-merchant-nav">
      <strong>A3Pay merchant</strong>
      <span>Ozon Bank</span>
    </nav>
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

function Kpi({ hint, label, value }: { hint: string; label: string; value: string }) {
  return (
    <section className="a3pay-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </section>
  );
}

function PaymentRow({
  action,
  amount,
  client,
  event,
  id,
  status,
}: {
  action: string;
  amount: string;
  client: string;
  event: string;
  id: string;
  status: string;
}) {
  return (
    <div className="a3pay-table-row" role="row">
      <span>{id}</span>
      <span>{client}</span>
      <span>{amount}</span>
      <span className="a3pay-table-chip">{status}</span>
      <span>{event}</span>
      <strong>{action}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: DemoStatus }) {
  return <span className="a3pay-status-pill">{getTableStatus(status)}</span>;
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

function getMerchantTimeline(payment: DemoPayment) {
  if (payment.status === "paid") {
    return ["Запрос оплаты создан", "Push отправлен", "Клиент подтвердил оплату", "Webhook обновил заказ"];
  }
  if (payment.status === "client_not_found") {
    return ["Запрос оплаты создан", "Проверка номера завершилась ошибкой", "Клиент не найден"];
  }
  return ["Запрос оплаты создан", "Push отправлен", "Ожидаем подтверждение в Ozon Bank"];
}

function maskPhone(value: string) {
  return formatPhone(value).replace(/(\+7 \d{3}) \d{3}-(\d{2})-(\d{2})/, "$1 ••-$2-$3");
}

function formatMoney(amount: number) {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}
