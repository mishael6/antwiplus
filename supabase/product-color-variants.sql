-- Product color options, per-color product photos, and checkout support.
-- Run this once in the Supabase SQL Editor after deploying the matching app code.

create table if not exists public.product_color_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  image_url text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

-- Repair installations where this table existed before the UUID default was added.
alter table public.product_color_variants
  alter column id set default gen_random_uuid();

create index if not exists product_color_variants_product_sort_idx on public.product_color_variants(product_id, sort_order);
alter table public.product_color_variants
  add column if not exists stock_quantity integer;

-- Backfill each existing product's main photo as its first selectable color.
-- New products are also saved this way by the application.
with products_missing_main_photo as (
  select p.id
  from public.products p
  where p.image_url is not null
    and not exists (
      select 1 from public.product_color_variants v
      where v.product_id = p.id and v.image_url = p.image_url
    )
)
update public.product_color_variants v
set sort_order = v.sort_order + 1
from products_missing_main_photo missing
where v.product_id = missing.id;

insert into public.product_color_variants (product_id, name, hex, image_url, stock_quantity, sort_order)
select p.id,
  case when exists (
    select 1 from public.product_color_variants existing
    where existing.product_id = p.id and existing.name = 'Main photo'
  ) then 'Main photo (' || left(p.id::text, 6) || ')' else 'Main photo' end,
  '#245b86', p.image_url, p.stock_quantity, 0
from public.products p
where p.image_url is not null
  and not exists (
    select 1 from public.product_color_variants v
    where v.product_id = p.id and v.image_url = p.image_url
  );

-- Preserve each legacy product's stock on its main photo color; other old colors
-- start at zero until the admin assigns their individual quantities.
with ranked_variants as (
  select v.id, p.stock_quantity as product_stock,
    row_number() over (partition by v.product_id order by (v.image_url = p.image_url) desc, v.sort_order, v.created_at, v.id) as color_rank
  from public.product_color_variants v
  join public.products p on p.id = v.product_id
)
update public.product_color_variants v
set stock_quantity = case when ranked.color_rank = 1 then ranked.product_stock else 0 end
from ranked_variants ranked
where v.id = ranked.id and v.stock_quantity is null;

alter table public.product_color_variants
  alter column stock_quantity set default 0,
  alter column stock_quantity set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_color_variants_stock_quantity_check') then
    alter table public.product_color_variants
      add constraint product_color_variants_stock_quantity_check check (stock_quantity >= 0);
  end if;
end $$;

alter table public.product_color_variants enable row level security;
grant select on public.product_color_variants to anon, authenticated;
grant insert, update, delete on public.product_color_variants to authenticated;
grant select, insert, update, delete on public.product_color_variants to service_role;
drop policy if exists "Anyone can view colors for active products" on public.product_color_variants;
create policy "Anyone can view colors for active products" on public.product_color_variants
for select using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true));
drop policy if exists "Admins can view all product colors" on public.product_color_variants;
create policy "Admins can view all product colors" on public.product_color_variants
for select to authenticated using (public.has_admin_feature('products'));
drop policy if exists "Admins can insert product colors" on public.product_color_variants;
create policy "Admins can insert product colors" on public.product_color_variants
for insert to authenticated with check (public.has_admin_feature('products'));
drop policy if exists "Admins can update product colors" on public.product_color_variants;
create policy "Admins can update product colors" on public.product_color_variants
for update to authenticated using (public.has_admin_feature('products')) with check (public.has_admin_feature('products'));
drop policy if exists "Admins can delete product colors" on public.product_color_variants;
create policy "Admins can delete product colors" on public.product_color_variants
for delete to authenticated using (public.has_admin_feature('products'));

-- The order function validates the selected color against the product and records it in order history.
create or replace function public.create_cash_order(
  p_email text, p_full_name text, p_phone text, p_address text, p_city text, p_region text,
  p_items jsonb, p_customer_id uuid, p_discount_code text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry jsonb;
  v_product public.products%rowtype;
  v_variant public.product_color_variants%rowtype;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_seen text[] := array[]::text[];
  v_item_key text;
  v_order_id uuid;
  v_discount record;
  v_discount_pesewas integer := 0;
  v_discount_applied boolean := false;
  v_product_has_variants boolean;
begin
  if p_email is null or length(trim(p_email)) > 254 or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or nullif(trim(p_full_name), '') is null or length(p_full_name) > 160
     or nullif(trim(p_phone), '') is null or length(p_phone) > 40
     or nullif(trim(p_address), '') is null or length(p_address) > 500
     or nullif(trim(p_city), '') is null or length(p_city) > 120
     or nullif(trim(p_region), '') is null or length(p_region) > 120 then
    raise exception 'Invalid customer details';
  end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Invalid cart';
  end if;

  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    v_variant := null;
    begin
      v_product_id := (v_entry ->> 'product_id')::uuid;
      v_quantity := (v_entry ->> 'quantity')::integer;
      v_variant_id := nullif(v_entry ->> 'variant_id', '')::uuid;
    exception when others then
      raise exception 'Invalid cart item';
    end;
    v_item_key := v_product_id::text || ':' || coalesce(v_variant_id::text, 'default');
    if v_quantity < 1 or v_quantity > 20 or v_item_key = any(v_seen) then
      raise exception 'Invalid cart quantity';
    end if;
    v_seen := array_append(v_seen, v_item_key);

    select * into v_product from public.products where id = v_product_id and is_active = true for update;
    if not found then raise exception 'Product is unavailable'; end if;
    select exists(select 1 from public.product_color_variants where product_id = v_product_id) into v_product_has_variants;
    if v_variant_id is not null then
      select * into v_variant from public.product_color_variants where id = v_variant_id and product_id = v_product_id for update;
      if not found then raise exception 'Selected product color is unavailable'; end if;
      if v_variant.stock_quantity < v_quantity then raise exception 'Selected product color is out of stock'; end if;
    elsif v_product_has_variants then
      raise exception 'Please choose a product color';
    elsif v_product.stock_quantity < v_quantity then
      raise exception 'One or more products are out of stock';
    end if;

    v_total := v_total + v_product.price_pesewas * v_quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name, 'slug', v_product.slug,
      'quantity', v_quantity, 'unit_price_pesewas', v_product.price_pesewas,
      'variant_id', v_variant.id, 'variant_name', v_variant.name,
      'variant_hex', v_variant.hex, 'variant_image_url', v_variant.image_url
    ));
    if v_variant_id is not null then
      update public.product_color_variants set stock_quantity = stock_quantity - v_quantity where id = v_variant.id;
      update public.products set stock_quantity = greatest(0, stock_quantity - v_quantity) where id = v_product.id;
    else
      update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id;
    end if;
  end loop;

  if nullif(trim(p_discount_code), '') is not null then
    select * into v_discount from public.discount_codes
      where code = upper(trim(p_discount_code)) and is_active = true
        and (expires_at is null or expires_at > now()) for update;
    if not found then raise exception 'Discount code is invalid or expired'; end if;
    if v_total < v_discount.minimum_order_pesewas then raise exception 'Discount minimum order not met'; end if;
    if v_discount.usage_limit is not null and v_discount.usage_count >= v_discount.usage_limit then
      raise exception 'Discount code usage limit reached';
    end if;
    v_discount_pesewas := case when v_discount.discount_type = 'percent'
      then floor(v_total * v_discount.discount_value / 100.0)::integer
      else least(v_total, v_discount.discount_value) end;
    v_total := greatest(0, v_total - v_discount_pesewas);
    v_discount_applied := true;
  end if;

  insert into public.orders (customer_id, customer_email, items, total_pesewas, status, delivery_address, discount_code, discount_pesewas)
  values (p_customer_id, lower(trim(p_email)), v_order_items, v_total, 'pending',
    jsonb_build_object('full_name', trim(p_full_name), 'phone', trim(p_phone), 'address', trim(p_address), 'city', trim(p_city), 'region', trim(p_region)),
    case when nullif(trim(p_discount_code), '') is null then null else upper(trim(p_discount_code)) end, v_discount_pesewas)
  returning id into v_order_id;
  if v_discount_applied then update public.discount_codes set usage_count = usage_count + 1 where id = v_discount.id; end if;
  return v_order_id;
end;
$$;

revoke all on function public.create_cash_order(text, text, text, text, text, text, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.create_cash_order(text, text, text, text, text, text, jsonb, uuid, text) to service_role;
grant select, update on public.products to service_role;
grant insert, update on public.orders to service_role;
