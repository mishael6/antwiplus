-- Cash-on-delivery order creation. Run once in the Supabase SQL Editor.
-- Prices and stock are read and updated in the database; browser totals are never trusted.
drop function if exists public.create_cash_order(text, text, text, text, text, text, jsonb);
drop function if exists public.create_cash_order(text, text, text, text, text, text, jsonb, uuid);
create or replace function public.create_cash_order(
  p_email text,
  p_full_name text,
  p_phone text,
  p_address text,
  p_city text,
  p_region text,
  p_items jsonb,
  p_customer_id uuid,
  p_discount_code text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_entry jsonb;
  v_product public.products%rowtype;
  v_product_id uuid;
  v_quantity integer;
  v_total integer := 0;
  v_order_items jsonb := '[]'::jsonb;
  v_seen uuid[] := array[]::uuid[];
  v_order_id uuid;
  v_discount record;
  v_discount_pesewas integer := 0;
  v_discount_applied boolean := false;
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
    begin
      v_product_id := (v_entry ->> 'product_id')::uuid;
      v_quantity := (v_entry ->> 'quantity')::integer;
    exception when others then
      raise exception 'Invalid cart item';
    end;
    if v_quantity < 1 or v_quantity > 20 or v_product_id = any(v_seen) then
      raise exception 'Invalid cart quantity';
    end if;
    v_seen := array_append(v_seen, v_product_id);

    select * into v_product from public.products
      where id = v_product_id and is_active = true for update;
    if not found or v_product.stock_quantity < v_quantity then
      raise exception 'One or more products are out of stock';
    end if;

    v_total := v_total + v_product.price_pesewas * v_quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'slug', v_product.slug,
      'quantity', v_quantity,
      'unit_price_pesewas', v_product.price_pesewas
    ));
    update public.products set stock_quantity = stock_quantity - v_quantity where id = v_product.id;
  end loop;

  if nullif(trim(p_discount_code), '') is not null then
    select * into v_discount from public.discount_codes
      where code = upper(trim(p_discount_code)) and is_active = true
        and (expires_at is null or expires_at > now())
      for update;
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
  values (
    p_customer_id, lower(trim(p_email)), v_order_items, v_total, 'pending',
    jsonb_build_object('full_name', trim(p_full_name), 'phone', trim(p_phone), 'address', trim(p_address), 'city', trim(p_city), 'region', trim(p_region)),
    case when nullif(trim(p_discount_code), '') is null then null else upper(trim(p_discount_code)) end,
    v_discount_pesewas
  ) returning id into v_order_id;
  if v_discount_applied then
    update public.discount_codes set usage_count = usage_count + 1 where id = v_discount.id;
  end if;
  return v_order_id;
end;
$$;

revoke all on function public.create_cash_order(text, text, text, text, text, text, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.create_cash_order(text, text, text, text, text, text, jsonb, uuid, text) to service_role;
grant select, update on public.products to service_role;
grant insert, update on public.orders to service_role;

drop policy if exists "Customers can view own orders" on public.orders;
create policy "Customers can view own orders" on public.orders
for select to authenticated using (customer_id = (select auth.uid()));
