import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { NurProvider, useNur } from "@/lib/nur-context";
import { Button, Card, SectionTitle, Spinner, Stat } from "@/components/nur/ui";
import {
  adminAddChannel,
  adminDeleteChannel,
  adminOverview,
  adminToggleChannel,
} from "@/lib/nur.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin panel — Nur Sahifa" },
      { name: "description", content: "Nur Sahifa kanallari va statistikasini boshqarish paneli." },
      { property: "og:title", content: "Admin panel — Nur Sahifa" },
      { property: "og:description", content: "Kanallar va foydalanuvchi statistikasi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <NurProvider>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pt-4 pb-16">
        <AdminPanel />
      </main>
    </NurProvider>
  ),
});

function AdminPanel() {
  const { tr, initData, ready } = useNur();
  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");

  const overview = useQuery({
    queryKey: ["admin", initData],
    enabled: ready && initData.length > 0,
    queryFn: () => adminOverview({ data: { initData } }),
  });

  if (overview.error) {
    return (
      <Card className="mt-16 py-10 text-center">
        <p className="font-semibold">403</p>
        <p className="mt-1 text-sm text-muted-foreground">{String(overview.error.message)}</p>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold">{tr("admin")}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat value={data.users} label={tr("users")} />
        <Stat value={data.cards} label={tr("cardsCount")} tone="text-primary" />
      </div>

      <SectionTitle>{tr("addChannel")}</SectionTitle>
      <Card className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={tr("channelUsername")}
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
                data: { initData, username, title: title.trim() || undefined },
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
      <div className="space-y-2.5">
        {data.channels.map((ch) => (
          <div key={ch.id} className="ios-card flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{ch.title}</p>
              <p className="truncate text-xs text-muted-foreground">@{ch.username}</p>
            </div>
            <button
              onClick={() =>
                run(() => adminToggleChannel({ data: { initData, id: ch.id, active: !ch.active } }))
              }
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                ch.active ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              }`}
            >
              {ch.active ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => run(() => adminDeleteChannel({ data: { initData, id: ch.id } }))}
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
