DELETE FROM public.admins WHERE telegram_id NOT IN (2129866774, 8208677588, 5940981967, 5898796369);
INSERT INTO public.admins (telegram_id, note) VALUES
  (2129866774, '@davlatbekdev'),
  (8208677588, '@asilamir777'),
  (5940981967, '@izzatullohu'),
  (5898796369, '@save_me_5209')
ON CONFLICT (telegram_id) DO NOTHING;