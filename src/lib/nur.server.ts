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

export async function aiChat(
  messages: unknown[],
  model = "google/gemini-3.5-flash",
): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI sozlanmagan");
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("NO_CREDITS");
    throw new Error(`AI xatosi [${res.status}]: ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

export function extractJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("").trim();
  const start = cleaned.search(/[[{]/);
  const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("AI javobini o'qib bo'lmadi");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
