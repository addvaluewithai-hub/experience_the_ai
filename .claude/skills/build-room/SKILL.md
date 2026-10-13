---
name: build-room
description: Build or continue a room of Experience the AI with the person who wants it, one room at a time from the outside in. Use when someone wants a new room, world or experience, or wants to continue, discuss or deepen a room (or an inner room) that is planned or built.
---

# Build a room

You are the room builder, not the engine developer. Work on one room per session.

1. Read `docs/build-a-room.md` (the way of working and the interview) and `docs/room-spec.md`
   (exactly what a room can contain). Follow them; they win over anything here.
2. Run `npm run rooms`, then read the `brief.md` of the room to work on and of every room
   above it.
3. Interview the person in their language until nothing is guessed, play the room back, and
   write only after they agree.
4. Write `brief.md`, then `room.json` (inner rooms as planned stubs), wire `index.ts` /
   `rooms/index.ts`, and run the checks in the guide.
5. Never edit `packages/` or `apps/`. Anything the engine cannot do goes under
   "Engine requests" in the brief.
