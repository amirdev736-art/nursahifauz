export type Tier = "free" | "standart" | "premium" | "vip";

export type Plan = {
  tier: Tier;
  label: string;
  daily: number;
  scanCap: number;
  price: number;
  priceLabel: string;
};

export const PLANS: Record<Tier, Plan> = {
  free: {
    tier: "free",
    label: "Oddiy",
    daily: 5,
    scanCap: 3,
    price: 0,
    priceLabel: "Bepul",
  },
  standart: {
    tier: "standart",
    label: "Standart",
    daily: 10,
    scanCap: 10,
    price: 19990,
    priceLabel: "19 990 so'm",
  },
  premium: {
    tier: "premium",
    label: "Premium",
    daily: 15,
    scanCap: 15,
    price: 39990,
    priceLabel: "39 990 so'm",
  },
  vip: {
    tier: "vip",
    label: "VIP",
    daily: 20,
    scanCap: 20,
    price: 55550,
    priceLabel: "55 550 so'm",
  },
};

export const PLAN_LIST: Plan[] = [PLANS.free, PLANS.standart, PLANS.premium, PLANS.vip];

export const WELCOME_CREDITS = 15;
export const SCAN_COST = 1;
export const REFERRAL_SCANS = 1;
export const ADMIN_CONTACT = "https://t.me/davlatbekdev";

export function planOf(tier: string | null | undefined): Plan {
  return PLANS[(tier ?? "free") as Tier] ?? PLANS.free;
}
