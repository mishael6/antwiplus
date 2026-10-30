# AntwiPlus

AntwiPlus is a Next.js storefront and starter admin for a Ghana-based online shop. Supabase is the recommended backend: Postgres keeps products, inventory, and orders consistent, while Supabase Auth and Storage cover administrator access and product photos.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the shop or [http://localhost:3000/admin](http://localhost:3000/admin) for admin.

## Connect Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`, then fill in the project URL, publishable key, and `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` locally; your live HTTPS site URL on Vercel) from your setup.
3. Run `supabase/schema.sql` in the Supabase SQL Editor. It creates the catalog and order tables, access policies, the product image bucket, and starter products.
4. For an existing project, run `supabase/admin-access.sql`, `supabase/admin-profiles-activity.sql`, and `supabase/customer-profiles.sql` in the SQL Editor. These scripts can be rerun safely and add admin access, editable profiles, and private photo storage. For a fresh project, use the updated `supabase/schema.sql` instead. The main schema drops existing policies before recreating them, so it can resume after a policy-already-exists error.
5. Create your owner account under Supabase Authentication > Users. Replace `YOUR_OWNER_EMAIL` in `supabase/assign-admin-role.sql`, run the script, then sign in again at `/admin`. This makes that account the first super admin.
6. Set `SUPABASE_SECRET_KEY` in `.env.local` to the project secret key (server only). The super admin uses Team access to create dedicated dashboard emails and temporary passwords, then assigns Overview, Products, and Orders permissions. Admins can change their password under Account & password after signing in. Use a reachable email address if password reset emails may be needed.
7. Run `supabase/checkout.sql` if you have not already enabled guest checkout, then run `supabase/order-tracking.sql` in the SQL Editor to add tracking references, status history, secure guest lookup, and fulfillment fields. Run `supabase/promotions.sql` and `supabase/store-settings.sql`, then rerun the updated `supabase/checkout.sql` so checkout can validate and apply discounts.
8. In Supabase Authentication > URL Configuration, add both your local and live site URLs to the allowed redirect URLs (including `/auth/callback`). For local testing, Supabase's built-in sender only reaches Supabase organization team addresses and is rate-limited. For customer sign-up and password-reset emails, set up Resend SMTP under Authentication > Emails > SMTP Settings: Host `smtp.resend.com`, Port `465`, Username `resend`, Password your Resend API key, and Sender email an address on your verified sending domain. Customer accounts can view their order timeline and courier tracking under `/account`; guest orders link to a customer account after its email is confirmed.
9. Optional order emails use the Resend API. Add `RESEND_API_KEY` and `STORE_EMAIL_FROM` to the Vercel environment after creating a Resend account and verifying a domain you control. The app sends order confirmations and delivery-status updates when configured; missing or temporarily unavailable email settings never prevent an order from being placed. `STORE_EMAIL_FROM` must use the verified domain, for example `AntwiPlus Orders <orders@yourdomain.com>`. Resend's free plan currently permits 3,000 emails/month with a daily limit of 100. A provider account can be created before the client inbox exists, but customer delivery requires the verified domain and sender. Promotions and restock campaigns are not sent by this transactional email integration.

The admin dashboard includes overview, product editing, stock control, order fulfillment, customer order history, discount codes, editable storefront messages and support contacts, sales reporting with CSV export, per-admin profile details and private profile photos, and super-admin team permissions and activity history. The overview reports system notices and order-aware business advice based on actual store activity. Existing projects should run `supabase/admin-access.sql` and `supabase/admin-profiles-activity.sql`. The admin palette uses AntwiPlus blue and yellow. The app uses the Supabase SSR cookie pattern. Never add a Supabase secret/service-role key to `NEXT_PUBLIC_*` variables or commit `.env.local`.

## Backend options

- **Supabase (recommended):** managed Postgres, Auth, Storage, SQL constraints, and row-level security in one service. Its free tier currently includes 500 MB database, 1 GB file storage, and 50,000 monthly active users. Free projects pause after a week of inactivity and are limited to two active projects, so plan to upgrade before depending on it for a live shop.
- **Firebase:** a solid option if you want Google’s managed services and realtime document updates. The no-cost Spark plan currently includes 1 GiB Firestore storage, 50,000 document reads per day, and 20,000 writes per day. Firestore is document-based, so order lines and product inventory relationships take more deliberate modeling than in SQL.

## Current scope

The storefront supports guest cash-on-delivery checkout, customer accounts with editable name, phone, and private profile photo, and guest order tracking by order reference plus checkout email and phone. Admins with Orders access can update fulfillment status and courier tracking details. Online payment processing is not implemented yet.
