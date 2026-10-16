# LifeOS goal rooms

Every goal in the person's LifeOS database (Supabase project `lifeos`) opens as a room with
its own character, voice, conversations and memories, under the Life Atrium
(`rooms/life-hub`), where Astra coordinates. The SQL is in `supabase/migrations/` and is
checked by `supabase/tests/`. Schema V1 was applied to `lifeos` on 2026-10-17, at the
person's choice, after the local tests: the free plan has no branching, and the migrations
only add tables and functions. For now the world is built for the one existing profile;
onboarding and new profiles come later.

## What exists (read on 2026-10-17)

LifeOS already holds the brain of the goals. Read-only queries found:

| Area     | Tables                                                                              | Rows today                                                              |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Identity | `lifeos_profiles` (one profile, bound to the one auth user)                         | 1                                                                       |
| Goals    | `lifeos_goals`, `_goal_tasks`, `_goal_milestones`, `_goal_task_dependencies`        | 20 goals: 4 active, 16 backlog; 12 tasks, all on one goal; 4 milestones |
| Progress | `_goal_metrics`, `_goal_metric_entries`, `_goal_evidence`, `_goal_reflections`      | 4 metrics                                                               |
| Days     | `_days`, `_hour_blocks`, `_habit_entries`, `_routines`, `_point_ledger`, activation | 37 days, 384 hour blocks                                                |
| Memory   | `_events` (append-only), `_long_term_memories` (append-only, superseding)           | 88 events, 51 memories                                                  |
| Media    | `_media_assets`, `_goal_media`                                                      |                                                                         |

Views (`lifeos_goal_progress`, `lifeos_current_memories` and four more) use
`security_invoker = true`. Every table has RLS by profile ownership
(`lifeos_is_profile_owner`).

Some facts change the plan as it was first drafted:

1. **The signed-in browser is read-only by design.** Migration
   `enforce_read_only_viewer_boundary` revoked every write on `lifeos_*` from `anon` and
   `authenticated` and left them only `select`: "authenticated frontend is read-only;
   administrative writes use reviewed server-side or SQL paths." The policies for insert and
   update exist, but no grant reaches them. A character cannot "write through RLS" here.
2. **RLS cannot tell a character from the person.** Both act with the same token. Which goal a
   character may read and which memories it may see is decided by the server that builds its
   context. The database only guarantees the human owns the row.
3. **Long-term memories have no scope.** 51 memories across 21 `memory_type`s (life_fact,
   relationship, identity, preference, communication_rule…) with no goal or sensitivity field.
   Scoping must choose by type.
4. **Most goals are backlog.** Twenty doors would mostly open onto empty rooms. Rooms are
   created when a goal is first opened, and the atrium shows active goals first.
5. **The voice part is already built here.** `/api/live` mints a single-use Gemini Live token
   with the character's instruction, tools and voice locked on the server (`live.ts`); voices
   are an allowlist in room-spec (`voices.ts`). What is missing is loading the character from
   the goal instead of from the request.

Unrelated, from the Supabase security advisor: leaked password protection is off
([docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)).
Turn it on before anyone else signs up.

## The shape

One person → many goals → one room per goal → one primary character per room → that room's
conversations and memories. The Life Atrium is above them, with Astra.

- **One compiled template, many instances.** Rooms are compiled from this repository; the
  database never supplies code or a room spec. A goal room is the template
  `rooms/life-hub/rooms/goal` opened for one `goal_id`: the template decides panels, world
  and tools; the goal's rows are its data.
- **Personas live in the repo; a row only chooses one.** `lifeos_room_agents.persona_key`
  names a persona compiled in the room's folder (coach, tutor, strategist, built with the
  person like any character). `name`, `role`, `voice_name` and up to 600 characters of
  `persona_notes` personalise it. The notes reach the model as content in the brief, never as
  its instructions, so nothing written into the database can rewrite a character.
- **Capabilities can only narrow.** The row's `capabilities` is intersected with the
  template's; a row can take a power away, never add one (`data.write`, `ui.focus` today).
- **No `homepage` table.** Astra's Today / Focus / Goals view is read on the server from
  `lifeos_days`, `lifeos_hour_blocks`, `lifeos_goal_tasks` and `lifeos_goal_progress`.

## Schema V1

Five tables, all keyed with `(…, profile_id, goal_id)` composite foreign keys, as the goal
tables already are, so no row can point across people or across goals.

| Table                  | Holds                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lifeos_goal_rooms`    | `goal_id` (the room's identity), template, visual settings (`jsonb`, < 4 KB), last opened                  |
| `lifeos_room_agents`   | persona key, name, role, voice, avatar key, notes, capabilities, readable memory types; one active primary |
| `lifeos_room_sessions` | one conversation, `text` or `voice`; once ended it is closed; summary at the end                           |
| `lifeos_room_messages` | person / agent / tool turns (tool turns carry the tool name and its arguments); never edited               |
| `lifeos_room_memories` | what the character keeps about this goal; append-only, superseding, like `lifeos_long_term_memories`       |

Plus the view `lifeos_current_room_memories`, and an event `room.session.ended` in
`lifeos_events` so Astra can see that a room was visited.

Grants follow the existing boundary: `authenticated` may `select` its own rows and nothing
else. Writes go through six reviewed functions (`security definer`, fixed `search_path`,
each one checks `auth.uid()` owns the goal or session first):

| Function                     | Called by                                                         |
| ---------------------------- | ----------------------------------------------------------------- |
| `lifeos_open_goal_room`      | the app, when a goal's door is opened                             |
| `lifeos_set_room_agent`      | the person, choosing or changing a goal's character; never a tool |
| `lifeos_start_room_session`  | the app, at the first message or call                             |
| `lifeos_append_room_message` | the app, after each turn                                          |
| `lifeos_remember_in_room`    | the derived `remember` tool, through the server                   |
| `lifeos_end_room_session`    | the app, on leaving or hanging up, with the summary               |

This is the one change to the boundary: the signed-in person may now write through these
functions, and only them. The app needs no service-role key.

Not in V1: characters changing tasks, milestones or metrics. When they do, it is another
reviewed function per change (e.g. complete a task, add a task with an allowlist of
columns), never a table grant.

## Memory policy

Three kinds, kept apart:

- **Conversation** (`lifeos_room_messages`): what was said in this room. The character sees
  the current session and the summaries of the last few, not every old message.
- **Room memory** (`lifeos_current_room_memories`): what the character keeps about this goal
  (Sofia: level, words the person confuses). Only this goal's character reads it; the
  `remember` tool writes it, and a correction supersedes rather than edits.
- **Global memory** (`lifeos_current_memories`): stays the single source of who the person is.
  A goal character reads only the `memory_type`s listed on its row, none by default (Sofia
  might get `preference` and `communication_rule`, not `relationship` or `life_fact`).
  Astra reads more, as agreed in the Life Atrium's brief. No character writes global memory
  in V1; moving a room memory up is the person's decision.

All of it reaches the model inside the data block, as the person's content.

## Connecting to experience_the_ai

Engine requests, each with its tests and kept in separate commits from room work:

1. **Accounts with Supabase Auth.** The architecture planned Neon Auth and a generic
   `room_app` schema; LifeOS already has Supabase Auth and relational goal tables. For the
   Life Atrium the persistence adapter is Supabase, the browser signs in with the existing
   user, and the server receives the person's access token.
2. **Room instances.** A `RoomEntry` that is a template, opened at
   `life-hub/goal/<goal_id>` with the goal's rows. Today `loadRooms` only knows rooms
   compiled one by one.
3. **A Supabase `RoomStore`.** Read-only in V1: it maps the goal, its tasks, milestones and
   progress into the template's collections. The runtime already takes the store from the
   host.
4. **Server-built context.** For a goal room, `/api/agent` and `/api/live` load the template
   from the repo, the character row and data from Supabase with the person's token, and stop
   trusting the spec and data sent by the browser. Voice is checked against room-spec's
   allowlist.
5. **Sessions and memory.** Start, append and end calls around the existing conversation
   (`conversation.ts`) and voice call; a derived `remember` tool; a summary on leaving. Moving
   between rooms opens a new Live session with the new character, with a short handoff
   note, as `open_room` does today.

## Order

1. ~~Merge the Life Atrium.~~ Done, without the debug code in its browser check.
2. ~~Apply the two migrations.~~ Done on 2026-10-17; the six writing functions show in the
   security advisor as callable by signed-in users, which is intended.
3. ~~Engine 1–3 and a goal room that only reads.~~ Done: "Connect your life" in the atrium
   signs in with the LifeOS account (`apps/platform/src/lifeos/`), up to five active goals
   open as rooms (`rooms/life-hub/goals/`) with their companion, the visit is recorded with
   `lifeos_open_goal_room`. The browser still sends the spec and data to `/api/agent`, as
   for every preview room; engine 4 ends that for goal rooms.
4. Engine 4–5: the server builds the context; the character keeps memories and sessions.
5. Astra's Today / Focus / Goals in the atrium. Goal doors are there already.
6. Reviewed write functions for tasks, one at a time.

## Checking the SQL

`supabase/tests/lifeos_baseline.sql` copies the part of the live schema the migrations
depend on (profiles, goals, events, the owner check, Supabase's roles and `auth.uid()`). On a
throwaway Postgres 16: run it, both migrations, then `goal_rooms.sql` with
`psql -v ON_ERROR_STOP=1`. It checks that one person cannot open, read or write another's
rooms; that the signed-out role reads nothing; that direct writes are refused; that a
character needs a valid capability, a memory supersedes only within its goal, and that
messages and memories are never edited and an ended session stays closed.
