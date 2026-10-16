-- Goal rooms V1: every lifeos goal can open as a room with one primary character, its own
-- conversations and its own memories. Applied to lifeos on 2026-10-17 after the local tests
-- in supabase/tests (the free plan has no branching).
--
-- Boundary kept from enforce_read_only_viewer_boundary: authenticated reads tables through RLS
-- and never writes them directly. Writes go through the reviewed functions at the end, which
-- check ownership with auth.uid() themselves. Personas are compiled in the repo; a row only
-- chooses one (persona_key) and adds short notes the model reads as content.

create table public.lifeos_goal_rooms (
  goal_id uuid primary key,
  profile_id uuid not null references public.lifeos_profiles (id),
  room_template text not null default 'goal' check (room_template ~ '^[a-z][a-z0-9-]{0,39}$'),
  room_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(room_settings) = 'object' and pg_column_size(room_settings) < 4096),
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (goal_id, profile_id),
  foreign key (goal_id, profile_id) references public.lifeos_goals (id, profile_id)
);

create table public.lifeos_room_agents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  goal_id uuid not null,
  persona_key text not null check (persona_key ~ '^[a-z][a-z0-9-]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  role text not null check (char_length(btrim(role)) between 1 and 60),
  voice_name text check (voice_name ~ '^[A-Z][a-z]{2,20}$'),
  avatar_key text check (avatar_key ~ '^[a-z][a-z0-9-]{0,39}$'),
  persona_notes text not null default '' check (char_length(persona_notes) <= 600),
  capabilities text[] not null default '{}'
    check (capabilities <@ array['data.write', 'ui.focus']::text[]),
  memory_types text[] not null default '{}' check (cardinality(memory_types) <= 30),
  is_primary boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, profile_id, goal_id),
  foreign key (goal_id, profile_id) references public.lifeos_goal_rooms (goal_id, profile_id)
);
create unique index lifeos_room_agents_one_primary
  on public.lifeos_room_agents (goal_id) where is_primary and is_active;

create table public.lifeos_room_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  goal_id uuid not null,
  agent_id uuid not null,
  channel text not null check (channel in ('text', 'voice')),
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at >= started_at),
  summary text not null default '' check (char_length(summary) <= 4000),
  unique (id, profile_id, goal_id),
  foreign key (agent_id, profile_id, goal_id)
    references public.lifeos_room_agents (id, profile_id, goal_id)
);
create index lifeos_room_sessions_goal on public.lifeos_room_sessions (goal_id, started_at desc);

create table public.lifeos_room_messages (
  id bigint generated always as identity primary key,
  profile_id uuid not null,
  goal_id uuid not null,
  session_id uuid not null,
  role text not null check (role in ('person', 'agent', 'tool')),
  content text not null default '' check (char_length(content) <= 8000),
  tool_name text check (tool_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  tool_payload jsonb check (tool_payload is null or pg_column_size(tool_payload) < 16384),
  created_at timestamptz not null default now(),
  check ((role = 'tool') = (tool_name is not null)),
  foreign key (session_id, profile_id, goal_id)
    references public.lifeos_room_sessions (id, profile_id, goal_id) on delete cascade
);
create index lifeos_room_messages_session on public.lifeos_room_messages (session_id, id);

create table public.lifeos_room_memories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  goal_id uuid not null,
  source_session_id uuid,
  supersedes_memory_id uuid,
  memory_key text not null check (memory_key ~ '^[a-z0-9][a-z0-9_.-]{0,79}$'),
  memory_type text not null check (memory_type ~ '^[a-z][a-z_]{0,39}$'),
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  operation text not null default 'assert' check (operation in ('assert', 'retract')),
  importance smallint not null default 3 check (importance between 1 and 5),
  created_at timestamptz not null default now(),
  unique (id, profile_id, goal_id),
  foreign key (goal_id, profile_id) references public.lifeos_goal_rooms (goal_id, profile_id),
  foreign key (source_session_id, profile_id, goal_id)
    references public.lifeos_room_sessions (id, profile_id, goal_id),
  foreign key (supersedes_memory_id, profile_id, goal_id)
    references public.lifeos_room_memories (id, profile_id, goal_id)
);
create index lifeos_room_memories_goal on public.lifeos_room_memories (goal_id, memory_key);

create view public.lifeos_current_room_memories with (security_invoker = true) as
  select m.* from public.lifeos_room_memories m
  where m.operation = 'assert'
    and not exists (
      select 1 from public.lifeos_room_memories newer where newer.supersedes_memory_id = m.id
    );

-- History stays history: messages and memories are never edited; an ended session is closed.
create trigger lifeos_room_messages_append_only before update on public.lifeos_room_messages
  for each row execute function public.lifeos_prevent_history_mutation();
create trigger lifeos_room_memories_append_only before update or delete
  on public.lifeos_room_memories
  for each row execute function public.lifeos_prevent_history_mutation();
create trigger lifeos_goal_rooms_updated_at before update on public.lifeos_goal_rooms
  for each row execute function public.lifeos_set_updated_at();
create trigger lifeos_room_agents_updated_at before update on public.lifeos_room_agents
  for each row execute function public.lifeos_set_updated_at();

create function public.lifeos_guard_room_session() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.ended_at is not null then
    raise exception 'an ended room session is closed';
  end if;
  if (new.id, new.profile_id, new.goal_id, new.agent_id, new.channel, new.started_at)
     is distinct from (old.id, old.profile_id, old.goal_id, old.agent_id, old.channel, old.started_at) then
    raise exception 'only ended_at and summary of a room session can change';
  end if;
  return new;
end;
$$;
create trigger lifeos_room_sessions_guard before update on public.lifeos_room_sessions
  for each row execute function public.lifeos_guard_room_session();

-- Read: the owner sees their own rows. No direct writes for anon or authenticated.
do $$
declare t text;
begin
  foreach t in array array['lifeos_goal_rooms', 'lifeos_room_agents', 'lifeos_room_sessions',
                           'lifeos_room_messages', 'lifeos_room_memories']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all privileges on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.lifeos_is_profile_owner(profile_id))', t || '_select_own', t);
  end loop;
end $$;
revoke all privileges on table public.lifeos_current_room_memories from anon, authenticated;
grant select on table public.lifeos_current_room_memories to authenticated;
revoke all privileges on sequence public.lifeos_room_messages_id_seq from anon, authenticated;
