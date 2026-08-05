import { useRef, useState } from "react";
import {
  Camera,
  Loader2,
  Plus,
  RefreshCw,
  X,
  Check,
  ArrowRight,
  FolderUp,
  Images,
  Zap,
} from "lucide-react";
import { Button, Card, Spinner } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { addCard, ocrImage, translateWord } from "@/lib/nur.functions";
import { haptic } from "@/lib/telegram";
import { PaywallSheet } from "@/components/nur/Paywall";
import { planOf } from "@/lib/plans";
import { scanText } from "@/lib/scan-i18n";
import { toast } from "sonner";

const SAMPLE_WORDS: Array<[string, string, string]> = [
  ["undergo", "boshdan kechirmoq", "Many species undergo remarkable changes."],
  ["remarkable", "diqqatga sazovor", "The results were remarkable."],
  ["habitat", "yashash muhiti", "Their habitat is being altered."],
  ["alter", "o'zgartirmoq", "Humans alter the landscape rapidly."],
  ["document", "hujjatlashtirmoq", "Researchers have documented the decline."],
  ["substantial", "sezilarli", "A substantial decline was observed."],
  ["decline", "pasayish", "The decline in insect populations continues."],
  ["jeopardise", "xavf ostiga qo'ymoq", "It could jeopardise entire ecosystems."],
  ["stability", "barqarorlik", "The stability of ecosystems matters."],
  ["ecosystem", "ekotizim", "Entire ecosystems depend on insects."],
  ["nevertheless", "shunga qaramay", "Nevertheless, some communities acted."],
  ["community", "jamoa", "Local communities restored the river."],
  ["mitigate", "yumshatmoq", "They managed to mitigate the damage."],
  ["restore", "tiklamoq", "Restoring native vegetation helps."],
  ["vegetation", "o'simlik qoplami", "Native vegetation lines the riverbank."],
  ["riverbank", "daryo qirg'og'i", "Trees grow along the riverbank."],
  ["species", "tur", "Many species are at risk."],
  ["population", "populyatsiya", "Insect populations are shrinking."],
  ["insect", "hasharot", "Insect numbers fell sharply."],
  ["native", "mahalliy", "Native plants returned quickly."],
];

const SAMPLE_TEXT = `Cambridge IELTS 15 — Reading Passage 1
Many species undergo remarkable changes when their habitat is altered.
Researchers have documented a substantial decline in insect populations,
which could jeopardise the stability of entire ecosystems.
Nevertheless, some communities have managed to mitigate the damage by
restoring native vegetation along riverbanks.`;

async function compress(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1400;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

type Picked = { word: string; sentence: string };

export function ScanTab({ onGoToSwipe }: { onGoToSwipe?: () => void }) {
  const { tr, initData, lang, billing, refreshCards, refreshBilling } = useNur();
  const [paywall, setPaywall] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [tState, setTState] = useState<{
    loading: boolean;
    translation?: string;
    base?: string;
    example?: string | null;
    saved?: boolean;
  }>({ loading: false });

  const plan = planOf(billing.tier);
  const scansLeft = Math.max(0, plan.scanCap - billing.scansToday) + billing.bonusScans;
  const desc = scanText("scan_desc", lang);

  async function onFile(file: File) {
    setBusy(true);
    setText("");
    try {
      const dataUrl = await compress(file);
      const res = await ocrImage({ data: { initData, image: dataUrl } });
      setText(res.text);
      refreshBilling();
      if (!res.text) toast.error(tr("error"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("LIMIT_SCAN")) {
        setPaywall("Bugungi skanerlar tugadi. Do'st taklif qiling yoki obunani ko'taring.");
      } else if (msg.includes("LIMIT_CREDIT")) {
        setPaywall("Kreditlaringiz tugadi. Do'st taklif qiling yoki obunani ko'taring.");
      } else {
        toast.error(msg || tr("error"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function trySample() {
    if (sample !== null) return;
    haptic("light");
    setSample(0);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const pct = Math.min(97, Math.round(((Date.now() - started) / 13000) * 100));
      setSample(pct);
    }, 200);
    try {
      for (const [word, translation, example] of SAMPLE_WORDS) {
        await addCard({ data: { initData, word, translation, example, target: lang } });
      }
      const wait = Math.max(0, 12500 - (Date.now() - started));
      await new Promise((r) => window.setTimeout(r, wait));
      window.clearInterval(timer);
      setSample(100);
      refreshCards();
      setText(SAMPLE_TEXT);
      haptic("success");
      toast.success(`${SAMPLE_WORDS.length} ta namuna so'z qo'shildi`);
      onGoToSwipe?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("error"));
    } finally {
      window.clearInterval(timer);
      setSample(null);
    }
  }

  async function pick(word: string, sentence: string) {
    haptic("light");
    setPicked({ word, sentence });
    setTState({ loading: true });
    try {
      const res = await translateWord({
        data: { initData, word, sentence, target: lang },
      });
      setTState({ loading: false, ...res });
    } catch (e) {
      setTState({ loading: false });
      toast.error(e instanceof Error ? e.message : tr("error"));
    }
  }

  async function save() {
    if (!picked || !tState.translation) return;
    try {
      const res = await addCard({
        data: {
          initData,
          word: tState.base || picked.word,
          translation: tState.translation,
          example: tState.example ?? picked.sentence,
          target: lang,
        },
      });
      haptic("success");
      toast.success(res.duplicate ? tr("alreadyAdded") : tr("added"));
      setTState((s) => ({ ...s, saved: true }));
      refreshCards();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr("error"));
    }
  }

  const idle = !text && !busy && sample === null;

  return (
    <div className="space-y-5 pb-4">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      {/* Minimal status badge */}
      <div className="flex justify-center pt-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-white/5 px-4 py-1.5 backdrop-blur-xl">
          <Zap className="h-3.5 w-3.5 text-accent drop-shadow-[0_0_6px_var(--color-accent)]" />
          <span className="text-[13px] font-bold tabular-nums">{billing.credits}</span>
          <span className="text-accent/40">·</span>
          <Camera className="h-3.5 w-3.5 text-accent/80" />
          <span className="text-[13px] font-bold tabular-nums">{scansLeft}</span>
        </div>
      </div>

      {idle && (
        <div className="flex flex-col items-center gap-7 pt-6">
          {/* Central capture target */}
          <button
            onClick={() => {
              haptic("light");
              setSource(true);
            }}
            className="relative grid h-44 w-44 place-items-center rounded-full"
          >
            <span className="absolute inset-0 animate-pulse rounded-full bg-accent/15 blur-2xl" />
            <span className="absolute inset-0 rounded-full border border-accent/30" />
            <span className="absolute inset-3 rounded-full border-2 border-accent/60 shadow-[0_0_45px_var(--color-accent),inset_0_0_35px_color-mix(in_oklab,var(--color-accent)_35%,transparent)]" />
            <span className="grid h-24 w-24 place-items-center rounded-full bg-white/5 backdrop-blur-xl">
              <Camera className="h-11 w-11 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </span>
          </button>

          <p className="max-w-[19rem] text-center text-[15px] leading-relaxed text-muted-foreground">
            {desc}
          </p>

          <div className="w-full space-y-3">
            <Button
              variant="neon"
              onClick={() => {
                haptic("light");
                setSource(true);
              }}
            >
              <FolderUp className="h-4 w-4" /> SELECT
            </Button>
            <button
              onClick={trySample}
              className="mx-auto flex items-center gap-1.5 text-[13px] font-semibold tracking-wide text-accent"
            >
              TRY SAMPLE <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {sample !== null && (
        <Card className="space-y-4 py-8 text-center">
          <Spinner label="Namuna sahifa tahlil qilinmoqda…" />
          <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className="grad-warm h-full rounded-full transition-[width] duration-200"
              style={{ width: `${sample}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{sample}%</p>
        </Card>
      )}

      {busy && (
        <Card>
          <Spinner label={tr("reading")} />
        </Card>
      )}

      {text && !busy && (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-semibold text-muted-foreground">{tr("tapWord")}</span>
            <button
              onClick={() => setSource(true)}
              className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> {tr("newPhoto")}
            </button>
          </div>
          <Card className="text-[17px] leading-8">
            {text.split(/\n+/).map((line, li) => (
              <p key={li} className="mb-3 last:mb-0">
                {line.split(/(\s+)/).map((chunk, ci) => {
                  const clean = chunk.replace(/[^\p{L}\p{M}'’-]/gu, "");
                  if (clean.length < 2) return <span key={ci}>{chunk}</span>;
                  return (
                    <span
                      key={ci}
                      onClick={() => pick(clean, line)}
                      className="cursor-pointer rounded-md px-0.5 transition-colors active:bg-accent/30"
                    >
                      {chunk}
                    </span>
                  );
                })}
              </p>
            ))}
          </Card>
        </>
      )}

      {paywall ? <PaywallSheet reason={paywall} onClose={() => setPaywall(null)} /> : null}

      {source && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-[3px]"
          onClick={() => setSource(false)}
        >
          <div
            className="animate-pop w-full space-y-2 rounded-t-[28px] border-t border-border bg-card/95 p-5 pb-8 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <button
              onClick={() => {
                setSource(false);
                cameraRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 text-left font-semibold"
            >
              <Camera className="h-5 w-5 text-accent" /> Camera
            </button>
            <button
              onClick={() => {
                setSource(false);
                galleryRef.current?.click();
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3.5 text-left font-semibold"
            >
              <Images className="h-5 w-5 text-accent" /> Gallery
            </button>
          </div>
        </div>
      )}

      {picked && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 backdrop-blur-[3px]"
          onClick={() => setPicked(null)}
        >
          <div
            className="animate-pop w-full rounded-t-[28px] border-t border-border bg-card/95 p-6 pb-8 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-2xl font-bold">{tState.base || picked.word}</h3>
                {tState.loading ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {tr("translating")}
                  </p>
                ) : (
                  <p className="mt-1 text-lg font-semibold text-accent">{tState.translation}</p>
                )}
              </div>
              <button
                onClick={() => setPicked(null)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {tState.example ? (
              <p className="mt-3 border-l-2 border-accent/50 pl-3 text-sm text-muted-foreground italic">
                {tState.example}
              </p>
            ) : null}
            <div className="mt-5">
              <Button
                variant={tState.saved ? "success" : "neon"}
                disabled={tState.loading || !tState.translation}
                onClick={save}
              >
                {tState.saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {tState.saved ? tr("added") : tr("addCard")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
