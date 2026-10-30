-- Run on an existing AntwiPlus Supabase project to enable buyer profiles.
alter table public.admin_access enable row level security;
drop policy if exists "Admins can view own access" on public.admin_access;
create policy "Admins can view own access" on public.admin_access for select to authenticated
using (user_id = (select auth.uid()));

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 80),
  phone text,
  avatar_path text,
  updated_at timestamptz not null default now()
);
alter table public.customer_profiles enable row level security;
grant select, insert, update on public.customer_profiles to authenticated;
drop policy if exists "Customers manage own profile" on public.customer_profiles;
create policy "Customers manage own profile" on public.customer_profiles for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('customer-avatars', 'customer-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

