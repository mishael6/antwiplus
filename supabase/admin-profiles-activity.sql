-- Admin profile fields, private avatar storage, and super-admin activity history.
alter table public.admin_access add column if not exists display_name text;
alter table public.admin_access add column if not exists phone text;
alter table public.admin_access add column if not exists avatar_path text;

create table if not exists public.admin_activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.admin_access(user_id) on delete set null,
  actor_email text not null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_logs_created_at_idx on public.admin_activity_logs (created_at desc);
alter table public.admin_activity_logs enable row level security;
revoke all on public.admin_activity_logs from anon, authenticated;
grant select, insert on public.admin_activity_logs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-avatars', 'admin-avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Admins upload own avatar" on storage.objects;
create policy "Admins upload own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'admin-avatars' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.admin_access a where a.user_id = auth.uid()));
drop policy if exists "Admins update own avatar" on storage.objects;
create policy "Admins update own avatar" on storage.objects for update to authenticated
using (bucket_id = 'admin-avatars' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.admin_access a where a.user_id = auth.uid()))
with check (bucket_id = 'admin-avatars' and (storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.admin_access a where a.user_id = auth.uid()));
drop policy if exists "Admins view own avatar" on storage.objects;
create policy "Admins view own avatar" on storage.objects for select to authenticated
using (bucket_id = 'admin-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

