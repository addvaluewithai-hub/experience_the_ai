# Craft skills for Rainbow Valley

Gathered on 2026-10-13 for how the valley is drawn: a Phaser 4 world (procedural art,
particles, a cinematic camera, full screen on phones), directed like a film. Copied as their
authors wrote them; reference for the room builder only, never imported or run. Repository
rules (`AGENTS.md`, `docs/`) come first.

| Folder | Source (pinned) | Licence | Why |
| --- | --- | --- | --- |
| `phaser-v3-to-v4-migration` | [phaserjs/phaser `skills/`](https://github.com/phaserjs/phaser/tree/02d8931b626d9764c133cbb3fbf99966c03c757c/skills) | MIT ([licenses/phaser-MIT.md](licenses/phaser-MIT.md)) | The authority on what changed in v4; check every API against it |
| `phaser-v4-new-features` | same | MIT | Filters, Gradient, Noise, lighting: the v4 tools for a richer look |
| `phaser-graphics-and-shapes` | same | MIT | The valley and the unicorn are drawn from shapes |
| `phaser-particles` | same | MIT | Sparkles, trails, the valley's air |
| `phaser-cameras` | same | MIT | Follow, zoom, pan, flash: the camera is the director's eye |
| `phaser-scale-and-responsive` | same | MIT | Full screen on any phone or desktop |
| `phaser-tweens` | same | MIT | Eased motion for moments (stars, colours returning) |
| `phaser-filters-and-postfx` | same | MIT | Glow, blur, vignette: the cinematic finish |
| `phaser-render-textures` | same | MIT | Baking static art; painting colour back into the valley |
| `phaser-scenes` | same | MIT | Inner places as scenes and transitions between them |
| `phaser-audio-and-sound` | same | MIT | Ambience and music, next on the valley's list |
| `phaser-curves-and-paths` | same | MIT | Flight paths and drawn-on lines |
| `game-feel` | [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd/skills/disciplines/game-feel) | Apache-2.0 ([licence](licenses/gamedev-skills-Apache-2.0.txt), [NOTICE](licenses/gamedev-skills-NOTICE.txt)) | Layered, brief feedback that returns to rest: celebrations that feel good |
| `camera-systems` | [same repo](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/tree/0a70cfc64672d512c5b5b6006b5dcb5cf90dbdbd/skills/disciplines/camera-systems) | Apache-2.0 | Deadzone, look-ahead, smoothing, bounds for the follow camera |
| `film-directing/DIRECTOR.md` | [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar/blob/fdc46d7f0e20cc953a71d56241a92d1b4cb7298e/DIRECTOR.md) | MIT ([licenses/lemo-opuscar-MIT.txt](licenses/lemo-opuscar-MIT.txt)) | Directing method: camera with reasons, a signature shot, sound and silence, performance |

The Phaser skills are the official set by the Phaser team; npm's `phaser@4.2.1` ships the same
files (CRLF line endings), so they match the version this room uses.

## Review

Every file is Markdown; none carries scripts or hooks. Before copying, each was scanned for
commands, setup steps and instructions aimed at the agent (none beyond code examples and a
migration checklist line), and the parts that touch the valley's code were checked against it.

## Considered and left out

- Phaser `physics-*`, `tilemaps`, input and loading skills: the valley needs none yet.
- OpusGameLabs/game-creator (Phaser 3 era; no licence file) and Yakoub-ai/phaser4-gamedev (no
  licence file, stale v4 API, plugin hooks that run scripts): not copied.
- Unlicensed Phaser 4 skill repos (chongdashu, jl-velasco): cannot be copied.
- Lemo-Opuscar's 43 `styles/*/STYLE.md`: the father chose to keep the valley's own Phaser look,
  so no film style was copied; its directing guide still shapes the scenes.
