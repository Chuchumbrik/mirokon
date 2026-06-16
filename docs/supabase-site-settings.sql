-- Настройки сайта (контакты, Hero, SEO, видимость секций)
-- Запустить в SQL Editor Supabase после основной схемы.

create table if not exists public.site_settings (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select using (true);

drop policy if exists "admin manage settings" on public.site_settings;
create policy "admin manage settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.site_settings (id, data) values (1, '{
  "company_name": "Mirokon",
  "phone": "79991234567",
  "phone_display": "+7 (999) 123-45-67",
  "whatsapp": "79991234567",
  "telegram": "mirokon_bot",
  "email": "",
  "hours": "Пн–Вс 09:00–21:00",
  "logo_url": null,
  "hero": {
    "eyebrow": "● Москва и Московская область",
    "title_before": "Окна, которые",
    "title_em": "служат десятилетия",
    "lead": "Премиальные пластиковые окна и аккуратный монтаж под ключ. Точно, чисто, с гарантией.",
    "price_from": 17490,
    "chips": ["Гарантия 5 лет", "Договор", "Монтаж за 1 день"],
    "stats": [
      {"value": "1500+", "label": "окон установлено"},
      {"value": "8 лет", "label": "на рынке"},
      {"value": "★ 4.9", "label": "рейтинг клиентов"}
    ],
    "profiles": ["WHS", "VEKA", "REHAU", "Salamander"]
  },
  "footer": {
    "about": "Премиальные пластиковые окна и аккуратный монтаж под ключ в Москве и Московской области."
  },
  "seo": {
    "title": "Окна под ключ в Москве и МО — установка пластиковых окон | Mirokon",
    "description": "Установка и замена пластиковых окон под ключ в Москве и Московской области. Премиальные профили, гарантия 5 лет, монтаж за 1 день. Бесплатный замер и точный расчёт."
  },
  "social": {
    "vk": "",
    "avito": ""
  },
  "sections": {
    "gallery": true,
    "reviews": true,
    "news": true
  }
}'::jsonb)
on conflict (id) do nothing;
