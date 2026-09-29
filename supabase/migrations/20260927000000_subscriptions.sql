-- Who has Shory Pro. RevenueCat (App Store purchases) is the source of truth; the
-- `revenuecat-webhook` and `subscription` Edge Functions copy its state here after re-reading it
-- from RevenueCat's API. The app can only read its own row: nobody can grant themselves Pro.

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  -- RevenueCat period type of the active entitlement: 'trial', 'intro' or 'normal'.
  period_type text,
  product_id text,
  expires_at timestamptz,
  will_renew boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users read their own subscription" on public.subscriptions;
create policy "Users read their own subscription"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- True while the user's Pro entitlement is active. Used by other Edge Functions to gate Pro-only
-- server features.
create or replace function public.is_pro(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.plan = 'pro'
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

revoke all on function public.is_pro(uuid) from public, anon, authenticated;
