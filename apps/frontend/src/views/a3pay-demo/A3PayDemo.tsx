import * as React from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Store,
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

type DemoRole = "hub" | "client" | "merchant";

const DEFAULT_ORDER_ID = "pay_91A0EF";
const SUCCESS_PHONE = "79001234567";
const NOT_FOUND_PHONE = "79030000002";

const statusCopy: Record<DemoStatus, { title: string; description: string; tone: DemoEvent["tone"] }> = {
  draft: {
    title: "Ожидает запуска оплаты",
    description: "Заказ создан. Можно проверить телефон клиента и отправить push.",
    tone: "neutral",
  },
  phone_entered: {
    title: "Телефон введён",
    description: "Номер принят в форму, проверка ещё не запущена.",
    tone: "info",
  },
  checking_phone: {
    title: "Проверяем клиента",
    description: "Имитируем поиск Ozon Bank по номеру телефона.",
    tone: "info",
  },
  client_found: {
    title: "Клиент найден",
    description: "По номеру найден активный Ozon Bank. Можно отправить push.",
    tone: "success",
  },
  client_not_found: {
    title: "Клиент не найден",
    description: "По этому номеру не найден Ozon Bank. Нужно исправить номер или дать другой способ оплаты.",
    tone: "error",
  },
  push_sent: {
    title: "Push отправлен",
    description: "Ожидаем, что клиент откроет уведомление в приложении банка.",
    tone: "info",
  },
  push_received: {
    title: "Push получен",
    description: "Клиент видит уведомление и может открыть оплату.",
    tone: "info",
  },
  payment_opened: {
    title: "Оплата открыта",
    description: "Клиент перешёл в экран подтверждения платежа.",
    tone: "warning",
  },
  paid: {
    title: "Оплачено",
    description: "Платёж успешно подтверждён. Заказ можно выдавать клиенту.",
    tone: "success",
  },
  expired: {
    title: "Push истёк",
    description: "Клиент не открыл уведомление вовремя. Можно отправить push повторно.",
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
    events: patch.event ? [patch.event, ...current.events].slice(0, 8) : current.events,
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
  if (pathname.includes("/merchant/orders/")) {
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

export function A3PayDemo() {
  const pathname = window.location.pathname;
  const role = getRoleFromPath(pathname);
  const orderId = role === "hub" ? DEFAULT_ORDER_ID : getOrderIdFromPath(pathname);
  const demo = useDemoPayment(orderId);

  if (role === "client") {
    return <ClientPaymentView {...demo} />;
  }

  if (role === "merchant") {
    return <MerchantOrderView {...demo} />;
  }

  return <DemoHub payment={demo.payment} reset={demo.reset} />;
}

function DemoHub({ payment, reset }: { payment: DemoPayment; reset: () => void }) {
  const clientPath = `/a3pay-demo/pay/${payment.id}`;
  const merchantPath = `/a3pay-demo/merchant/orders/${payment.id}`;

  return (
    <main className="a3pay-demo-shell a3pay-demo-shell--hub">
      <section className="a3pay-hub">
        <div className="a3pay-hub__eyebrow">A3Pay demo-MVP</div>
        <h1>Живая демо-оплата через телефон и push</h1>
        <p>
          Откройте клиентскую ссылку как мобильный экран, а мерчантскую — как веб-страницу заказа.
          Вкладки синхронизируются через mock-state браузера.
        </p>

        <div className="a3pay-hub__cards">
          <DemoLinkCard
            icon={<Smartphone />}
            title="Клиентская ссылка"
            description="Оплата с телефона: ввод номера, push, экран банка и успешное подтверждение."
            href={clientPath}
          />
          <DemoLinkCard
            icon={<Store />}
            title="Мерчантская ссылка"
            description="Страница заказа: проверка клиента, отправка push, статусы и действия оператора."
            href={merchantPath}
          />
        </div>

        <div className="a3pay-hub__rules">
          <div>
            <span>Успешный номер</span>
            <strong>+7 900 123-45-67</strong>
          </div>
          <div>
            <span>Клиент не найден</span>
            <strong>+7 903 000-00-02</strong>
          </div>
          <Button variant="outline" size="m" onClick={reset} leadingIcon={<RotateCcw size={16} />}>
            Сбросить демо
          </Button>
        </div>
      </section>
    </main>
  );
}

function DemoLinkCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <a className="a3pay-link-card" href={href} target="_blank" rel="noreferrer">
      <span className="a3pay-link-card__icon">{icon}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      <em>
        Открыть <ExternalLink size={15} />
      </em>
    </a>
  );
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
  const [phone, setPhone] = React.useState(payment.phone || "+7 900 123-45-67");
  const [phoneError, setPhoneError] = React.useState("");

  React.useEffect(() => {
    if (payment.status === "push_sent") {
      const timer = window.setTimeout(() => {
        updatePayment({
          status: "push_received",
          event: makeEvent("Push доставлен на клиентское устройство", "info"),
        });
      }, 700);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [payment.status, updatePayment]);

  const startClientFlow = () => {
    if (!isValidPhone(phone)) {
      setPhoneError("Введите российский номер в формате +7 900 123-45-67");
      return;
    }

    setPhoneError("");
    updatePayment({
      phone: normalizePhone(phone),
      status: "checking_phone",
      event: makeEvent(`Клиент ввёл номер ${formatPhone(phone)}`, "info"),
    });

    window.setTimeout(() => {
      const normalized = normalizePhone(phone);

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
    }, 900);
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

  const status = statusCopy[payment.status];
  const showPush = payment.status === "push_sent" || payment.status === "push_received";

  return (
    <main className="a3pay-demo-shell a3pay-demo-shell--client">
      <section className="a3pay-phone">
        <div className="a3pay-phone__statusbar">
          <span>9:41</span>
          <span>5G 100%</span>
        </div>

        <div className="a3pay-phone__content">
          {payment.status === "payment_opened" ? (
            <BankPaymentScreen payment={payment} onConfirm={confirmPayment} />
          ) : payment.status === "paid" ? (
            <ClientSuccessScreen payment={payment} onReset={reset} />
          ) : (
            <>
              <div className="a3pay-mobile-hero">
                <div>
                  <span className="a3pay-kicker">Оплата заказа</span>
                  <h1>{payment.merchantName}</h1>
                  <p>Заказ {payment.orderNumber}</p>
                </div>
                <strong>{payment.amount.toLocaleString("ru-RU")} ₽</strong>
              </div>

              <div className="a3pay-mobile-card">
                <div className="a3pay-method">
                  <span className="a3pay-method__logo">A3</span>
                  <div>
                    <strong>A3Pay</strong>
                    <span>Оплата через push в банк</span>
                  </div>
                  <CheckCircle2 size={20} />
                </div>

                <Input
                  invalid={Boolean(phoneError)}
                  label="Номер телефона"
                  hint={phoneError || "Для демо: +7 900 123-45-67 — успех, +7 903 000-00-02 — клиент не найден"}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  leftIcon={<Smartphone size={18} />}
                  disabled={payment.status === "checking_phone"}
                />

                <Button
                  size="l"
                  className="a3pay-mobile-card__button"
                  onClick={startClientFlow}
                  disabled={payment.status === "checking_phone"}
                  leadingIcon={payment.status === "checking_phone" ? <Loader2 size={18} className="a3pay-spin" /> : <Bell size={18} />}
                >
                  {payment.status === "checking_phone" ? "Проверяем номер" : "Получить push для оплаты"}
                </Button>
              </div>

              <StatusPanel status={payment.status} compact />

              {payment.status === "client_not_found" ? (
                <div className="a3pay-mobile-warning">
                  <XCircle size={20} />
                  <span>Проверьте номер или выберите другой способ оплаты у продавца.</span>
                </div>
              ) : null}
            </>
          )}
        </div>

        {showPush ? (
          <button className="a3pay-bank-push" type="button" onClick={openBankPayment}>
            <span className="a3pay-bank-push__icon">O</span>
            <span>
              <strong>Ozon Bank</strong>
              <small>{status.title}</small>
              <em>Подтвердите оплату {payment.amount.toLocaleString("ru-RU")} ₽ · {payment.merchantName}</em>
            </span>
          </button>
        ) : null}
      </section>
    </main>
  );
}

function BankPaymentScreen({ onConfirm, payment }: { onConfirm: () => void; payment: DemoPayment }) {
  return (
    <section className="a3pay-bank-screen">
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

      <div className="a3pay-bank-screen__notice">
        <ShieldCheck size={20} />
        <span>Это демонстрация: деньги не списываются, API банка не вызывается.</span>
      </div>

      <Button size="l" onClick={onConfirm} leadingIcon={<Check size={18} />}>
        Подтвердить оплату
      </Button>
    </section>
  );
}

function ClientSuccessScreen({ onReset, payment }: { onReset: () => void; payment: DemoPayment }) {
  return (
    <section className="a3pay-client-success">
      <span className="a3pay-success-orb">
        <Check size={34} />
      </span>
      <h1>Оплата прошла</h1>
      <p>
        Заказ {payment.orderNumber} на сумму {payment.amount.toLocaleString("ru-RU")} ₽ оплачен.
        Продавец уже видит статус.
      </p>
      <Button variant="outline" size="m" onClick={onReset} leadingIcon={<RotateCcw size={16} />}>
        Начать заново
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
  const status = statusCopy[payment.status];

  const runCheckAndPush = () => {
    if (!isValidPhone(phone)) {
      setPhoneError("Номер должен начинаться с +7 и содержать 11 цифр");
      return;
    }

    const normalized = normalizePhone(phone);
    setPhoneError("");
    updatePayment({
      phone: normalized,
      status: "checking_phone",
      event: makeEvent(`Мерчант запустил проверку номера ${formatPhone(phone)}`, "info"),
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
    }, 900);
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
      event: makeEvent("Оплата отмечена как успешная в демо", "success"),
    });
  };

  return (
    <main className="a3pay-demo-shell a3pay-demo-shell--merchant">
      <section className="a3pay-merchant-app">
        <aside className="a3pay-merchant-sidebar">
          <div className="a3pay-merchant-logo">A3</div>
          <nav>
            <a className="is-active" href="/a3pay-demo/merchant/orders/pay_91A0EF">
              Заказы
            </a>
            <a href="/a3pay-demo">Демо-ссылки</a>
            <a href="/a3pay-demo/pay/pay_91A0EF" target="_blank" rel="noreferrer">
              Клиентский экран
            </a>
          </nav>
        </aside>

        <section className="a3pay-merchant-main">
          <header className="a3pay-merchant-header">
            <div>
              <span>Заказ {payment.orderNumber}</span>
              <h1>Оплата через A3Pay</h1>
            </div>
            <Button variant="outline" size="m" onClick={reset} leadingIcon={<RotateCcw size={16} />}>
              Сбросить демо
            </Button>
          </header>

          <div className="a3pay-merchant-grid">
            <section className="a3pay-merchant-card a3pay-merchant-card--primary">
              <div className="a3pay-order-summary">
                <div>
                  <span className="a3pay-kicker">Сумма заказа</span>
                  <strong>{payment.amount.toLocaleString("ru-RU")} ₽</strong>
                  <p>{payment.merchantName}</p>
                </div>
                <StatusBadge status={payment.status} />
              </div>

              <StatusPanel status={payment.status} />

              <div className="a3pay-merchant-actions">
                <Input
                  invalid={Boolean(phoneError)}
                  label="Телефон клиента"
                  hint={phoneError || "Для успешного сценария: +7 900 123-45-67. Для ошибки: +7 903 000-00-02"}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  inputMode="tel"
                  leftIcon={<Smartphone size={18} />}
                  disabled={payment.status === "checking_phone"}
                />

                <Button
                  size="l"
                  onClick={runCheckAndPush}
                  disabled={payment.status === "checking_phone" || payment.status === "paid"}
                  leadingIcon={payment.status === "checking_phone" ? <Loader2 size={18} className="a3pay-spin" /> : <Send size={18} />}
                >
                  {payment.status === "checking_phone" ? "Проверяем клиента" : payment.pushAttempts > 0 ? "Повторить push" : "Проверить и отправить push"}
                </Button>

                <div className="a3pay-merchant-action-row">
                  <Button variant="outline" size="m" onClick={expirePush} disabled={payment.status !== "push_sent" && payment.status !== "push_received"}>
                    Истёк timeout
                  </Button>
                  <Button variant="outline" size="m" onClick={markAsPaid} disabled={payment.status === "paid"}>
                    Отметить успех
                  </Button>
                </div>
              </div>
            </section>

            <section className="a3pay-merchant-card">
              <h2>Данные платежа</h2>
              <dl className="a3pay-details-list">
                <div>
                  <dt>Payment ID</dt>
                  <dd>{payment.id}</dd>
                </div>
                <div>
                  <dt>Заказ мерчанта</dt>
                  <dd>{payment.orderNumber}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd>{formatPhone(payment.phone)}</dd>
                </div>
                <div>
                  <dt>Push попыток</dt>
                  <dd>{payment.pushAttempts}</dd>
                </div>
              </dl>
            </section>

            <section className="a3pay-merchant-card">
              <h2>События</h2>
              <ol className="a3pay-event-list">
                {payment.events.map((event) => (
                  <li key={event.id} data-tone={event.tone}>
                    <span>{event.time}</span>
                    <p>{event.label}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="a3pay-merchant-card">
              <h2>Что видит клиент</h2>
              <div className="a3pay-client-preview">
                {payment.status === "client_not_found" ? (
                  <>
                    <XCircle size={34} />
                    <strong>Клиент не найден</strong>
                    <span>Номер не связан с активным Ozon Bank.</span>
                  </>
                ) : payment.status === "paid" ? (
                  <>
                    <CheckCircle2 size={34} />
                    <strong>Оплата прошла</strong>
                    <span>Клиент подтвердил списание в банке.</span>
                  </>
                ) : payment.status === "push_sent" || payment.status === "push_received" ? (
                  <>
                    <Bell size={34} />
                    <strong>Push на телефоне</strong>
                    <span>Клиент может открыть уведомление и оплатить.</span>
                  </>
                ) : (
                  <>
                    <Clock3 size={34} />
                    <strong>Ожидание</strong>
                    <span>Оплата ещё не запущена.</span>
                  </>
                )}
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusPanel({ compact = false, status }: { compact?: boolean; status: DemoStatus }) {
  const copy = statusCopy[status];
  const Icon = getStatusIcon(status);

  return (
    <section className="a3pay-status-panel" data-tone={copy.tone} data-compact={compact ? "true" : undefined}>
      <span className="a3pay-status-panel__icon">
        <Icon size={compact ? 18 : 22} />
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
