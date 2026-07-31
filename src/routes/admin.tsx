import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronLeft,
  ExternalLink,
  LogOut,
  MousePointerClick,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { NurProvider, useNur } from "@/lib/nur-context";
import { Button, Card, SectionTitle, Spinner, Stat } from "@/components/nur/ui";
import {
  adminAddChannel,
  adminDeleteChannel,
  adminLogin,
  adminOverview,
  adminToggleChannel,
} from "@/lib/nur.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Nur Sahifa" },
      { name: "description", content: "Nur Sahifa kanallari, foydalanuvchi statistikasi va o'sish ko'rsatkichlarini boshqarish paneli." },
      { property: "og:title", content: "Admin panel — Nur Sahifa" },
      { property: "og:description", content: "Kanallar, obunachilar va faollik statistikasi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <NurProvider>
      <main className="mx-auto min-h-screen w-full max-w-2xl px-4 pt-4 pb-16">
        <AdminGate />
      </main>
    </NurProvider>
  ),
});

const TOKEN_KEY = "nur.admin.token";

function AdminGate() {
  const { initData, ready } = useNur();
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem(TOKEN_KEY));
  }, []);

  if (!ready) return <Spinner />;
  if (initData) return <AdminPanel auth={{ initData }} />;
  if (token)
    return (
      <AdminPanel
        auth={{ token }}
        onLogout={() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        }}
      />
    );

  return (
    <div className="space-y-4 pt-10">
      <div className="text-center">
        <div className="grad-cool mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl">
          <ShieldCheck className="h-8 w-8 text-accent-foreground" />
        </div>
        <h1 className="text-xl font-bold">Admin panel</h1>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Telegram botga <span className="font-semibold">/admin</span> deb yozing va olingan 6 xonali
          kodni kiriting.
        </p>
      </div>
      <Card className="space-y-3">
        <input
          value={code}
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-center text-2xl font-bold tracking-[0.4em] outline-none focus:border-primary"
        />
        <Button
          disabled={code.length !== 6 || busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await adminLogin({ data: { code } });
              localStorage.setItem(TOKEN_KEY, res.token);
              setToken(res.token);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Xatolik");
            } finally {
              setBusy(false);
            }
          }}
        >
          Kirish
        </Button>
      </Card>
      <a
        href="https://t.me/nursahifa_bot"
        target="_blank"
        rel="noreferrer"
        className="ios-card flex items-center gap-3 p-4"
      >
        <span className="min-w-0 flex-1 truncate font-semibold">Botni ochish</span>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
    </div>
  );
}

type Auth = { initData?: string; token?: string };

const PIE = ["hsl(var(--chart-1, 25 95% 53%))", "hsl(var(--muted-foreground))"];

function AdminPanel({ auth, onLogout }: { auth: Auth; onLogout?: () => void }) {
  const { tr } = useNur();
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");

  const overview = useQuery({
    queryKey: ["admin", auth.initData ?? auth.token],
    queryFn: () => adminOverview({ data: auth }),
    retry: false,
  });

  if (overview.error) {
    return (
      <Card className="mt-16 py-10 text-center">
        <p className="font-semibold">403</p>
        <p className="mt-1 text-sm text-muted-foreground">{String(overview.error.message)}</p>
        {onLogout ? (
          <button onClick={onLogout} className="mt-4 text-sm font-semibold text-primary">
            Chiqish
          </button>
        ) : null}
      </Card>
    );
  }

  const data = overview.data;
  if (!data) return <Spinner />;

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      await overview.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("error"));
    }
  }

  const growthUp = data.growthPct >= 0;
  const pieData = [
    { name: "Obuna bo'lgan", value: data.subscribed },
    { name: "Obuna bo'lmagan", value: data.unsubscribed },
  ];
  const chartDays = data.days.map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {auth.initData ? (
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <h1 className="flex-1 text-lg font-bold">{tr("admin")}</h1>
        {onLogout ? (
          <button
            onClick={onLogout}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat value={data.users} label={tr("users")} />
        <Stat value={data.subscribed} label="Obunachi" tone="text-success" />
        <Stat value={data.activeToday} label="Bugun faol" tone="text-accent" />
        <Stat value={data.cards} label={tr("cardsCount")} tone="text-primary" />
      </div>

      <Card className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Oxirgi 7 kun yangi foydalanuvchi</p>
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
              growthUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}
          >
            {growthUp ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {data.growthPct}%
          </span>
        </div>
        <p className="text-3xl font-bold">{data.last7}</p>
        <p className="text-xs text-muted-foreground">Oldingi 7 kun: {data.prev7}</p>
      </Card>

      <SectionTitle>O'sish (30 kun)</SectionTitle>
      <Card className="h-56 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartDays}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} width={24} allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="users"
              name="Yangi foydalanuvchi"
              className="text-primary"
              stroke="currentColor"
              fill="url(#g1)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle>Kunlik faollik</SectionTitle>
      <Card className="h-48 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartDays}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={5} />
            <YAxis tick={{ fontSize: 10 }} width={24} allowDecimals={false} />
            <Tooltip />
            <Bar
              dataKey="events"
              name="Harakatlar"
              className="text-accent"
              fill="currentColor"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <SectionTitle>Obuna holati</SectionTitle>
      <Card className="flex items-center gap-3 p-3">
        <div className="h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={64} paddingAngle={2}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "var(--primary)" : "var(--muted)"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-primary" /> Obuna bo'lgan:{" "}
            <b>{data.subscribed}</b>
          </p>
          <p className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-muted" /> Obuna bo'lmagan:{" "}
            <b>{data.unsubscribed}</b>
          </p>
          <p className="text-xs text-muted-foreground">
            Konversiya:{" "}
            {data.users ? Math.round((data.subscribed / data.users) * 100) : 0}%
          </p>
        </div>
      </Card>

      <SectionTitle>Kanal linklari bosilishi</SectionTitle>
      <div className="space-y-2.5">
        {data.channelClicks.length === 0 ? (
          <Card className="py-6 text-center text-sm text-muted-foreground">Hozircha ma'lumot yo'q</Card>
        ) : (
          data.channelClicks.map((c) => (
            <div key={c.username} className="ios-card flex items-center gap-3 p-4">
              <MousePointerClick className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-semibold">@{c.username}</span>
              <span className="shrink-0 text-sm font-bold">{c.clicks}</span>
            </div>
          ))
        )}
      </div>

      <SectionTitle>Funksiyalar bo'yicha bosilishlar</SectionTitle>
      <div className="ios-card overflow-hidden">
        {data.eventCounts.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Hozircha ma'lumot yo'q</p>
        ) : (
          data.eventCounts.map((e, i) => (
            <div
              key={e.type}
              className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate font-medium">{eventLabel(e.type)}</span>
              <span className="shrink-0 text-sm font-bold">{e.count}</span>
            </div>
          ))
        )}
      </div>

      <SectionTitle>Eng faol foydalanuvchilar</SectionTitle>
      <div className="ios-card overflow-hidden">
        {data.topUsers.map((u, i) => (
          <div
            key={u.telegram_id}
            className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{u.first_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.username ? (
                  <a
                    href={`https://t.me/${u.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary"
                  >
                    @{u.username}
                  </a>
                ) : (
                  `ID: ${u.telegram_id}`
                )}
              </p>
            </div>
            <span className="shrink-0 text-sm font-bold">{u.actions}</span>
          </div>
        ))}
      </div>

      <SectionTitle>Oxirgi harakatlar</SectionTitle>
      <div className="ios-card overflow-hidden">
        {data.recentEvents.map((e, i) => (
          <div
            key={`${e.telegram_id}-${e.created_at}-${i}`}
            className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {eventLabel(e.type)}
                {e.target ? ` · @${e.target}` : ""}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {e.username ? (
                  <a
                    href={`https://t.me/${e.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary"
                  >
                    @{e.username}
                  </a>
                ) : (
                  `ID: ${e.telegram_id}`
                )}
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {new Date(e.created_at).toLocaleString("uz-UZ", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>

      <SectionTitle>Yangi foydalanuvchilar</SectionTitle>
      <div className="ios-card overflow-hidden">
        {data.recentUsers.map((u, i) => (
          <div
            key={u.telegram_id}
            className={`flex items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{u.first_name ?? "—"}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.username ? (
                  <a
                    href={`https://t.me/${u.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary"
                  >
                    @{u.username}
                  </a>
                ) : (
                  `ID: ${u.telegram_id}`
                )}{" "}
                · {u.lang}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                u.subscribed ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              }`}
            >
              {u.subscribed ? "obuna" : "yo'q"}
            </span>
          </div>
        ))}
      </div>

      <SectionTitle>{tr("addChannel")}</SectionTitle>
      <Card className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@kanal yoki https://t.me/kanal"
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={tr("channelTitle")}
          className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-[15px] outline-none focus:border-primary"
        />
        <Button
          disabled={!username.trim()}
          onClick={() =>
            run(async () => {
              await adminAddChannel({
                data: { ...auth, username, title: title.trim() || undefined },
              });
              setUsername("");
              setTitle("");
              toast.success("Kanal qo'shildi");
            })
          }
        >
          <Plus className="h-4 w-4" /> {tr("save")}
        </Button>
      </Card>

      <SectionTitle>{tr("adminChannels")}</SectionTitle>
      <div className="space-y-2.5 pb-6">
        {data.channels.map((ch) => (
          <div key={ch.id} className="ios-card flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ch.title}</p>
              <a
                href={ch.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-xs text-primary"
              >
                @{ch.username}
              </a>
            </div>
            <button
              onClick={() =>
                run(() => adminToggleChannel({ data: { ...auth, id: ch.id, active: !ch.active } }))
              }
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                ch.active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              }`}
            >
              {ch.active ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => run(() => adminDeleteChannel({ data: { ...auth, id: ch.id } }))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    channel_click: "Kanal linki bosilgan",
    sub_ok: "Obuna tasdiqlandi",
    sub_missing: "Obuna yetishmadi",
    open_app: "Ilova ochildi",
    scan: "Skan qilindi",
    word_add: "So'z qo'shildi",
    quiz: "Test ishlandi",
    review: "Takrorlash",
  };
  return map[type] ?? type;
}
