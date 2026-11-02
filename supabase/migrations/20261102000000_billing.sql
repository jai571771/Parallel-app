-- PARALLEL v3 — Google Play subscriptions (via RevenueCat) drive profiles.plan

alter table public.profiles add column plus_until timestamptz;

-- Webhook deliveries can repeat; each RevenueCat event id is processed once.
create table public.billing_events (
  event_id    text primary key,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security; -- no policies: service role only

-- The only way a plan changes. Called by Edge Functions after checking RevenueCat.
-- (The protect_profile_plan trigger already blocks clients from editing `plan`.)
create or replace function public.set_plan(p_user uuid, p_until timestamptz)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_plan text := case when p_until is not null and p_until > now() then 'plus' else 'free' end;
begin
  update public.profiles
     set plan = v_plan,
         plus_until = p_until
   where id = p_user;
  return v_plan;
end;
$$;

revoke execute on function public.set_plan(uuid, timestamptz) from public, anon, authenticated;
