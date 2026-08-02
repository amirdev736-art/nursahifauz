ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS credits_date date,
  ADD COLUMN IF NOT EXISTS scans_today integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_day date,
  ADD COLUMN IF NOT EXISTS bonus_scans integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ref_code text,
  ADD COLUMN IF NOT EXISTS referred_by bigint;

UPDATE public.profiles SET ref_code = 'r' || telegram_id::text WHERE ref_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_ref_code_key ON public.profiles (ref_code);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id bigint NOT NULL,
  invitee_id bigint NOT NULL UNIQUE,
  rewarded boolean NOT NULL DEFAULT false,
  rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals service only" ON public.referrals FOR ALL TO service_role USING (true) WITH CHECK (true);