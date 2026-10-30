-- Run once in Supabase SQL Editor before enabling checkout discount codes.
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9-]{3,32}$'),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),
  minimum_order_pesewas integer not null default 0 check (minimum_order_pesewas >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or discount_value <= 100)
);
alter table public.discount_codes enable row level security;
revoke all on public.discount_codes from anon, authenticated;
grant select, insert, update on public.discount_codes to service_role;

alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists discount_pesewas integer not null default 0 check (discount_pesewas >= 0);
