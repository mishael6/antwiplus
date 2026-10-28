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
2. Copy `.env.example` to `.env.local`, then fill in the project URL and publishable key from the Supabase project API settings.
3. Run `supabase/schema.sql` in the Supabase SQL Editor. It creates the catalog and order tables, access policies, the product image bucket, and starter products.
4. In Supabase Authentication, create your own email and password user. Then replace `YOUR_ADMIN_EMAIL` in `supabase/assign-admin-role.sql`, run it in the SQL Editor, and sign out and back in at `/admin`.

The app uses the Supabase SSR cookie pattern. Never add a Supabase secret/service-role key to `NEXT_PUBLIC_*` variables or commit `.env.local`.

## Backend options

- **Supabase (recommended):** managed Postgres, Auth, Storage, SQL constraints, and row-level security in one service. Its free tier currently includes 500 MB database, 1 GB file storage, and 50,000 monthly active users. Free projects pause after a week of inactivity and are limited to two active projects, so plan to upgrade before depending on it for a live shop.
- **Firebase:** a solid option if you want Google’s managed services and realtime document updates. The no-cost Spark plan currently includes 1 GiB Firestore storage, 50,000 document reads per day, and 20,000 writes per day. Firestore is document-based, so order lines and product inventory relationships take more deliberate modeling than in SQL.

## Current scope

The storefront can read active products from Supabase, with local sample content as a fallback. Admin supports password sign-in, product listing, adding and publishing products, hiding products, low-stock counts, and recent-order viewing. Checkout, payments, order creation and fulfillment, customer accounts, and direct image uploads are not implemented yet.
