# ✨ Life Atrium

## Purpose
A first-person-feeling entrance to life management, rendered in Three.js. This is the parent room of a world that grows a room at a time. The user should be able to reach a useful action without a long navigation sequence.

## Initial decisions
- Language: English; midnight-blue stone and brass; accessible camera movement with reduced-motion support.
- Character: Astra, a concise chief of staff and visual beacon. The engine supplies real agent conversation and voice when configured.
- Data: no duplicate global tasks. Each inner room owns its collections and updates.
- Three doors: Work HQ is built with Atlas, projects and tasks; Learning Library and Wellbeing Garden are intentionally planned stubs.
- Navigation: raycast selection in the 3D scene plus keyboard-friendly HTML door buttons.
- Three.js is lazy-loaded only when the atrium is opened.
- The scene draws procedural geometry without needing external model files.

## Boundaries
- The Life Atrium follows the existing RoomSurface / Presence contract and uses open_room for AI handoffs.
- No accounts, cross-visit persistence, role-based authorization, calendar or email integrations exist yet. Never pretend they do.
- A WebGL failure must still leave room navigation usable.

## Engine request
- Secure persisted room instances and user roles before using this for real life records.
- Optional shared navigation transitions and a reusable Three.js kit after a second 3D room needs them.
- Accessible voice-to-room handoff should eventually retain a continuous live session.

## Sessions
- 2026-10-16: Built the Three.js parent atrium and the first real Work HQ using existing room contracts.
