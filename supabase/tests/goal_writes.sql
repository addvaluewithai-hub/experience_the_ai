-- The Chairman's goal writes (adding a goal and changing its state; deleting stays the
-- person's own, in LifeOS), as the signed-in person and as someone else. Run after
-- lifeos_baseline.sql and every migration, with psql -v ON_ERROR_STOP=1. It prints
-- "goal writes: all checks passed".

create function pg_temp.fails(statement text, needle text) returns void
language plpgsql as $$
begin
  execute statement;
  raise exception 'expected failure (%), but it ran: %', needle, statement;
exception when others then
  if sqlerrm not like '%' || needle || '%' then
    raise exception 'expected "%", got "%" from: %', needle, sqlerrm, statement;
  end if;
end $$;
create function pg_temp.equals(statement text, expected text) returns void
language plpgsql as $$
declare actual text;
begin
  execute statement into actual;
  if actual is distinct from expected then
    raise exception 'expected %, got % from: %', expected, actual, statement;
  end if;
end $$;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.lifeos_profiles (id, user_id) values
  ('a0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a'),
  ('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b');
insert into public.lifeos_goals (id, profile_id, title, status) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Planned', 'active'),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'Theirs', 'active');
insert into public.lifeos_goal_tasks (profile_id, goal_id) values
  ('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
-- Adding: a title, and only backlog or active.
create temp table g as select public.lifeos_create_goal('  Speak Spanish  ', 'Travel',
  'Hold a conversation', '2027-03-01', null) id;
select pg_temp.equals($$select title || '/' || status from public.lifeos_goals
  where id = (select id from g)$$, 'Speak Spanish/backlog');
select pg_temp.fails($$select public.lifeos_create_goal(' ', '', '', null, 'active')$$, 'title');
select pg_temp.fails($$select public.lifeos_create_goal('X', '', '', null, 'archived')$$,
  'backlog or active');

-- States: pause, resume, complete and archive set and clear their timestamps.
select public.lifeos_set_goal_status((select id from g), 'paused');
select public.lifeos_set_goal_status((select id from g), 'archived');
select pg_temp.equals($$select (archived_at is not null)::text from public.lifeos_goals
  where id = (select id from g)$$, 'true');
select public.lifeos_set_goal_status((select id from g), 'backlog');
select pg_temp.equals($$select (archived_at is null)::text from public.lifeos_goals
  where id = (select id from g)$$, 'true');
select public.lifeos_set_goal_status((select id from g), 'completed');
select pg_temp.fails($$select public.lifeos_set_goal_status((select id from g), 'deleted')$$,
  'can be active');
select pg_temp.fails($$select public.lifeos_set_goal_status(
  'b1000000-0000-0000-0000-000000000000', 'paused')$$, 'not owned');

-- Still no direct writes.
select pg_temp.fails($$update public.lifeos_goals set status = 'paused'$$, 'permission denied');
reset role;
select pg_temp.equals($$select string_agg(event_type, ',' order by id) from public.lifeos_events$$,
  'goal.created,goal.created,goal.created,goal.status_changed,goal.status_changed,goal.status_changed,goal.status_changed');
select pg_temp.equals($$select status from public.lifeos_goals
  where id = 'b1000000-0000-0000-0000-000000000000'$$, 'active');

set role anon;
select pg_temp.fails($$select public.lifeos_create_goal('X', '', '', null, null)$$,
  'permission denied');
reset role;
select 'goal writes: all checks passed' as result;
