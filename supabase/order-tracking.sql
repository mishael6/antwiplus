-- Run once in the Supabase SQL Editor to enable guest order tracking and admin fulfillment updates.
alter table public.orders add column if not exists tracking_reference text;
alter table public.orders add column if not exists tracking_carrier text;
alter table public.orders add column if not exists tracking_code text;
alter table public.orders add column if not exists tracking_url text;

update public.orders
set tracking_reference = 'AP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
where tracking_reference is null;
alter table public.orders alter column tracking_reference set default ('AP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)));
alter table public.orders alter column tracking_reference set not null;
create unique index if not exists orders_tracking_reference_uidx on public.orders (tracking_reference);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'pending', 'confirmed', 'paid', 'processing', 'shipped', 'out_for_delivery',
  'delivered', 'delivery_failed', 'cancelled', 'refunded'
));

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);
alter table public.order_status_history enable row level security;
revoke all on public.order_status_history from anon, authenticated;
grant select, insert on public.order_status_history to service_role;

insert into public.order_status_history(order_id, status, created_at)
select o.id, o.status, o.created_at from public.orders o
where not exists (select 1 from public.order_status_history h where h.order_id = o.id);

create or replace function public.capture_order_status_history()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, status)
    values (new.id, new.status);
  elsif new.status is distinct from old.status then
    insert into public.order_status_history(order_id, status)
    values (new.id, new.status);
  end if;
  return new;
end;
$$;
revoke all on function public.capture_order_status_history() from public, anon, authenticated;
drop trigger if exists orders_capture_status_history on public.orders;
create trigger orders_capture_status_history after insert or update of status on public.orders
for each row execute function public.capture_order_status_history();

create table if not exists public.order_tracking_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.order_tracking_attempts enable row level security;
revoke all on public.order_tracking_attempts from anon, authenticated;
grant select, insert, update on public.order_tracking_attempts to service_role;

create or replace function public.track_guest_order(
  p_reference text,
  p_email text,
  p_phone text,
  p_ip_hash text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_attempts integer;
  v_order record;
  v_events jsonb;
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'not_found');
  end if;

  insert into public.order_tracking_attempts as rate(ip_hash, window_started_at, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    window_started_at = case when rate.window_started_at < now() - interval '15 minutes' then now() else rate.window_started_at end,
    attempts = case when rate.window_started_at < now() - interval '15 minutes' then 1 else rate.attempts + 1 end
  returning rate.attempts into v_attempts;

  if v_attempts > 8 then return jsonb_build_object('error', 'rate_limited'); end if;
  if p_reference is null or p_reference !~* '^AP-[A-F0-9]{16}$'
     or p_email is null or length(trim(p_email)) > 254
     or p_phone is null or length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 7 then
    return jsonb_build_object('error', 'not_found');
  end if;

  select o.tracking_reference, o.status, o.created_at, o.tracking_carrier, o.tracking_code, o.tracking_url
  into v_order
  from public.orders o
  where upper(o.tracking_reference) = upper(trim(p_reference))
    and lower(o.customer_email) = lower(trim(p_email))
    and regexp_replace(coalesce(o.delivery_address ->> 'phone', ''), '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
  limit 1;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  select coalesce(jsonb_agg(jsonb_build_object('status', h.status, 'note', h.note, 'created_at', h.created_at) order by h.created_at), '[]'::jsonb)
  into v_events from public.order_status_history h
  where h.order_id = (select o.id from public.orders o where o.tracking_reference = v_order.tracking_reference);

  return jsonb_build_object(
    'reference', v_order.tracking_reference,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'carrier', v_order.tracking_carrier,
    'tracking_code', v_order.tracking_code,
    'tracking_url', v_order.tracking_url,
    'events', v_events
  );
end;
$$;
revoke all on function public.track_guest_order(text, text, text, text) from public, anon, authenticated;
grant execute on function public.track_guest_order(text, text, text, text) to service_role;
