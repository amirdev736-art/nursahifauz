import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nextState } from "@/lib/srs";
import { langName } from "@/lib/i18n";

const Auth = z.object({ initData: z.string().min(1) });

export type CardRow = {
  id: string;
  word: string;
  translation: string;
  example: string | null;
  box: number;
  streak: number;
  reviews: number;
  learned: boolean;
  due_at: string;
  created_at: string;
};

export type Channel = { id: string; username: string; title: string; url: string };

export const bootstrap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.extend({ lang: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    const db = admin();

    const { data: existing } = await db
      .from("profiles")
      .select("*")
      .eq("telegram_id", user.id)
      .maybeSingle();

    let profile = existing;
    if (!profile) {
      const { data: created, error } = await db
        .from("profiles")
        .insert({
          telegram_id: user.id,
          first_name: user.first_name ?? null,
          username: user.username ?? null,
          lang: data.lang ?? "uz",
          last_active: new Date().toISOString().slice(0, 10),
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      profile = created;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      if (profile.last_active !== today) {
        const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const streak = profile.last_active === yest ? profile.streak_days + 1 : 1;
        const { data: upd } = await db
          .from("profiles")
          .update({ last_active: today, streak_days: streak })
          .eq("telegram_id", user.id)
          .select("*")
          .single();
        if (upd) profile = upd;
      }
    }

    const { data: channels } = await db
      .from("channels")
      .select("id, username, title, url")
      .eq("active", true)
      .order("sort");

    const { count: adminCount } = await db
      .from("admins")
      .select("telegram_id", { count: "exact", head: true });
    if (!adminCount) {
      await db.from("admins").insert({ telegram_id: user.id, note: "birinchi foydalanuvchi" });
    }
    const { data: adminRow } = await db
      .from("admins")
      .select("telegram_id")
      .eq("telegram_id", user.id)
      .maybeSingle();

    return {
      user,
      profile: profile!,
      channels: (channels ?? []) as Channel[],
      isAdmin: Boolean(adminRow) || !adminCount,
    };
  });

export const checkSubscription = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.parse(d))
  .handler(async ({ data }) => {
    const { parseInitData, admin, tgCall } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    const db = admin();
    const { data: channels } = await db
      .from("channels")
      .select("id, username, title, url")
      .eq("active", true)
      .order("sort");

    const missing: Channel[] = [];
    for (const ch of (channels ?? []) as Channel[]) {
      try {
        const res = (await tgCall("getChatMember", {
          chat_id: `@${ch.username}`,
          user_id: user.id,
        })) as { status?: string };
        const ok = ["creator", "administrator", "member"].includes(res?.status ?? "");
        if (!ok) missing.push(ch);
      } catch (e) {
        console.error("getChatMember failed", ch.username, e);
        missing.push(ch);
      }
    }
    return { subscribed: missing.length === 0, missing };
  });

export const setLanguage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.extend({ lang: z.string().min(2).max(5) }).parse(d))
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    await admin().from("profiles").update({ lang: data.lang }).eq("telegram_id", user.id);
    return { ok: true };
  });

export const ocrImage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({ image: z.string().min(50).max(12_000_000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { parseInitData, aiChat } = await import("@/lib/nur.server");
    parseInitData(data.initData);
    const raw = await aiChat([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract ALL readable text from this book page photo. Keep original language and spelling (English, Uzbek latin, Uzbek cyrillic, Russian, Turkish are all possible). Preserve line and paragraph breaks. Return ONLY the plain text, no commentary.",
          },
          { type: "image_url", image_url: { url: data.image } },
        ],
      },
    ]);
    return { text: raw.trim() };
  });

export const translateWord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({
      word: z.string().trim().min(1).max(60),
      sentence: z.string().trim().max(600).optional(),
      target: z.string().min(2).max(5),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { parseInitData, aiChat, extractJson } = await import("@/lib/nur.server");
    parseInitData(data.initData);
    const raw = await aiChat([
      {
        role: "system",
        content: `You are a bilingual dictionary. Answer ONLY with JSON: {"translation": string, "base": string, "example": string}. "translation" must be in ${langName(data.target)} and short (1-4 words). "base" is the dictionary form of the word. "example" is a short example sentence in the SOURCE language of the word.`,
      },
      {
        role: "user",
        content: `Word: ${data.word}\nContext sentence: ${data.sentence ?? "(none)"}`,
      },
    ]);
    const parsed = extractJson<{ translation: string; base?: string; example?: string }>(raw);
    return {
      translation: parsed.translation,
      base: parsed.base ?? data.word,
      example: data.sentence?.trim() || parsed.example || null,
    };
  });

export const addCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({
      word: z.string().trim().min(1).max(60),
      translation: z.string().trim().min(1).max(200),
      example: z.string().trim().max(600).nullable().optional(),
      target: z.string().min(2).max(5),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    const db = admin();
    const { data: row, error } = await db
      .from("cards")
      .insert({
        telegram_id: user.id,
        word: data.word,
        translation: data.translation,
        example: data.example ?? null,
        target_lang: data.target,
      })
      .select("*")
      .maybeSingle();
    if (error) {
      if (error.code === "23505") return { duplicate: true, card: null };
      throw new Error(error.message);
    }
    return { duplicate: false, card: row as CardRow };
  });

export const listCards = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.parse(d))
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    const { data: rows, error } = await admin()
      .from("cards")
      .select("*")
      .eq("telegram_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as CardRow[];
  });

export const reviewCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({ id: z.string().uuid(), correct: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    const db = admin();
    const { data: card } = await db
      .from("cards")
      .select("*")
      .eq("id", data.id)
      .eq("telegram_id", user.id)
      .maybeSingle();
    if (!card) throw new Error("Kartochka topilmadi");
    const next = nextState(card, data.correct);
    const { data: upd, error } = await db
      .from("cards")
      .update({ ...next, reviews: card.reviews + 1 })
      .eq("id", data.id)
      .eq("telegram_id", user.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return upd as CardRow;
  });

export const deleteCard = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    await admin().from("cards").delete().eq("id", data.id).eq("telegram_id", user.id);
    return { ok: true };
  });

async function assertAdmin(initData: string) {
  const { parseInitData, admin } = await import("@/lib/nur.server");
  const user = parseInitData(initData);
  const db = admin();
  const { data: row } = await db
    .from("admins")
    .select("telegram_id")
    .eq("telegram_id", user.id)
    .maybeSingle();
  if (!row) throw new Error("FORBIDDEN: admin emassiz");
  return { user, db };
}

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.parse(d))
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data.initData);
    const [{ data: channels }, users, cards] = await Promise.all([
      db.from("channels").select("*").order("sort"),
      db.from("profiles").select("telegram_id", { count: "exact", head: true }),
      db.from("cards").select("id", { count: "exact", head: true }),
    ]);
    return {
      channels: channels ?? [],
      users: users.count ?? 0,
      cards: cards.count ?? 0,
    };
  });

export const adminAddChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({
      username: z
        .string()
        .trim()
        .min(3)
        .max(64)
        .transform((v) => v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "")),
      title: z.string().trim().min(1).max(80),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data.initData);
    const { error } = await db.from("channels").insert({
      username: data.username,
      title: data.title,
      url: `https://t.me/${data.username}`,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data.initData);
    await db.from("channels").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Auth.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data.initData);
    await db.from("channels").delete().eq("id", data.id);
    return { ok: true };
  });
