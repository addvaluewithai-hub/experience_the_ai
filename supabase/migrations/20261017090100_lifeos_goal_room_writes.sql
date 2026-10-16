-- Goal rooms V1, writes. Each function checks that the signed-in person owns the goal or
-- session (auth.uid() through lifeos_is_profile_owner) before writing. The app calls them with
-- the person's own token; it holds no service-role key. Characters never call
-- lifeos_set_room_agent: the server derives their tools from the room, not from this list.

create function public.lifeos_owned_goal(p_goal_id uuid) returns uuid
language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare v_profile uuid;
begin
  select g.profile_id into v_profile from public.lifeos_goals g where g.id = p_goal_id;
  if v_profile is null or not public.lifeos_is_profile_owner(v_profile) then
    raise exception 'goal is not owned by the signed-in person';
  end if;
  return v_profile;
end $$;

create function public.lifeos_open_goal_room(p_goal_id uuid)
returns public.lifeos_goal_rooms
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_profile uuid := public.lifeos_owned_goal(p_goal_id);
  v_room public.lifeos_goal_rooms;
begin
  insert into public.lifeos_goal_rooms as r (goal_id, profile_id, last_opened_at)
  values (p_goal_id, v_profile, now())
  on conflict (goal_id) do update set last_opened_at = now()
  returning r.* into v_room;
  return v_room;
end $$;

create function public.lifeos_set_room_agent(
  p_goal_id uuid, p_persona_key text, p_name text, p_role text, p_voice_name text,
  p_avatar_key text, p_persona_notes text, p_capabilities text[], p_memory_types text[]
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_profile uuid := public.lifeos_owned_goal(p_goal_id);
  v_id uuid;
begin
  perform public.lifeos_open_goal_room(p_goal_id);
  update public.lifeos_room_agents set is_active = false
  where goal_id = p_goal_id and is_primary and is_active;
  insert into public.lifeos_room_agents (
    profile_id, goal_id, persona_key, name, role, voice_name, avatar_key, persona_notes,
    capabilities, memory_types
  ) values (
    v_profile, p_goal_id, p_persona_key, p_name, p_role, p_voice_name, p_avatar_key,
    coalesce(p_persona_notes, ''), coalesce(p_capabilities, '{}'), coalesce(p_memory_types, '{}')
  ) returning id into v_id;
  return v_id;
end $$;

create function public.lifeos_start_room_session(p_goal_id uuid, p_channel text)
returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_profile uuid := public.lifeos_owned_goal(p_goal_id);
  v_agent uuid;
  v_id uuid;
begin
  select a.id into v_agent from public.lifeos_room_agents a
  where a.goal_id = p_goal_id and a.is_primary and a.is_active;
  if v_agent is null then
    raise exception 'this goal room has no active character yet';
  end if;
  insert into public.lifeos_room_sessions (profile_id, goal_id, agent_id, channel)
  values (v_profile, p_goal_id, v_agent, p_channel)
  returning id into v_id;
  update public.lifeos_goal_rooms set last_opened_at = now() where goal_id = p_goal_id;
  return v_id;
end $$;

-- The open session of the signed-in person, locked for the write that follows.
create function public.lifeos_open_room_session(p_session_id uuid)
returns public.lifeos_room_sessions
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.lifeos_room_sessions;
begin
  select s.* into v_session from public.lifeos_room_sessions s
  where s.id = p_session_id for update;
  if v_session.id is null or not public.lifeos_is_profile_owner(v_session.profile_id) then
    raise exception 'room session is not owned by the signed-in person';
  end if;
  if v_session.ended_at is not null then
    raise exception 'an ended room session is closed';
  end if;
  return v_session;
end $$;

create function public.lifeos_append_room_message(
  p_session_id uuid, p_role text, p_content text, p_tool_name text, p_tool_payload jsonb
) returns bigint
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session public.lifeos_room_sessions := public.lifeos_open_room_session(p_session_id);
  v_id bigint;
begin
  insert into public.lifeos_room_messages (
    profile_id, goal_id, session_id, role, content, tool_name, tool_payload
  ) values (
    v_session.profile_id, v_session.goal_id, v_session.id, p_role, coalesce(p_content, ''),
    p_tool_name, p_tool_payload
  ) returning id into v_id;
  return v_id;
end $$;

create function public.lifeos_end_room_session(p_session_id uuid, p_summary text)
returns void
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_session public.lifeos_room_sessions := public.lifeos_open_room_session(p_session_id);
begin
  update public.lifeos_room_sessions
  set ended_at = now(), summary = coalesce(p_summary, '')
  where id = v_session.id;
  insert into public.lifeos_events (profile_id, event_type, source, payload)
  values (
    v_session.profile_id, 'room.session.ended', 'experience_the_ai',
    jsonb_build_object('goal_id', v_session.goal_id, 'session_id', v_session.id,
                       'agent_id', v_session.agent_id, 'channel', v_session.channel)
  );
end $$;

create function public.lifeos_remember_in_room(
  p_session_id uuid, p_memory_key text, p_memory_type text, p_content text,
  p_importance smallint, p_operation text, p_supersedes_memory_id uuid
) returns uuid
language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_session public.lifeos_room_sessions := public.lifeos_open_room_session(p_session_id);
  v_id uuid;
begin
  insert into public.lifeos_room_memories (
    profile_id, goal_id, source_session_id, supersedes_memory_id, memory_key, memory_type,
    content, importance, operation
  ) values (
    v_session.profile_id, v_session.goal_id, v_session.id, p_supersedes_memory_id,
    p_memory_key, p_memory_type, p_content, coalesce(p_importance, 3),
    coalesce(p_operation, 'assert')
  ) returning id into v_id;
  return v_id;
end $$;

do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'lifeos_owned_goal', 'lifeos_open_goal_room', 'lifeos_set_room_agent',
      'lifeos_start_room_session', 'lifeos_open_room_session', 'lifeos_append_room_message',
      'lifeos_end_room_session', 'lifeos_remember_in_room', 'lifeos_guard_room_session')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
grant execute on function public.lifeos_open_goal_room(uuid) to authenticated;
grant execute on function public.lifeos_set_room_agent(
  uuid, text, text, text, text, text, text, text[], text[]) to authenticated;
grant execute on function public.lifeos_start_room_session(uuid, text) to authenticated;
grant execute on function public.lifeos_append_room_message(uuid, text, text, text, jsonb)
  to authenticated;
grant execute on function public.lifeos_end_room_session(uuid, text) to authenticated;
grant execute on function public.lifeos_remember_in_room(
  uuid, text, text, text, smallint, text, uuid) to authenticated;
