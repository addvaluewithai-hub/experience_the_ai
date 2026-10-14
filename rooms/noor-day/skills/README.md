# Craft skills for يومي مع نور

Gathered on 2026-10-14 for how this room is drawn: Esraa's kitchen in Phaser 4 with Noor in
it, and interface in React pinned to the kitchen's things (the chalkboard, the fridge notes). Copied as written; reference for the room
builder only, never imported or run. Repository rules (`AGENTS.md`, `docs/`) come first.

| Folder | Source (pinned) | Licence | Why |
| --- | --- | --- | --- |
| `phaser-v3-to-v4-migration`, `phaser-graphics-and-shapes`, `phaser-cameras`, `phaser-tweens`, `phaser-scale-and-responsive` | [phaserjs/phaser `skills/`](https://github.com/phaserjs/phaser/tree/02d8931b626d9764c133cbb3fbf99966c03c757c/skills) | MIT ([licenses/phaser-MIT.md](licenses/phaser-MIT.md)) | The kitchen and Noor are drawn from shapes; a camera that rests and follows; any screen |
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills/tree/dbd4588f9e1033efb41dad4bef2f7947c8993d44/skills/frontend-design) | Apache-2.0 ([licence](licenses/anthropic-skills-Apache-2.0.txt)) | A design pass grounded in the subject: a small token system, one memorable element, restraint, and the defaults to avoid |

## Review

Markdown only, no scripts; scanned for commands and instructions aimed at the agent (none).

## How it shaped the room

It warns that a cream background with a terracotta accent and identical rounded cards are the
commonest generated look. The kitchen took its colours from the room itself (sage cabinets, a
wooden counter, a slate chalkboard) and keeps the interface in the kitchen's own materials:
chalk on the board, paper notes held by magnets on the fridge.

## Considered and left out

- `theme-factory`, `canvas-design` (same repository): presets and static posters, not a daily
  tool.
- `web-artifacts-builder`: for standalone artifacts, not a room in this app.
