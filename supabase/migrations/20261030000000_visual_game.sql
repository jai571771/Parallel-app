-- PARALLEL v2 — visual scenarios + Duolingo-style game layer (XP, streaks, badges, daily cards)

-- ───────────────────────── visual scenario fields ─────────────────────────
alter table public.scenarios
  add column emoji  text,
  add column scene  text,
  add column meters jsonb not null default '{}',
  add column pros   jsonb not null default '[]',
  add column cons   jsonb not null default '[]';

-- ───────────────────────── game state ─────────────────────────
create table public.game_state (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  xp              int  not null default 0,
  streak          int  not null default 0,
  longest_streak  int  not null default 0,
  last_active_day date,
  freezes         int  not null default 0,
  daily_goal      int  not null default 30,
  reminder_time   text,             -- 'HH:MM' local time, null = off
  timezone        text not null default 'Asia/Kolkata',
  updated_at      timestamptz not null default now()
);

create table public.xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  ref_id     text not null,
  amount     int  not null,
  day        date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);
create index xp_events_user_day_idx on public.xp_events (user_id, day);

create table public.badges (
  user_id   uuid not null references auth.users (id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.daily_cards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  source     text not null check (source in ('ai', 'deck')),
  category   text not null,
  emoji      text not null default '🔮',
  question   text not null,
  option_a   jsonb not null,
  option_b   jsonb not null,
  pip_says   text,
  chosen     text check (chosen in ('a', 'b')),
  chosen_at  timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- Existing users get a game_state row; new users get one from the signup trigger.
insert into public.game_state (user_id) select id from auth.users on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));
  insert into public.game_state (user_id) values (new.id);
  return new;
end;
$$;

-- ───────────────────────── RLS ─────────────────────────
alter table public.game_state  enable row level security;
alter table public.xp_events   enable row level security;
alter table public.badges      enable row level security;
alter table public.daily_cards enable row level security;

create policy "own game: read"   on public.game_state  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own xp: read"     on public.xp_events   for select to authenticated using ((select auth.uid()) = user_id);
create policy "own badges: read" on public.badges      for select to authenticated using ((select auth.uid()) = user_id);
create policy "own cards: read"  on public.daily_cards for select to authenticated using ((select auth.uid()) = user_id);

-- Only the reminder time / timezone are user-editable directly.
create or replace function public.set_game_prefs(p_reminder_time text, p_timezone text)
returns void
language sql
security definer set search_path = ''
as $$
  update public.game_state
     set reminder_time = nullif(p_reminder_time, ''),
         timezone = coalesce(nullif(p_timezone, ''), timezone),
         updated_at = now()
   where user_id = auth.uid();
$$;

-- ───────────────────────── levels ─────────────────────────
-- Keep in sync with LEVELS in src/lib/game.ts
create or replace function public.level_for(p_xp int)
returns int
language sql immutable
as $$
  select case
    when p_xp >= 3000 then 5
    when p_xp >= 1500 then 4
    when p_xp >= 700  then 3
    when p_xp >= 300  then 2
    when p_xp >= 100  then 1
    else 0 end;
$$;

-- ───────────────────────── award_xp ─────────────────────────
-- The single place XP, streaks, freezes and badges change. Each (kind, ref) pays out once,
-- and the ref must point at something the user really did.
create or replace function public.award_xp(p_kind text, p_ref text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_amount    int;
  v_valid     boolean;
  v_gs        public.game_state;
  v_today     date;
  v_gained    int := 0;
  v_extended  boolean := false;
  v_freeze    boolean := false;
  v_old_level int;
  v_new_level int;
  v_today_xp  int;
  v_badges    text[] := '{}';
  v_b         text;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  v_amount := case p_kind
    when 'welcome'    then 20
    when 'daily_card' then 10
    when 'task_done'  then 10
    when 'milestone'  then 25
    when 'checkin'    then 5
    when 'snapshot'   then 20
    when 'story'      then 10
    when 'share'      then 15
    when 'plan'       then 15
    else null end;
  if v_amount is null then raise exception 'unknown xp kind %', p_kind; end if;

  -- Validate the reference belongs to the caller and the action really happened.
  v_valid := case p_kind
    when 'welcome'    then p_ref = 'welcome'
    when 'daily_card' then exists (select 1 from public.daily_cards where id::text = p_ref and user_id = v_uid and chosen is not null)
    when 'task_done'  then exists (select 1 from public.plan_tasks where id::text = p_ref and user_id = v_uid and done)
    when 'milestone'  then exists (select 1 from public.plan_tasks where id::text = p_ref and user_id = v_uid and done and is_milestone)
    when 'checkin'    then exists (select 1 from public.checkins where id::text = p_ref and user_id = v_uid)
    when 'snapshot'   then exists (select 1 from public.snapshots where id::text = p_ref and user_id = v_uid)
    when 'story'      then exists (select 1 from public.scenarios where id::text = p_ref and user_id = v_uid and narrative is not null)
    when 'share'      then exists (select 1 from public.snapshots where id::text = p_ref and user_id = v_uid)
    when 'plan'       then exists (select 1 from public.plans where id::text = p_ref and user_id = v_uid)
  end;
  if not coalesce(v_valid, false) then raise exception 'invalid xp reference'; end if;

  insert into public.game_state (user_id) values (v_uid) on conflict do nothing;
  select * into v_gs from public.game_state where user_id = v_uid for update;
  v_today := (now() at time zone coalesce(v_gs.timezone, 'Asia/Kolkata'))::date;
  v_old_level := public.level_for(v_gs.xp);

  insert into public.xp_events (user_id, kind, ref_id, amount, day)
  values (v_uid, p_kind, p_ref, v_amount, v_today)
  on conflict (user_id, kind, ref_id) do nothing;
  if found then v_gained := v_amount; end if;

  if v_gained > 0 then
    v_gs.xp := v_gs.xp + v_gained;

    if v_gs.last_active_day is distinct from v_today then
      v_extended := true;
      if v_gs.last_active_day = v_today - 1 then
        v_gs.streak := v_gs.streak + 1;
      elsif v_gs.last_active_day = v_today - 2 and v_gs.freezes > 0 then
        v_gs.freezes := v_gs.freezes - 1;
        v_gs.streak := v_gs.streak + 1;
        v_freeze := true;
      else
        v_gs.streak := 1;
      end if;
      if v_gs.streak % 7 = 0 then v_gs.freezes := least(v_gs.freezes + 1, 2); end if;
      v_gs.last_active_day := v_today;
      v_gs.longest_streak := greatest(v_gs.longest_streak, v_gs.streak);
    end if;

    update public.game_state
       set xp = v_gs.xp, streak = v_gs.streak, longest_streak = v_gs.longest_streak,
           last_active_day = v_gs.last_active_day, freezes = v_gs.freezes, updated_at = now()
     where user_id = v_uid;
  end if;

  v_new_level := public.level_for(v_gs.xp);
  select coalesce(sum(amount), 0) into v_today_xp from public.xp_events where user_id = v_uid and day = v_today;

  -- Badges
  foreach v_b in array array[
    case when p_kind = 'daily_card' then 'first_whatif' end,
    case when p_kind = 'plan' then 'first_plan' end,
    case when p_kind = 'milestone' then 'first_milestone' end,
    case when p_kind = 'story' then 'first_story' end,
    case when p_kind = 'share' then 'first_share' end,
    case when v_gs.streak >= 3 then 'streak_3' end,
    case when v_gs.streak >= 7 then 'streak_7' end,
    case when v_gs.streak >= 30 then 'streak_30' end,
    case when (select count(*) from public.scenarios where user_id = v_uid) >= 5 then 'explorer_5' end,
    case when v_new_level >= 2 then 'level_pathfinder' end,
    case when v_new_level >= 4 then 'level_builder' end
  ] loop
    if v_b is not null then
      insert into public.badges (user_id, badge_id) values (v_uid, v_b) on conflict do nothing;
      if found then v_badges := v_badges || v_b; end if;
    end if;
  end loop;

  return jsonb_build_object(
    'gained', v_gained,
    'xp', v_gs.xp,
    'level', v_new_level,
    'level_up', v_new_level > v_old_level,
    'streak', v_gs.streak,
    'streak_extended', v_extended,
    'freeze_used', v_freeze,
    'freezes', v_gs.freezes,
    'today_xp', v_today_xp,
    'daily_goal', v_gs.daily_goal,
    'new_badges', to_jsonb(v_badges)
  );
end;
$$;

-- Answer today's What-If card (once) and collect the XP.
create or replace function public.answer_daily_card(p_card uuid, p_choice text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_choice not in ('a', 'b') then raise exception 'invalid choice'; end if;
  update public.daily_cards
     set chosen = p_choice, chosen_at = now()
   where id = p_card and user_id = auth.uid() and chosen is null;
  return public.award_xp('daily_card', p_card::text);
end;
$$;

revoke execute on function public.award_xp(text, text) from public, anon;
revoke execute on function public.answer_daily_card(uuid, text) from public, anon;
revoke execute on function public.set_game_prefs(text, text) from public, anon;
grant execute on function public.award_xp(text, text) to authenticated;
grant execute on function public.answer_daily_card(uuid, text) to authenticated;
grant execute on function public.set_game_prefs(text, text) to authenticated;
