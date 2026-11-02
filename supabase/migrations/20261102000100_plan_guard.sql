-- Only app users (signed-in or anonymous API callers) are blocked from changing their plan.
-- The service role (Edge Functions) and the dashboard SQL editor can still set it.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.plan is distinct from old.plan or new.plus_until is distinct from old.plus_until)
     and coalesce(auth.role(), '') in ('authenticated', 'anon') then
    new.plan = old.plan;
    new.plus_until = old.plus_until;
  end if;
  return new;
end;
$$;
