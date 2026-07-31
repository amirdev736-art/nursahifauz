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
  if (!res.ok) console.error(`telegram ${method} failed [${res.status}]: ${await res.text()}`);
}

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
          message?: { chat?: { id?: number }; text?: string; from?: { first_name?: string } };
        };
        const chatId = update.message?.chat?.id;
        const text = update.message?.text ?? "";
        if (!chatId) return Response.json({ ok: true });

        const appUrl = process.env.TELEGRAM_WEBAPP_URL || "";

        if (text.startsWith("/start") || text.startsWith("/app")) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: `Assalomu alaykum${update.message?.from?.first_name ? ", " + update.message.from.first_name : ""}! 📖\n\nNur Sahifa — kitob sahifasini rasmga oling, notanish so'zlarni kartochkaga aylantiring va yodlang.\n\nBoshlash uchun pastdagi tugmani bosing 👇`,
            reply_markup: appUrl
              ? { inline_keyboard: [[{ text: "📚 Nur Sahifani ochish", web_app: { url: appUrl } }]] }
              : undefined,
          });
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
