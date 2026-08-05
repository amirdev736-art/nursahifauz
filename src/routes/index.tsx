import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Layers, Target, User } from "lucide-react";
import { NurProvider, useNur } from "@/lib/nur-context";
import { Gate } from "@/components/nur/Gate";
import { ScanTab } from "@/components/nur/ScanTab";
import { CardsTab } from "@/components/nur/CardsTab";
import { QuizTab } from "@/components/nur/QuizTab";
import { ProfileTab } from "@/components/nur/ProfileTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nur Sahifa — kitobdan so'z yodlash ilovasi" },
      {
        name: "description",
        content:
          "Kitob sahifasini suratga oling, so'zlarni tarjima qiling va interval takrorlash orqali yodlang. Telegram Mini App.",
      },
      { property: "og:title", content: "Nur Sahifa — kitobdan so'z yodlash" },
      {
        property: "og:description",
        content: "Rasmdan matn, kartochkalar, aqlli takrorlash va testlar — bitta Mini App'da.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <NurProvider>
      <main className="mx-auto min-h-screen w-full max-w-md px-4 pt-4 pb-28">
        <Gate>
          <Tabs />
        </Gate>
      </main>
    </NurProvider>
  );
}

type TabKey = "scan" | "cards" | "quiz" | "profile";

function Tabs() {
  const { tr } = useNur();
  const [tab, setTab] = useState<TabKey>("scan");

  const items = [
    { key: "scan" as const, icon: Camera, label: tr("scan") },
    { key: "cards" as const, icon: Layers, label: tr("cards") },
    { key: "quiz" as const, icon: Target, label: tr("quiz") },
    { key: "profile" as const, icon: User, label: tr("profile") },
  ];

  return (
    <>
      {tab === "scan" && <ScanTab onGoToSwipe={() => setTab("cards")} />}
      {tab === "cards" && <CardsTab />}
      {tab === "quiz" && <QuizTab />}
      {tab === "profile" && <ProfileTab />}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/70 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => setTab(it.key)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 transition-colors",
                tab === it.key ? "text-accent" : "text-muted-foreground",
              )}
            >
              {tab === it.key ? (
                <span className="grad-cool absolute top-0 h-[2px] w-8 rounded-full shadow-[var(--glow-blue)]" />
              ) : null}
              <it.icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  tab === it.key && "scale-110 drop-shadow-[0_0_8px_var(--color-accent)]",
                )}
              />
              <span className="text-[10px] font-semibold">{it.label}</span>
            </button>
          ))}
        </div>
      </nav>

    </>
  );
}
