-- Run once in the Supabase SQL Editor to enable editable storefront settings.
create table if not exists public.store_settings (
  id boolean primary key default true check (id = true),
  announcement text not null default 'Thoughtful finds for your everyday',
  delivery_note text not null default 'Delivery across Ghana',
  support_email text not null default '',
  support_phone text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;
revoke all on public.store_settings from anon, authenticated;
grant select, insert, update on public.store_settings to service_role;
insert into public.store_settings(id) values (true) on conflict (id) do nothing;
