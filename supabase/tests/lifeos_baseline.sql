-- The part of the live lifeos schema the goal-room migrations build on, copied from the
-- production definitions (2026-10-17), plus Supabase's roles and auth.uid(). Only for testing
-- the migrations on a plain local Postgres; never apply it to a Supabase project.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table auth.users (id uuid primary key);

create table public.lifeos_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id),
  display_name text not null default 'Dragon'
);
create table public.lifeos_goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.lifeos_profiles (id),
  title text not null check (length(btrim(title)) > 0),
  why text not null default '',
  success_definition text not null default '',
  target_date date,
  completed_at timestamptz,
  archived_at timestamptz,
  status text not null default 'backlog' check (status = any (array['backlog', 'active',
    'paused', 'completed', 'cancelled', 'archived'])),
  check (status <> 'archived' or archived_at is not null),
  check (status <> 'completed' or completed_at is not null),
  unique (id, profile_id)
);
-- What hangs off a goal, reduced to the keys (the real tables hold much more).
do $$
declare t text;
begin
  foreach t in array array['lifeos_goal_tasks', 'lifeos_goal_milestones', 'lifeos_goal_metrics',
                           'lifeos_goal_media']
  loop
    execute format('create table public.%I (id uuid primary key default gen_random_uuid(),
      profile_id uuid not null, goal_id uuid not null, foreign key (goal_id, profile_id)
      references public.lifeos_goals (id, profile_id) on delete cascade)', t);
  end loop;
  foreach t in array array['lifeos_goal_evidence', 'lifeos_goal_reflections']
  loop
    execute format('create table public.%I (id uuid primary key default gen_random_uuid(),
      profile_id uuid not null, goal_id uuid, foreign key (goal_id, profile_id)
      references public.lifeos_goals (id, profile_id))', t);
  end loop;
end $$;
create table public.lifeos_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.lifeos_profiles (id),
  event_type text not null,
  event_time timestamptz not null default now(),
  source text not null default 'chatgpt',
  payload jsonb not null default '{}'::jsonb
);

create function public.lifeos_is_profile_owner(target_profile_id uuid) returns boolean
language sql stable set search_path to 'public' as $$
  select exists (
    select 1 from public.lifeos_profiles p
    where p.id = target_profile_id and p.user_id = (select auth.uid())
  );
$$;
create function public.lifeos_set_updated_at() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create function public.lifeos_prevent_history_mutation() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  raise exception '% is append-only; insert a superseding record instead', tg_table_name;
end;
$$;
-- As live: every goal insert and status change is an event (source dragonos).
create function public.lifeos_record_goal_domain_event() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;
  insert into public.lifeos_events (profile_id, event_type, source, payload)
  values (new.profile_id,
          case when tg_op = 'INSERT' then 'goal.created' else 'goal.status_changed' end,
          'dragonos', jsonb_build_object('goal_id', new.id, 'new_status', new.status));
  return new;
end;
$$;
create trigger lifeos_goals_status_event after insert or update on public.lifeos_goals
  for each row execute function public.lifeos_record_goal_domain_event();
grant execute on function public.lifeos_is_profile_owner(uuid) to authenticated;
grant select on public.lifeos_profiles, public.lifeos_goals, public.lifeos_events
  to authenticated;
alter table public.lifeos_profiles enable row level security;
alter table public.lifeos_goals enable row level security;
alter table public.lifeos_events enable row level security;
create policy goals_select_own on public.lifeos_goals for select to authenticated
  using (public.lifeos_is_profile_owner(profile_id));
create policy profiles_select_own on public.lifeos_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
