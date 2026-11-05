-- Customer referral links and activity tracking.
create table if not exists public.customer_referral_codes (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^AP[A-F0-9]{8}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.customer_referral_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  event_type text not null check (event_type in ('visit', 'signup', 'order')),
  referred_user_id uuid references auth.users(id) on delete set null,
  event_key text,
  created_at timestamptz not null default now()
);

create index if not exists customer_referral_events_owner_date_idx
  on public.customer_referral_events (owner_id, created_at desc);
create unique index if not exists customer_referral_signup_once_idx
  on public.customer_referral_events (referred_user_id)
  where event_type = 'signup' and referred_user_id is not null;
create unique index if not exists customer_referral_order_once_idx
  on public.customer_referral_events (event_key)
  where event_type = 'order' and event_key is not null;

alter table public.customer_referral_codes enable row level security;
alter table public.customer_referral_events enable row level security;
grant select on public.customer_referral_codes, public.customer_referral_events to authenticated;

drop policy if exists "Customers can view own referral code" on public.customer_referral_codes;
create policy "Customers can view own referral code" on public.customer_referral_codes
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists "Customers can view own referral activity" on public.customer_referral_events;
create policy "Customers can view own referral activity" on public.customer_referral_events
  for select to authenticated using (owner_id = (select auth.uid()));
