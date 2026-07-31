CREATE TABLE public.profiles (
  telegram_id BIGINT PRIMARY KEY,
  first_name TEXT,
  username TEXT,
  lang TEXT NOT NULL DEFAULT 'uz',
  streak_days INT NOT NULL DEFAULT 0,
  last_active DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  source_lang TEXT NOT NULL DEFAULT 'en',
  target_lang TEXT NOT NULL DEFAULT 'uz',
  box INT NOT NULL DEFAULT 0,
  streak INT NOT NULL DEFAULT 0,
  reviews INT NOT NULL DEFAULT 0,
  learned BOOLEAN NOT NULL DEFAULT false,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_user ON public.cards (telegram_id, due_at);
CREATE UNIQUE INDEX idx_cards_unique_word ON public.cards (telegram_id, lower(word));
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.channels TO service_role;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.admins (
  telegram_id BIGINT PRIMARY KEY,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

INSERT INTO public.channels (username, title, url, sort)
VALUES ('nursahifa', 'Nur Sahifa', 'https://t.me/nursahifa', 0);