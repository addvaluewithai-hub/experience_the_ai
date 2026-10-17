# ✨ Life Atrium

## Purpose

A first-person-feeling entrance to life management, rendered in Three.js. This is the parent room of a world that grows a room at a time. The user should be able to reach a useful action without a long navigation sequence.

## Initial decisions

- Language: English; midnight-blue stone and brass; accessible camera movement with reduced-motion support.
- Character: Astra, a concise chief of staff and visual beacon. The engine supplies real agent conversation and voice when configured.
- Data: no duplicate global tasks. Each inner room owns its collections and updates.
- Three doors: Work HQ is built with Atlas, projects and tasks; Learning Library and Wellbeing Garden are intentionally planned stubs. Beside them, the person's active LifeOS goals.
- Navigation: raycast selection in the 3D scene plus keyboard-friendly HTML door buttons.
- Three.js is lazy-loaded only when the atrium is opened.
- The scene draws procedural geometry without needing external model files.

## Boundaries

- The Life Atrium follows the existing RoomSurface / Presence contract and uses open_room for AI handoffs.
- The person signs in to their own LifeOS (Supabase) to see their goals; Work HQ still keeps its records in the tab only. No calendar or email integrations exist yet. Never pretend they do.
- A WebGL failure must still leave room navigation usable.

## Engine request

- ~~Persisted room instances for real life records.~~ Done: `RoomEntry.instances` with the platform's `lifeos.goals` source, read with the person's own token under RLS.
- The server builds a goal room's context from LifeOS instead of trusting the browser (docs/lifeos-goal-rooms.md, engine 4).
- Sessions and room memories for goal companions (engine 5).
- Optional shared navigation transitions and a reusable Three.js kit after a second 3D room needs them.
- Accessible voice-to-room handoff should eventually retain a continuous live session.

## Sessions

- 2026-10-16: Built the Three.js parent atrium and the first real Work HQ using existing room contracts.
- 2026-10-17: Goal rooms. For the one existing profile, during testing: minimal, premium, elegant.
  - "Connect your life" (top corner) signs in with the LifeOS account; up to four active goals appear as "Your goals", each a door.
  - A goal room is a lit study after the dark atrium: paper, ink, one brass line. Title, why, progress, chapters, next actions; read-only, with "changes are made in LifeOS for now".
  - Its companion is docked beside it. LifeOS picks one compiled persona (guide, coach, strategist, tutor, builder) by key and may rename it; without a choice Astra keeps the goal company. The person's notes on how to be accompanied stay data.
  - No onboarding and no new profiles yet: the person chose to build the world for the current profile first.
- 2026-10-17: The Observatory, above the atrium, with Orion · Chairman (the person chose him, archive over delete, and a confirm tap for his changes).
  - Every LifeOS goal is a star: active gold on the left, paused pale in the middle, waiting faint on the right; completed and archived rest in a line below. Brighter means more progress.
  - The person opens a star's card to make it active, pause it, send it back to waiting, complete, archive (two taps) or delete it while it is empty (two taps); "+ New goal" adds one, waiting unless started now.
  - Orion adds a goal when the person agrees; his state changes and deletes show a confirm card first. Daily tasks are not his: Astra and each goal's companion keep those.
  - Reached from "✧ The Observatory" under the atrium's title, or by Astra's open_room.
- 2026-10-17, later: the person's first look at the Observatory with their real goals.
  - No delete: they delete goals themselves. Archive (two taps) stays.
  - Orion is a leader, not an assistant: he never acts at once, says what he sees, asks the deciding question, recommends with its cost, names more than three active goals as a warning, and acts only once they agree; adding a goal also waits for their tap.
  - A timeline beside the sky: each goal from its start (or when it was added) to its target, brass up to its progress, today in gold, overdue ends marked.
  - Calmer design: three numbers instead of a sentence, aligned columns that wrap, a drawer on the right the sky steps aside for. The way-in button follows the room's theme instead of the children's candy gradient.
