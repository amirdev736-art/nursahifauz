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

    const { applyDailyCredits, rewardReferral } = await import("@/lib/nur.server");
    profile = (await applyDailyCredits(db, profile as never)) as typeof profile;
    if (profile?.subscribed) {
      await rewardReferral(db, user.id);
      const { data: fresh } = await db
        .from("profiles")
        .select("*")
        .eq("telegram_id", user.id)
        .maybeSingle();
      if (fresh) profile = fresh;
    }

    const { data: channels } = await db
      .from("channels")
      .select("id, username, title, url")
      .eq("active", true)
      .order("sort");

    await db.from("events").insert({ telegram_id: user.id, type: "open_app" });

    const { count: invitedCount } = await db
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", user.id)
      .eq("rewarded", true);

    const { data: adminRow } = await db
      .from("admins")
      .select("telegram_id")
      .eq("telegram_id", user.id)
      .maybeSingle();

    const { planOf } = await import("@/lib/plans");
    const plan = planOf(profile!.tier);

    let botUsername = "";
    try {
      const { tgCall } = await import("@/lib/nur.server");
      const me = (await tgCall("getMe", {})) as { username?: string };
      botUsername = me?.username ?? "";
    } catch {
      botUsername = "";
    }

    return {
      user,
      profile: profile!,
      channels: (channels ?? []) as Channel[],
      isAdmin: Boolean(adminRow),
      billing: {
        tier: profile!.tier as string,
        credits: profile!.credits as number,
        scansToday: profile!.scans_today as number,
        scanCap: plan.scanCap,
        bonusScans: profile!.bonus_scans as number,
        daily: plan.daily,
        refCode: (profile!.ref_code as string | null) ?? `r${user.id}`,
        invited: invitedCount ?? 0,
        botUsername,
      },
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
      const handle = ch.username.replace(/^.*t\.me\//i, "").replace(/^@+/, "").trim();
      try {
        const res = (await tgCall("getChatMember", {
          chat_id: `@${handle}`,
          user_id: user.id,
        })) as { status?: string };
        const status = res?.status ?? "";
        // faqat aniq "obuna emas" holatlarida bloklaymiz
        if (["left", "kicked", "restricted"].includes(status)) missing.push(ch);
      } catch (e) {
        // Kanalni tekshirib bo'lmadi (bot admin emas / kanal topilmadi / gateway xatosi).
        // Bunday holatda foydalanuvchini bloklamaymiz.
        console.error("getChatMember failed", handle, e);
      }
    }

    const subscribed = missing.length === 0;
    await db
      .from("profiles")
      .update({ subscribed, subscribed_at: subscribed ? new Date().toISOString() : null })
      .eq("telegram_id", user.id);
    if (subscribed) {
      const { rewardReferral } = await import("@/lib/nur.server");
      await rewardReferral(db, user.id);
    }
    await db.from("events").insert({
      telegram_id: user.id,
      type: subscribed ? "sub_ok" : "sub_missing",
      target: missing.map((m) => m.username).join(",") || null,
    });
    return { subscribed, missing };
  });

export const logEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    Auth.extend({
      type: z.string().min(2).max(40),
      target: z.string().max(120).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { parseInitData, admin } = await import("@/lib/nur.server");
    const user = parseInitData(data.initData);
    await admin()
      .from("events")
      .insert({ telegram_id: user.id, type: data.type, target: data.target ?? null });
    return { ok: true };
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
    const { parseInitData, aiChat, admin, applyDailyCredits } = await import("@/lib/nur.server");
    const { planOf, SCAN_COST } = await import("@/lib/plans");
    const scanUser = parseInitData(data.initData);
    const db = admin();

    const { data: prof } = await db
      .from("profiles")
      .select("*")
      .eq("telegram_id", scanUser.id)
      .maybeSingle();
    if (!prof) throw new Error("Profil topilmadi");
    const profile = await applyDailyCredits(db, prof as never);
    const plan = planOf(profile.tier);

    const withinCap = profile.scans_today < plan.scanCap;
    const useBonus = !withinCap && profile.bonus_scans > 0;
    if (!withinCap && !useBonus) throw new Error("LIMIT_SCAN");
    if (profile.credits < SCAN_COST) throw new Error("LIMIT_CREDIT");

    await db
      .from("profiles")
      .update({
        credits: profile.credits - SCAN_COST,
        scans_today: profile.scans_today + 1,
        bonus_scans: useBonus ? profile.bonus_scans - 1 : profile.bonus_scans,
      })
      .eq("telegram_id", scanUser.id);

    await db.from("events").insert({ telegram_id: scanUser.id, type: "scan" });
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
    await db.from("events").insert({ telegram_id: user.id, type: "word_add", target: data.word });
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
    await db.from("events").insert({ telegram_id: user.id, type: "review" });
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

const AdminAuth = z.object({
  initData: z.string().optional(),
  token: z.string().optional(),
});

type AdminAuthInput = { initData?: string; token?: string };

async function assertAdmin(auth: AdminAuthInput) {
  const { parseInitData, admin } = await import("@/lib/nur.server");
  const db = admin();
  let telegramId: number | null = null;

  if (auth.initData) {
    telegramId = parseInitData(auth.initData).id;
  } else if (auth.token) {
    const { data: sess } = await db
      .from("admin_sessions")
      .select("telegram_id, expires_at")
      .eq("token", auth.token)
      .maybeSingle();
    if (!sess || new Date(sess.expires_at).getTime() < Date.now()) {
      throw new Error("FORBIDDEN: sessiya tugagan, qaytadan kiring");
    }
    telegramId = Number(sess.telegram_id);
  }
  if (!telegramId) throw new Error("FORBIDDEN: kirish talab qilinadi");

  const { data: row } = await db
    .from("admins")
    .select("telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (!row) throw new Error("FORBIDDEN: admin emassiz");
  return { telegramId, db };
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().length(6) }).parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("@/lib/nur.server");
    const db = admin();
    const { data: row } = await db
      .from("admin_codes")
      .select("*")
      .eq("code", data.code)
      .maybeSingle();
    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("Kod noto'g'ri yoki muddati tugagan");
    }
    const { data: isAdmin } = await db
      .from("admins")
      .select("telegram_id")
      .eq("telegram_id", row.telegram_id)
      .maybeSingle();
    if (!isAdmin) throw new Error("Siz admin emassiz");

    await db.from("admin_codes").update({ used: true }).eq("code", data.code);
    const token = crypto.randomUUID() + "." + crypto.randomUUID();
    await db.from("admin_sessions").insert({
      token,
      telegram_id: row.telegram_id,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    return { token };
  });

type DayPoint = { day: string; users: number; events: number };

export const adminOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminAuth.parse(d))
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data);
    const since = new Date(Date.now() - 29 * 86400000).toISOString();

    const [channelsRes, profilesRes, cardsRes, eventsRes] = await Promise.all([
      db.from("channels").select("*").order("sort"),
      db
        .from("profiles")
        .select("telegram_id, first_name, username, lang, subscribed, created_at, last_active, tier, credits, scans_today, bonus_scans")
        .order("created_at", { ascending: false })
        .limit(2000),
      db.from("cards").select("id", { count: "exact", head: true }),
      db
        .from("events")
        .select("telegram_id, type, target, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);

    const profiles = profilesRes.data ?? [];
    const events = eventsRes.data ?? [];
    const dayKey = (iso: string) => iso.slice(0, 10);

    const days: DayPoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ day: d, users: 0, events: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.day, i]));
    for (const p of profiles) {
      const i = idx.get(dayKey(p.created_at as string));
      if (i !== undefined) days[i].users += 1;
    }
    for (const e of events) {
      const i = idx.get(dayKey(e.created_at as string));
      if (i !== undefined) days[i].events += 1;
    }

    const last7 = days.slice(-7).reduce((s, d) => s + d.users, 0);
    const prev7 = days.slice(-14, -7).reduce((s, d) => s + d.users, 0);
    const growthPct = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round(((last7 - prev7) / prev7) * 100);

    const eventCounts = Object.entries(
      events.reduce<Record<string, number>>((acc, e) => {
        acc[e.type as string] = (acc[e.type as string] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const channelClicks = Object.entries(
      events
        .filter((e) => e.type === "channel_click")
        .reduce<Record<string, number>>((acc, e) => {
          const k = (e.target as string) || "—";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
    )
      .map(([username, clicks]) => ({ username, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    const nameById = new Map(
      profiles.map((p) => [
        Number(p.telegram_id),
        { first_name: p.first_name as string | null, username: p.username as string | null },
      ]),
    );

    const perUser = events.reduce<Record<string, number>>((acc, e) => {
      const k = String(e.telegram_id);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const topUsers = Object.entries(perUser)
      .map(([id, actions]) => ({
        telegram_id: Number(id),
        actions,
        first_name: nameById.get(Number(id))?.first_name ?? null,
        username: nameById.get(Number(id))?.username ?? null,
      }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 20);

    const recentEvents = events.slice(0, 40).map((e) => ({
      telegram_id: Number(e.telegram_id),
      type: e.type as string,
      target: (e.target as string) ?? null,
      created_at: e.created_at as string,
      username: nameById.get(Number(e.telegram_id))?.username ?? null,
      first_name: nameById.get(Number(e.telegram_id))?.first_name ?? null,
    }));

    const subscribed = profiles.filter((p) => p.subscribed).length;
    const today = new Date().toISOString().slice(0, 10);

    return {
      channels: channelsRes.data ?? [],
      users: profiles.length,
      cards: cardsRes.count ?? 0,
      subscribed,
      unsubscribed: profiles.length - subscribed,
      activeToday: profiles.filter((p) => p.last_active === today).length,
      last7,
      prev7,
      growthPct,
      days,
      eventCounts,
      channelClicks,
      topUsers,
      recentEvents,
      recentUsers: profiles.slice(0, 20).map((p) => ({
        telegram_id: Number(p.telegram_id),
        first_name: p.first_name as string | null,
        username: p.username as string | null,
        lang: p.lang as string,
        subscribed: Boolean(p.subscribed),
        created_at: p.created_at as string,
        tier: (p.tier as string) ?? "free",
        credits: (p.credits as number) ?? 0,
      })),
    };
  });

export const adminAddChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    AdminAuth.extend({
      username: z
        .string()
        .trim()
        .min(3)
        .max(64)
        .transform((v) =>
          v
            .replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
            .replace(/^@/, "")
            .replace(/\/+$/, ""),
        ),
      title: z.string().trim().max(80).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data);
    const { tgCall } = await import("@/lib/nur.server");

    if (!/^[A-Za-z][A-Za-z0-9_]{3,63}$/.test(data.username)) {
      throw new Error(
        "Kanal username noto'g'ri. Ochiq kanal username kiriting (masalan @nursahifa). Yopiq kanal (t.me/+...) qo'llab-quvvatlanmaydi.",
      );
    }

    let chatTitle = data.title?.trim() || "";
    try {
      const chat = (await tgCall("getChat", { chat_id: `@${data.username}` })) as {
        title?: string;
      };
      if (!chatTitle) chatTitle = chat?.title ?? data.username;
    } catch {
      throw new Error(
        `Bot @${data.username} kanaliga kira olmadi. Avval botni shu kanalga admin qilib qo'shing, so'ng qayta urinib ko'ring.`,
      );
    }

    const { error } = await db.from("channels").insert({
      username: data.username,
      title: chatTitle,
      url: `https://t.me/${data.username}`,
    });
    if (error) {
      if (error.code === "23505") throw new Error("Bu kanal allaqachon qo'shilgan");
      throw new Error(error.message);
    }
    return { ok: true, title: chatTitle };
  });

export const adminToggleChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    AdminAuth.extend({ id: z.string().uuid(), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data);
    await db.from("channels").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });

export const adminDeleteChannel = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AdminAuth.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data);
    await db.from("channels").delete().eq("id", data.id);
    return { ok: true };
  });


export const adminSetTier = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    AdminAuth.extend({
      telegram_id: z.coerce.number().int().positive(),
      tier: z.enum(["free", "standart", "premium", "vip"]),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db, telegramId } = await assertAdmin(data);
    const { planOf } = await import("@/lib/plans");
    const { error } = await db
      .from("profiles")
      .update({ tier: data.tier })
      .eq("telegram_id", data.telegram_id);
    if (error) throw new Error(error.message);
    await db.from("events").insert({
      telegram_id: telegramId,
      type: "tier_change",
      target: `${data.telegram_id}:${data.tier}`,
    });
    return { ok: true, daily: planOf(data.tier).daily };
  });

export const adminAddCredits = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    AdminAuth.extend({
      telegram_id: z.coerce.number().int().positive(),
      amount: z.coerce.number().int().min(-500).max(500),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { db } = await assertAdmin(data);
    const { data: p } = await db
      .from("profiles")
      .select("credits")
      .eq("telegram_id", data.telegram_id)
      .maybeSingle();
    if (!p) throw new Error("Foydalanuvchi topilmadi");
    const credits = Math.max(0, (p.credits ?? 0) + data.amount);
    await db.from("profiles").update({ credits }).eq("telegram_id", data.telegram_id);
    return { ok: true, credits };
  });
