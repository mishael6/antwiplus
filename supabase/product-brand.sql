-- Run once in Supabase SQL Editor to add optional product brand labels.
alter table public.products
  add column if not exists brand text;

comment on column public.products.brand is
  'Optional product brand, searchable from the storefront global search.';
