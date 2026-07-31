import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveSecret(key: string) {
  return createHash("sha256").update(`telegram-webhook:${key}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${GATEWAY}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": process.env.TELEGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) console.error(`telegram ${method} failed [${res.status}]: ${text}`);
  try {
    return JSON.parse(text) as { ok?: boolean; result?: unknown };
  } catch {
    return { ok: false };
  }
}

type Channel = { id: string; username: string; title: string; url: string };

async function db() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function activeChannels(): Promise<Channel[]> {
  const { data } = await (await db())
    .from("channels")
    .select("id, username, title, url")
    .eq("active", true)
    .order("sort");
  return (data ?? []) as Channel[];
}


async function missingChannels(userId: number): Promise<Channel[]> {
  const channels = await activeChannels();
  const missing: Channel[] = [];
  for (const ch of channels) {
    const res = (await tg("getChatMember", {
      chat_id: `@${ch.username}`,
      user_id: userId,
    })) as { ok?: boolean; result?: { status?: string } };
    const ok =
      res.ok === true &&
      ["creator", "administrator", "member"].includes(res.result?.status ?? "");
    if (!ok) missing.push(ch);
  }
  return missing;
}

function gateMarkup(missing: Channel[]) {
  return {
    inline_keyboard: [
      ...missing.map((ch) => [{ text: `📢 ${ch.title}`, url: ch.url }]),
      [{ text: "✅ Obunani tekshirish", callback_data: "check_sub" }],
    ],
  };
}

function openMarkup(appUrl: string) {
  return appUrl
    ? { inline_keyboard: [[{ text: "📚 Nur Sahifani ochish", web_app: { url: appUrl } }]] }
    : undefined;
}

const GATE_TEXT =
  "🔒 Ilovadan foydalanish uchun quyidagi kanal(lar)ga obuna bo'ling, so'ng «Obunani tekshirish» tugmasini bosing.";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.TELEGRAM_API_KEY;
        if (!key) return new Response("Not configured", { status: 500 });

        const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(got, deriveSecret(key))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as {
          message?: {
            chat?: { id?: number };
            text?: string;
            from?: { id?: number; first_name?: string };
          };
          callback_query?: {
            id: string;
            data?: string;
            from?: { id?: number; first_name?: string };
            message?: { chat?: { id?: number }; message_id?: number };
          };
        };

        const appUrl = process.env.TELEGRAM_WEBAPP_URL || "";
        const cb = update.callback_query;

        if (cb?.data === "check_sub") {
          const chatId = cb.message?.chat?.id;
          const userId = cb.from?.id;
          if (!chatId || !userId) return Response.json({ ok: true });
          const missing = await missingChannels(userId);
          await tg("answerCallbackQuery", {
            callback_query_id: cb.id,
            text: missing.length ? "Hali barcha kanallarga obuna emassiz" : "Obuna tasdiqlandi ✅",
          });
          await tg("editMessageText", {
            chat_id: chatId,
            message_id: cb.message?.message_id,
            text: missing.length
              ? GATE_TEXT
              : "✅ Obuna tasdiqlandi! Endi ilovani ochishingiz mumkin 👇",
            reply_markup: missing.length ? gateMarkup(missing) : openMarkup(appUrl),
          });
          return Response.json({ ok: true });
        }

        const chatId = update.message?.chat?.id;
        const userId = update.message?.from?.id;
        const text = update.message?.text ?? "";
        if (!chatId) return Response.json({ ok: true });

        if (text.startsWith("/start") || text.startsWith("/app")) {
          const missing = userId ? await missingChannels(userId) : [];
          if (missing.length) {
            await tg("sendMessage", {
              chat_id: chatId,
              text: GATE_TEXT,
              reply_markup: gateMarkup(missing),
            });
          } else {
            await tg("sendMessage", {
              chat_id: chatId,
              text: `Assalomu alaykum${update.message?.from?.first_name ? ", " + update.message.from.first_name : ""}! 📖\n\nNur Sahifa — kitob sahifasini rasmga oling, notanish so'zlarni kartochkaga aylantiring va yodlang.\n\nBoshlash uchun pastdagi tugmani bosing 👇`,
              reply_markup: openMarkup(appUrl),
            });
          }
        } else if (text.startsWith("/help")) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: "Buyruqlar:\n/start — ilovani ochish\n/help — yordam",
          });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
