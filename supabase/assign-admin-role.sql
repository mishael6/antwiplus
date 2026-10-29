-- Replace this with the owner email, then run once after admin-access.sql.
insert into public.admin_access (user_id, email, role, permissions)
select id, email, 'super_admin', '{}'
from auth.users
where lower(email) = lower('mishosmanmensah660@gmail.com')
on conflict (user_id) do update
set email = excluded.email, role = 'super_admin', permissions = '{}', must_change_password = false;
