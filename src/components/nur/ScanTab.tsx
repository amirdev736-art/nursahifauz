import { useRef, useState } from "react";
import { Camera, Loader2, Plus, RefreshCw, X, Check } from "lucide-react";
import { Button, Card, Spinner } from "@/components/nur/ui";
import { useNur } from "@/lib/nur-context";
import { addCard, ocrImage, translateWord } from "@/lib/nur.functions";
import { haptic } from "@/lib/telegram";
import { CreditsBar, PaywallSheet } from "@/components/nur/Paywall";
import { toast } from "sonner";

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

export function ScanTab() {
  const { tr, initData, lang, refreshCards, refreshBilling } = useNur();
  const [paywall, setPaywall] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [tState, setTState] = useState<{
    loading: boolean;
    translation?: string;
    base?: string;
    example?: string | null;
    saved?: boolean;
  }>({ loading: false });

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

  return (
    <div className="space-y-4 pb-4">
      <input
        ref={fileRef}
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

      <CreditsBar />

      {!text && !busy && (
        <Card className="flex flex-col items-center gap-4 py-9 text-center">
          <div className="grad-warm grid h-16 w-16 place-items-center rounded-3xl shadow-[var(--shadow-pop)]">
            <Camera className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-bold">{tr("scanTitle")}</h1>
            <p className="text-sm text-muted-foreground">{tr("scanDesc")}</p>
          </div>
          <Button onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> {tr("takePhoto")}
          </Button>
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
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground"
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
                      className="cursor-pointer rounded-md px-0.5 transition-colors active:bg-primary/25"
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

      {picked && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px]"
          onClick={() => setPicked(null)}
        >
          <div
            className="animate-pop w-full rounded-t-[28px] bg-card p-6 pb-8 shadow-[var(--shadow-pop)]"
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
                  <p className="mt-1 text-lg font-semibold text-primary">{tState.translation}</p>
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
              <p className="mt-3 border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground italic">
                {tState.example}
              </p>
            ) : null}
            <div className="mt-5">
              <Button
                variant={tState.saved ? "success" : "primary"}
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
