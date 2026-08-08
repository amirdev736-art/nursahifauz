import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TgAuthUser = {
  id: number;
  first_name?: string;
  username?: string;
};

export function admin() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Telegram WebApp initData'dan foydalanuvchini oladi.
 * Bot tokeni gateway tomonida saqlangani uchun HMAC imzo shu yerda tekshirilmaydi;
 * auth_date yangiligi tekshiriladi va barcha yozuvlar server tomonida chegaralanadi.
 */
export function parseInitData(initData: string): TgAuthUser {
  if (!initData) throw new Error("UNAUTHORIZED: initData yo'q");
  const params = new URLSearchParams(initData);
  const rawUser = params.get("user");
  if (!rawUser) throw new Error("UNAUTHORIZED: foydalanuvchi topilmadi");
  const authDate = Number(params.get("auth_date") ?? 0);
  if (authDate && Date.now() / 1000 - authDate > 60 * 60 * 24 * 7) {
    throw new Error("UNAUTHORIZED: sessiya eskirgan");
  }
  const user = JSON.parse(rawUser) as TgAuthUser;
  if (!user?.id) throw new Error("UNAUTHORIZED: id yo'q");
  return { id: Number(user.id), first_name: user.first_name, username: user.username };
}

const TG_GATEWAY = "https://connector-gateway.lovable.dev/telegram";

export async function tgCall(method: string, body: Record<string, unknown>) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey || !tgKey) throw new Error("Telegram ulanishi sozlanmagan");
  const res = await fetch(`${TG_GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tgKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: { ok?: boolean; result?: unknown; description?: string } = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Telegram javobi noto'g'ri [${res.status}]: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.ok === false) {
    throw new Error(`Telegram xatosi [${res.status}]: ${json.description ?? text.slice(0, 200)}`);
  }
  return json.result;
}

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];

/** Kalitni bir nechta env nomlaridan o'qiydi (handler ichida chaqirilishi shart). */
function geminiKey(): string {
  const env = process.env as Record<string, string | undefined>;
  return (env["GEMINI_API_KEY"] ?? env["VITE_GEMINI_API_KEY"] ?? "").trim();
}

type ChatPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
type ChatMsg = { role: string; content: string | ChatPart[] };

/** OpenAI uslubidagi xabarlarni Gemini `contents` formatiga o'giradi. */
function toGeminiBody(messages: unknown[]) {
  const msgs = messages as ChatMsg[];
  const systemTexts: string[] = [];
  const contents: { role: string; parts: Record<string, unknown>[] }[] = [];

  for (const m of msgs) {
    const parts: Record<string, unknown>[] = [];
    if (typeof m.content === "string") {
      if (m.content.trim()) parts.push({ text: m.content });
    } else {
      for (const p of m.content ?? []) {
        if (p.type === "text") {
          parts.push({ text: p.text });
        } else if (p.type === "image_url") {
          const url = p.image_url.url;
          const match = /^data:([^;]+);base64,(.*)$/s.exec(url);
          if (match) {
            parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          } else {
            parts.push({ fileData: { fileUri: url } });
          }
        }
      }
    }
    if (parts.length === 0) continue;
    if (m.role === "system") {
      systemTexts.push(parts.map((p) => String(p.text ?? "")).join("\n"));
      continue;
    }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }

  return {
    contents,
    ...(systemTexts.length
      ? { systemInstruction: { parts: [{ text: systemTexts.join("\n\n") }] } }
      : {}),
  };
}

/** To'g'ridan-to'g'ri Google Gemini API orqali chaqiruv (foydalanuvchi kaliti bilan). */
async function geminiChat(messages: unknown[]): Promise<string> {
  const key = geminiKey();
  if (!key) throw new Error("NO_GEMINI_KEY");

  const body = JSON.stringify(toGeminiBody(messages));
  let lastErr = "";

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
          body,
        },
      );
      const text = await res.text();

      if (res.ok) {
        const json = JSON.parse(text) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        return (json.candidates?.[0]?.content?.parts ?? [])
          .map((p) => p.text ?? "")
          .join("")
          .trim();
      }

      if (res.status === 429 || res.status >= 500) {
        lastErr = res.status === 429 ? "RATE_LIMIT" : `Gemini xatosi [${res.status}]`;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        break; // keyingi modelga o'tamiz
      }

      // 400/403/404 — model yoki kalit mos emas: keyingi modelni sinaymiz
      lastErr = `Gemini xatosi [${res.status}]: ${text.slice(0, 200)}`;
      break;
    }
  }

  throw new Error(lastErr || "Gemini xatosi");
}

export async function aiChat(
  messages: unknown[],
  model = "openai/gpt-5.6-sol",
): Promise<string> {
  // Asosiy yo'l: foydalanuvchining Gemini kaliti. Xato bo'lsa Lovable AI'ga o'tadi.
  if (geminiKey()) {
    try {
      return await geminiChat(messages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "RATE_LIMIT") throw e;
      console.error("Gemini fallback:", msg);
    }
  }

  const key = (process.env.LOVABLE_API_KEY ?? "").trim();
  if (!key) throw new Error("AI sozlanmagan (LOVABLE_API_KEY yo'q)");


  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, reasoning_effort: "none" }),
    });
    const text = await res.text();

    if (res.ok) {
      const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
      return json.choices?.[0]?.message?.content ?? "";
    }

    if (res.status === 402) throw new Error("NO_CREDITS");
    if (res.status === 429 || res.status >= 500) {
      lastErr = res.status === 429 ? "RATE_LIMIT" : `AI xatosi [${res.status}]`;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        continue;
      }
      throw new Error(lastErr);
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "AI ulanishiga ruxsat berilmadi. Ilova yangi kalit bilan qayta nashr (Publish) qilinishi kerak.",
      );
    }
    throw new Error(`AI xatosi [${res.status}]: ${text.slice(0, 300)}`);
  }
  throw new Error(lastErr || "AI xatosi");
}


export function extractJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("AI javobini o'qib bo'lmadi");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/* ---------------- Kredit / referal yordamchilari ---------------- */

import { planOf, WELCOME_CREDITS, REFERRAL_SCANS } from "@/lib/plans";

type ProfileRow = Record<string, unknown> & {
  telegram_id: number;
  tier: string;
  credits: number;
  credits_date: string | null;
  scans_today: number;
  scan_day: string | null;
  bonus_scans: number;
  ref_code: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Kunlik kreditni beradi (ishlatilmagani saqlanib qoladi) va kunlik skaner hisobini yangilaydi. */
export async function applyDailyCredits(
  db: ReturnType<typeof admin>,
  profile: ProfileRow,
): Promise<ProfileRow> {
  const day = today();
  const patch: Partial<ProfileRow> = {};

  if (profile.credits_date !== day) {
    patch.credits =
      profile.credits_date === null
        ? Math.max(profile.credits ?? 0, WELCOME_CREDITS)
        : (profile.credits ?? 0) + planOf(profile.tier).daily;
    patch.credits_date = day;
  }
  if (profile.scan_day !== day) {
    patch.scans_today = 0;
    patch.scan_day = day;
  }
  if (!profile.ref_code) patch.ref_code = `r${profile.telegram_id}`;

  if (Object.keys(patch).length === 0) return profile;

  const { data } = await db
    .from("profiles")
    .update(patch as never)
    .eq("telegram_id", profile.telegram_id)
    .select("*")
    .single();
  return (data ?? { ...profile, ...patch }) as ProfileRow;
}

/** Do'st majburiy kanallarga obuna bo'lib ilovani ochsa, ikkala tomonga ham 1 tadan skaner beradi. */
export async function rewardReferral(db: ReturnType<typeof admin>, inviteeId: number) {
  const { data: ref } = await db
    .from("referrals")
    .select("*")
    .eq("invitee_id", inviteeId)
    .maybeSingle();
  if (!ref || ref.rewarded) return;

  await db.from("referrals").update({ rewarded: true, rewarded_at: new Date().toISOString() }).eq("id", ref.id);

  for (const id of [Number(ref.referrer_id), inviteeId]) {
    const { data: p } = await db
      .from("profiles")
      .select("bonus_scans, credits")
      .eq("telegram_id", id)
      .maybeSingle();
    if (!p) continue;
    await db
      .from("profiles")
      .update({
        bonus_scans: (p.bonus_scans ?? 0) + REFERRAL_SCANS,
        credits: (p.credits ?? 0) + REFERRAL_SCANS,
      })
      .eq("telegram_id", id);
  }
  await db.from("events").insert({
    telegram_id: Number(ref.referrer_id),
    type: "referral_done",
    target: String(inviteeId),
  });
}
