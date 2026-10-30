-- Run once for existing projects. Then run assign-admin-role.sql for the first super admin.
create table if not exists public.admin_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  permissions text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_permissions_valid check (permissions <@ array['overview','products','orders']::text[])
);
alter table public.admin_access add column if not exists must_change_password boolean not null default false;
alter table public.admin_access drop constraint if exists admin_permissions_valid;
alter table public.admin_access add constraint admin_permissions_valid check (permissions <@ array['overview','products','inventory','orders','customers','marketing','reports']::text[]);
alter table public.admin_access enable row level security;
grant select on public.admin_access to authenticated;
drop policy if exists "Admins can view own access" on public.admin_access;
create policy "Admins can view own access" on public.admin_access
for select to authenticated using (user_id = (select auth.uid()));

-- Trusted server service key manages this table; browser users have no write grants.
revoke insert, update, delete on public.admin_access from anon, authenticated;

create or replace function public.has_admin_feature(feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admin_access a
    where a.user_id = (select auth.uid())
      and (a.role = 'super_admin' or feature = any(a.permissions))
  );
$$;
revoke all on function public.has_admin_feature(text) from public;
grant execute on function public.has_admin_feature(text) to authenticated;

drop policy if exists "Admins can view all products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Staff can view all products" on public.products;
create policy "Staff can view all products" on public.products for select to authenticated
using (public.has_admin_feature('products'));
drop policy if exists "Staff can insert products" on public.products;
create policy "Staff can insert products" on public.products for insert to authenticated
with check (public.has_admin_feature('products'));
drop policy if exists "Staff can update products" on public.products;
create policy "Staff can update products" on public.products for update to authenticated
using (public.has_admin_feature('products')) with check (public.has_admin_feature('products'));
drop policy if exists "Staff can delete products" on public.products;
create policy "Staff can delete products" on public.products for delete to authenticated
using (public.has_admin_feature('products'));

drop policy if exists "Admins can view orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
drop policy if exists "Staff can view orders" on public.orders;
create policy "Staff can view orders" on public.orders for select to authenticated
using (public.has_admin_feature('orders'));
drop policy if exists "Staff can update orders" on public.orders;
create policy "Staff can update orders" on public.orders for update to authenticated
using (public.has_admin_feature('orders')) with check (public.has_admin_feature('orders'));

drop policy if exists "Admins can upload product images" on storage.objects;
drop policy if exists "Admins can update product images" on storage.objects;
drop policy if exists "Admins can delete product images" on storage.objects;
drop policy if exists "Staff can upload product images" on storage.objects;
create policy "Staff can upload product images" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.has_admin_feature('products'));
drop policy if exists "Staff can update product images" on storage.objects;
create policy "Staff can update product images" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.has_admin_feature('products'))
with check (bucket_id = 'product-images' and public.has_admin_feature('products'));
drop policy if exists "Staff can delete product images" on storage.objects;
create policy "Staff can delete product images" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.has_admin_feature('products'));
