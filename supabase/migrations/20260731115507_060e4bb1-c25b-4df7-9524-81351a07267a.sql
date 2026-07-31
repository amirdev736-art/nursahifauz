CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id bigint NOT NULL,
  type text NOT NULL,
  target text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events service only" ON public.events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX events_created_idx ON public.events (created_at DESC);
CREATE INDEX events_type_idx ON public.events (type);
CREATE INDEX events_user_idx ON public.events (telegram_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscribed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscribed_at timestamptz;

CREATE TABLE public.admin_codes (
  code text PRIMARY KEY,
  telegram_id bigint NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_codes TO service_role;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_codes service only" ON public.admin_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.admin_sessions (
  token text PRIMARY KEY,
  telegram_id bigint NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_sessions TO service_role;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_sessions service only" ON public.admin_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);