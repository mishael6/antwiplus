-- AntwiPlus starter schema. Run this once in the Supabase SQL Editor.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category text not null,
  price_pesewas integer not null check (price_pesewas > 0),
  compare_at_pesewas integer check (compare_at_pesewas is null or compare_at_pesewas > price_pesewas),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image_url text,
  visual text not null default 'beauty' check (visual in ('tote', 'headphones', 'candles', 'beauty')),
  tag text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  customer_email text not null,
  items jsonb not null default '[]'::jsonb,
  total_pesewas integer not null check (total_pesewas >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  payment_reference text,
  delivery_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

create index if not exists products_active_created_at_idx on public.products (created_at desc) where is_active = true;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_id_idx on public.orders (customer_id);

create table if not exists public.admin_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('super_admin', 'admin')),
  permissions text[] not null default '{}',
  must_change_password boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_permissions_valid check (permissions <@ array['overview','products','orders']::text[])
);
alter table public.admin_access enable row level security;
grant select on public.admin_access to authenticated;
create policy "Admins can view own access" on public.admin_access for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.admin_access from anon, authenticated;
create or replace function public.has_admin_feature(feature text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_access a where a.user_id = (select auth.uid()) and (a.role = 'super_admin' or feature = any(a.permissions)));
$$;
revoke all on function public.has_admin_feature(text) from public;
grant execute on function public.has_admin_feature(text) to authenticated;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- The Data API requires grants in addition to RLS policies.
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, update on public.orders to authenticated;

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products
for select using (is_active = true);

drop policy if exists "Admins can view all products" on public.products;
create policy "Admins can view all products" on public.products
for select to authenticated using (public.has_admin_feature('products'));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products" on public.products
for insert to authenticated with check (public.has_admin_feature('products'));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products" on public.products
for update to authenticated using (public.has_admin_feature('products'))
with check (public.has_admin_feature('products'));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products" on public.products
for delete to authenticated using (public.has_admin_feature('products'));

drop policy if exists "Admins can view orders" on public.orders;
create policy "Admins can view orders" on public.orders
for select to authenticated using (public.has_admin_feature('orders'));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders" on public.orders
for update to authenticated using (public.has_admin_feature('orders'))
with check (public.has_admin_feature('orders'));

-- Public product images, with uploads restricted to signed-in admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images" on storage.objects
for insert to authenticated with check (bucket_id = 'product-images' and public.has_admin_feature('products'));

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images" on storage.objects
for update to authenticated using (bucket_id = 'product-images' and public.has_admin_feature('products'))
with check (bucket_id = 'product-images' and public.has_admin_feature('products'));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images" on storage.objects
for delete to authenticated using (bucket_id = 'product-images' and public.has_admin_feature('products'));

-- Starter catalog items, so the connected storefront has content immediately.
insert into public.products (name, slug, category, price_pesewas, compare_at_pesewas, stock_quantity, visual, tag, is_active)
values
  ('Everyday carry tote', 'everyday-carry-tote', 'STYLE & ACCESSORIES', 18500, 22000, 20, 'tote', 'BESTSELLER', true),
  ('Studio wireless headphones', 'studio-wireless-headphones', 'TECH & AUDIO', 69000, null, 12, 'headphones', 'JUST IN', true),
  ('Sunday ritual candle set', 'sunday-ritual-candle-set', 'HOME & LIVING', 24000, null, 18, 'candles', null, true),
  ('The good skin essentials kit', 'good-skin-essentials-kit', 'BEAUTY & CARE', 32000, 38000, 9, 'beauty', 'SAVE 16%', true)
on conflict (slug) do nothing;
