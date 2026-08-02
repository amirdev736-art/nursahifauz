import { Check, Crown, Gift, Sparkles, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { ADMIN_CONTACT, PLAN_LIST, planOf } from "@/lib/plans";
import { openLink, haptic } from "@/lib/telegram";

export function refLink(botUsername: string, refCode: string) {
  return botUsername && refCode ? `https://t.me/${botUsername}?start=${refCode}` : "";
}

export function CreditsBar() {
  const { billing } = useNur();
  const plan = planOf(billing.tier);
  const left = Math.max(0, plan.scanCap - billing.scansToday) + billing.bonusScans;
  return (
    <div className="ios-card flex items-center gap-3 p-3.5">
      <div className="grad-warm grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
        <Zap className="h-5 w-5 text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {billing.credits} kredit · {left} skaner qoldi
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {plan.label} · har kuni {plan.daily} kredit
        </p>
      </div>
    </div>
  );
}

export function ReferralCard() {
  const { billing } = useNur();
  const link = refLink(billing.botUsername, billing.refCode);

  return (
    <div className="ios-card space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="grad-cool grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
          <Gift className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold">Do'st taklif qiling — bepul skaner</p>
          <p className="text-xs text-muted-foreground">
            Do'stingiz kanallarga obuna bo'lib ilovani ochsa: sizga +1, unga +1 skaner.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-secondary px-3.5 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-4 w-4 text-primary" /> Taklif qilingan
        </span>
        <span className="font-bold text-primary">{billing.invited}</span>
      </div>
      <Button
        variant="secondary"
        disabled={!link}
        onClick={() => {
          haptic("light");
          if (!link) return;
          openLink(
            `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(
              "Nur Sahifa — kitobdan so'z yodlash ilovasi. Qo'shil!",
            )}`,
          );
        }}
      >
        Havolani ulashish
      </Button>
      {link ? (
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(link);
            toast.success("Havola nusxalandi");
          }}
          className="w-full truncate text-center text-xs text-muted-foreground"
        >
          {link}
        </button>
      ) : null}
    </div>
  );
}

export function PlansList() {
  const { billing } = useNur();
  return (
    <div className="space-y-2.5">
      {PLAN_LIST.map((p) => {
        const current = p.tier === billing.tier;
        return (
          <div
            key={p.tier}
            className={`ios-card flex items-center gap-3 p-4 ${current ? "ring-2 ring-primary" : ""}`}
          >
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${
                p.tier === "free" ? "bg-secondary" : "grad-warm"
              }`}
            >
              {p.tier === "vip" ? (
                <Crown className="h-5 w-5 text-primary-foreground" />
              ) : p.tier === "free" ? (
                <Sparkles className="h-5 w-5 text-primary" />
              ) : (
                <Zap className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.label}</p>
              <p className="truncate text-xs text-muted-foreground">
                Har kuni {p.daily} kredit · {p.scanCap} skaner
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold">{p.priceLabel}</p>
              {current ? (
                <p className="flex items-center justify-end gap-1 text-[11px] text-primary">
                  <Check className="h-3 w-3" /> Faol
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
      <Button onClick={() => openLink(ADMIN_CONTACT)}>Chekni adminga yuborish</Button>
      <p className="text-center text-xs text-muted-foreground">
        To'lov chekini adminga yuborsangiz, darajangiz qo'lda ko'tariladi.
      </p>
    </div>
  );
}

export function PaywallSheet({ onClose, reason }: { onClose: () => void; reason: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="animate-pop max-h-[88vh] w-full overflow-y-auto rounded-t-[28px] bg-card p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold">Kunlik limit tugadi</h3>
            <p className="mt-1 text-sm text-muted-foreground">{reason}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <ReferralCard />
          <p className="px-1 text-[13px] font-semibold text-muted-foreground">Yoki obunani tanlang</p>
          <PlansList />
        </div>
      </div>
    </div>
  );
}
