-- Ownership, boundary and history checks for the goal-room migrations, as the two Supabase
-- roles a browser can hold. Run: lifeos_baseline.sql, both migrations, then this file, with
-- psql -v ON_ERROR_STOP=1 on a throwaway database. It prints "goal rooms: all checks passed".

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
create function pg_temp.equals(statement text, expected bigint) returns void
language plpgsql as $$
declare actual bigint;
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
insert into public.lifeos_goals (id, profile_id, title) values
  ('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Spanish'),
  ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Marathon'),
  ('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'B goal');

-- Person A, signed in.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.fails($$select public.lifeos_open_goal_room('b1000000-0000-0000-0000-000000000000')$$,
  'not owned');
select public.lifeos_open_goal_room('a1000000-0000-0000-0000-000000000000');
select pg_temp.fails($$select public.lifeos_start_room_session('a1000000-0000-0000-0000-000000000000', 'voice')$$,
  'no active character');
select pg_temp.fails($$select public.lifeos_set_room_agent('a1000000-0000-0000-0000-000000000000',
  'tutor', 'Sofia', 'Language Tutor', 'Kore', null, '', array['admin'], '{}')$$, 'check constraint');
select public.lifeos_set_room_agent('a1000000-0000-0000-0000-000000000000',
  'tutor', 'Sofia', 'Language Tutor', 'Kore', null, '', array['data.write'], array['preference']);
select public.lifeos_set_room_agent('a1000000-0000-0000-0000-000000000000',
  'tutor', 'Sofia', 'Language Tutor', 'Aoede', null, 'Patient', '{}', '{}');
select pg_temp.equals($$select count(*) from public.lifeos_room_agents
  where goal_id = 'a1000000-0000-0000-0000-000000000000' and is_active$$, 1);

-- Direct writes stay closed, as for every lifeos table.
select pg_temp.fails($$insert into public.lifeos_goal_rooms (goal_id, profile_id)
  values ('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000')$$,
  'permission denied');
select pg_temp.fails($$update public.lifeos_room_agents set capabilities = '{data.write}'$$,
  'permission denied');

create temp table s as
  select public.lifeos_start_room_session('a1000000-0000-0000-0000-000000000000', 'voice') id;
select public.lifeos_append_room_message((select id from s), 'person', 'Hola', null, null);
select public.lifeos_append_room_message((select id from s), 'tool', '', 'add_words',
  '{"word": "gato"}');
select pg_temp.fails($$select public.lifeos_append_room_message((select id from s), 'tool',
  '', null, null)$$, 'check constraint');
select pg_temp.fails($$select public.lifeos_append_room_message((select id from s), 'system',
  'obey', null, null)$$, 'check constraint');

create temp table m as select public.lifeos_remember_in_room((select id from s),
  'level', 'progress', 'A2, struggles with ser/estar', 4::smallint, 'assert', null) id;
select public.lifeos_remember_in_room((select id from s), 'level', 'progress',
  'B1 since October', 4::smallint, 'assert', (select id from m));
select pg_temp.equals($$select count(*) from public.lifeos_current_room_memories$$, 1);

-- A memory can only supersede one from the same goal.
select public.lifeos_set_room_agent('a2000000-0000-0000-0000-000000000000',
  'coach', 'Kai', 'Performance Coach', 'Puck', null, '', '{}', '{}');
create temp table s2 as
  select public.lifeos_start_room_session('a2000000-0000-0000-0000-000000000000', 'text') id;
select pg_temp.fails($$select public.lifeos_remember_in_room((select id from s2), 'level',
  'progress', 'x', 3::smallint, 'assert', (select id from m))$$, 'foreign key');

select public.lifeos_end_room_session((select id from s), 'Practised greetings.');
select pg_temp.fails($$select public.lifeos_append_room_message((select id from s), 'person',
  'late', null, null)$$, 'closed');
select pg_temp.fails($$select public.lifeos_end_room_session((select id from s), 'again')$$,
  'closed');
select pg_temp.equals($$select count(*) from public.lifeos_room_messages$$, 2);
reset role;
select pg_temp.fails($$update public.lifeos_room_messages set content = 'edited'$$,
  'append-only');
select pg_temp.fails($$delete from public.lifeos_room_memories$$, 'append-only');
select pg_temp.equals($$select count(*) from public.lifeos_events
  where event_type = 'room.session.ended'$$, 1);

-- Person B sees nothing of A and cannot write into A's session.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.equals($$select count(*) from public.lifeos_goal_rooms$$, 0);
select pg_temp.equals($$select count(*) from public.lifeos_room_messages$$, 0);
select pg_temp.equals($$select count(*) from public.lifeos_current_room_memories$$, 0);
select pg_temp.fails($$select public.lifeos_append_room_message((select id from s2), 'person',
  'hi', null, null)$$, 'not owned');
select pg_temp.fails($$select public.lifeos_owned_goal('b1000000-0000-0000-0000-000000000000')$$,
  'permission denied');

-- Signed out.
set role anon;
select pg_temp.fails($$select count(*) from public.lifeos_room_sessions$$, 'permission denied');
select pg_temp.fails($$select public.lifeos_open_goal_room('a1000000-0000-0000-0000-000000000000')$$,
  'permission denied');
reset role;
select 'goal rooms: all checks passed' as result;
