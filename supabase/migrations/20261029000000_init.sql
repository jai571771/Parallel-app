-- PARALLEL — initial schema
-- Every user-owned table has RLS so a user can only ever see their own rows.

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  age_range       text,
  stage           text,
  interests       text[] not null default '{}',
  ambition        text,
  habits          text,
  strengths       text,
  challenges      text,
  change_goal     text,
  hours_available numeric(3,1),
  plan            text not null default 'free' check (plan in ('free', 'plus')),
  consent_memory  boolean not null default true,
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ───────────────────────── snapshots & scenarios ─────────────────────────
create table public.snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  insight       text,
  horizon_years int  not null check (horizon_years in (1, 3, 5, 10)),
  inputs        jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index snapshots_user_idx on public.snapshots (user_id, created_at desc);

create table public.scenarios (
  id                uuid primary key default gen_random_uuid(),
  snapshot_id       uuid not null references public.snapshots (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  kind              text not null check (kind in ('baseline', 'alternate')),
  position          int  not null default 0,
  title             text not null,
  tagline           text not null default '',
  decision          text,
  premise           text not null default '',
  summary           text not null default '',
  tradeoff          text not null default '',
  what_could_change text not null default '',
  requirements      jsonb not null default '[]',
  risks             jsonb not null default '[]',
  assumptions       jsonb not null default '[]',
  dimensions        jsonb not null default '[]',
  narrative         text,
  created_at        timestamptz not null default now()
);
create index scenarios_snapshot_idx on public.scenarios (snapshot_id, position);
create index scenarios_user_idx on public.scenarios (user_id);

-- ───────────────────────── plans, tasks, check-ins ─────────────────────────
create table public.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  scenario_id uuid references public.scenarios (id) on delete set null,
  title       text not null,
  summary     text,
  review_date date,
  created_at  timestamptz not null default now()
);
create index plans_user_idx on public.plans (user_id, created_at desc);

create table public.plan_tasks (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.plans (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  detail       text,
  week         int  not null default 1,
  is_milestone boolean not null default false,
  done         boolean not null default false,
  done_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index plan_tasks_plan_idx on public.plan_tasks (plan_id);

create table public.checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plan_id    uuid references public.plans (id) on delete set null,
  note       text not null,
  created_at timestamptz not null default now()
);
create index checkins_user_idx on public.checkins (user_id, created_at desc);

-- ───────────────────────── usage (written only by Edge Functions) ─────────────────────────
create table public.usage (
  user_id     uuid not null references auth.users (id) on delete cascade,
  period      text not null, -- 'YYYY-MM'
  generations int  not null default 0,
  primary key (user_id, period)
);

-- ───────────────────────── triggers ─────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Users must not be able to upgrade themselves to Plus from the client.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(), '') <> 'service_role' then
    new.plan = old.plan;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_plan before update on public.profiles
  for each row execute function public.protect_profile_plan();

-- Atomic usage counter, called by Edge Functions with the service role.
create or replace function public.increment_usage(p_user uuid, p_period text)
returns int
language sql
security definer set search_path = ''
as $$
  insert into public.usage (user_id, period, generations)
  values (p_user, p_period, 1)
  on conflict (user_id, period) do update set generations = public.usage.generations + 1
  returning generations;
$$;
revoke execute on function public.increment_usage(uuid, text) from public, anon, authenticated;

-- ───────────────────────── row level security ─────────────────────────
alter table public.profiles   enable row level security;
alter table public.snapshots  enable row level security;
alter table public.scenarios  enable row level security;
alter table public.plans      enable row level security;
alter table public.plan_tasks enable row level security;
alter table public.checkins   enable row level security;
alter table public.usage      enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own profile: update" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Snapshots/scenarios/plans are created by Edge Functions; users can read and delete them.
create policy "own snapshots: read"   on public.snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy "own snapshots: delete" on public.snapshots for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own scenarios: read"   on public.scenarios for select to authenticated using ((select auth.uid()) = user_id);
create policy "own scenarios: delete" on public.scenarios for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own plans: read"   on public.plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "own plans: delete" on public.plans for delete to authenticated using ((select auth.uid()) = user_id);

create policy "own tasks: all" on public.plan_tasks for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = (select auth.uid()))
  );

create policy "own checkins: all" on public.checkins for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own usage: read" on public.usage for select to authenticated using ((select auth.uid()) = user_id);
