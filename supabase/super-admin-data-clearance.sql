-- Optional data cleanup controls for AntwiPlus.
-- Run this in the Supabase SQL Editor before using Settings > Data cleanup.
-- The function removes selected store data in one transaction and never deletes
-- auth users or rows from admin_access.

create or replace function public.super_admin_clear_store_data(
  p_actor_id uuid,
  p_confirmation text,
  p_clear jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_count bigint;
  v_deleted_orders bigint := 0;
  v_order_id uuid;
  v_actor_email text;
  v_step text := 'validate';
  v_original_error text;
begin
  if p_confirmation <> 'CLEAR ANTWIPLUS DATA' then
    raise exception 'Confirmation phrase did not match.' using errcode = '22023';
  end if;

  select email into v_actor_email
  from public.admin_access
  where user_id = p_actor_id and role = 'super_admin';

  if v_actor_email is null then
    raise exception 'Only a super admin can clear store data.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_clear) <> 'object' then
    raise exception 'Invalid cleanup selection.' using errcode = '22023';
  end if;

  if coalesce(p_clear ->> 'orders', 'false') = 'true' then
    -- Delete individually so order-side triggers that maintain related data
    -- never receive a multi-row DELETE statement with repeated target rows.
    for v_order_id in select id from public.orders loop
      v_step := 'clear orders one at a time';
      delete from public.orders where id = v_order_id;
      get diagnostics v_count = row_count;
      v_deleted_orders := v_deleted_orders + v_count;
    end loop;
    v_result := v_result || jsonb_build_object('orders', v_deleted_orders);
    if to_regclass('public.customer_referral_events') is not null then
      v_step := 'clear order referral events';
      execute 'delete from public.customer_referral_events where event_type = ''order''';
      get diagnostics v_count = row_count;
      v_result := v_result || jsonb_build_object('order_referral_events', v_count);
    end if;
  end if;

  if coalesce(p_clear ->> 'products', 'false') = 'true' then
    v_step := 'clear products';
    delete from public.products where true;
    get diagnostics v_count = row_count;
    v_result := v_result || jsonb_build_object('products', v_count);
  end if;

  if coalesce(p_clear ->> 'customers', 'false') = 'true' then
    if to_regclass('public.customer_referral_events') is not null then
      v_step := 'clear customer referral events';
      execute 'delete from public.customer_referral_events where true';
      get diagnostics v_count = row_count;
      v_result := v_result || jsonb_build_object('referral_events', v_count);
    end if;
    if to_regclass('public.customer_referral_codes') is not null then
      v_step := 'clear customer referral codes';
      execute 'delete from public.customer_referral_codes where true';
      get diagnostics v_count = row_count;
      v_result := v_result || jsonb_build_object('referral_codes', v_count);
    end if;
    if to_regclass('public.customer_profiles') is not null then
      v_step := 'clear customer profiles';
      execute 'delete from public.customer_profiles where true';
      get diagnostics v_count = row_count;
      v_result := v_result || jsonb_build_object('customer_profiles', v_count);
    end if;
  end if;

  if coalesce(p_clear ->> 'discounts', 'false') = 'true'
     and to_regclass('public.discount_codes') is not null then
    v_step := 'clear discounts';
    execute 'delete from public.discount_codes where true';
    get diagnostics v_count = row_count;
    v_result := v_result || jsonb_build_object('discount_codes', v_count);
  end if;

  if coalesce(p_clear ->> 'activity', 'false') = 'true'
     and to_regclass('public.admin_activity_logs') is not null then
    -- Keep audit events created by all super-admin accounts.
    v_step := 'clear non-super-admin activity logs';
    execute 'delete from public.admin_activity_logs log where log.actor_id is null or not exists (select 1 from public.admin_access aa where aa.user_id = log.actor_id and aa.role = ''super_admin'')';
    get diagnostics v_count = row_count;
    v_result := v_result || jsonb_build_object('admin_activity_logs', v_count);
  end if;

  if coalesce(p_clear ->> 'store_settings', 'false') = 'true'
     and to_regclass('public.store_settings') is not null then
    v_step := 'reset store settings';
    execute $settings$
      update public.store_settings
      set announcement = 'Thoughtful finds for your everyday',
          delivery_note = 'Delivery across Ghana',
          support_email = '',
          support_phone = '',
          updated_at = now()
      where id = true
    $settings$;
    get diagnostics v_count = row_count;
    v_result := v_result || jsonb_build_object('store_settings_reset', v_count);
  end if;

  -- Preserve an audit record of the cleanup, even when old activity is cleared.
  if to_regclass('public.admin_activity_logs') is not null then
    v_step := 'write cleanup audit record';
    insert into public.admin_activity_logs(actor_id, actor_email, action, entity_type, summary)
    values (p_actor_id, v_actor_email, 'store_data_cleared', 'store_data', 'Cleared selected store data from the super admin settings.');
  end if;

  return v_result;
exception when others then
  get stacked diagnostics v_original_error = message_text;
  raise exception using
    errcode = sqlstate,
    message = format('Cleanup failed during step "%s": %s', v_step, v_original_error),
    hint = 'The transaction was rolled back. Check the cleanup step and underlying database trigger or constraint.';
end;
$$;

revoke all on function public.super_admin_clear_store_data(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.super_admin_clear_store_data(uuid, text, jsonb) to service_role;
