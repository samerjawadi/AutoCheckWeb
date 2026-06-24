create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('theme', '{"dark": true, "accent": "yellow", "accentLevel": 666}'::jsonb)
on conflict (key) do nothing;
