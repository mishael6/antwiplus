-- Replace the email with the account created in Supabase Authentication > Users.
-- Then sign out and sign back in so the account receives a fresh role claim.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'YOUR_ADMIN_EMAIL';
