import { Checker } from './check';
import { characters, collections, panel, yesNoField } from './parts';
import { validateWorld } from './world';
import {
  LANGUAGES,
  LIMITS,
  SCHEMA_VERSION,
  THEMES,
  type Language,
  type RoomSpec,
  type RoomTheme,
} from './types';

export type Validation = { ok: true; spec: RoomSpec } | { ok: false; errors: string[] };

const HEX = /^#[0-9a-f]{6}$/i;
type Inherited = { language: Language; theme: RoomTheme };

/**
 * Checks a room and every room inside it: shape, limits and cross-references. Inner rooms
 * inherit language and theme they leave out. Returns a copy holding only known keys.
 * Structural validity says the runtime can render it; it is not a review of what it says.
 */
export function validateRoom(value: unknown): Validation {
  const check = new Checker();
  let count = 0;

  const room = (input: unknown, path: string, parent: Inherited | undefined, depth: number) => {
    count++;
    const at = (key: string) => (path ? `${path}.${key}` : key);
    const source = check.object(input, path || 'room');
    if (!parent && source.schemaVersion !== SCHEMA_VERSION)
      check.at('schemaVersion', `must be ${SCHEMA_VERSION}`);

    const themeIn =
      source.theme === undefined && parent ? {} : check.object(source.theme, at('theme'));
    const preset =
      themeIn.preset === undefined && parent
        ? parent.theme.preset
        : check.oneOf(themeIn.preset, THEMES, at('theme.preset'));
    let accent = parent?.theme.accent ?? '';
    if (themeIn.accent !== undefined || !parent) {
      accent = typeof themeIn.accent === 'string' ? themeIn.accent.toLowerCase() : '';
      if (!HEX.test(accent)) check.at(at('theme.accent'), 'must be a #rrggbb colour');
    }
    const language =
      source.language === undefined && parent
        ? parent.language
        : check.oneOf(source.language, LANGUAGES, at('language'));
    const theme = { preset, accent };
    const head = {
      schemaVersion: SCHEMA_VERSION,
      id: check.id(source.id, at('id')),
      title: check.text(source.title, at('title')),
      purpose: check.text(source.purpose, at('purpose'), LIMITS.longText),
      language,
      theme,
    } as const;
    const icon = source.icon === undefined ? {} : { icon: check.text(source.icon, at('icon'), 8) };
    if (source.planned === true) {
      if (!parent) check.at(at('planned'), 'only a room inside another can be planned');
      for (const key of ['characters', 'collections', 'panels', 'rooms', 'pulse', 'world'])
        if (source[key] !== undefined)
          check.at(
            at(key),
            'a planned room has only id, title, purpose and icon until it is built',
          );
      return {
        ...head,
        ...icon,
        characters: [],
        collections: [],
        panels: [],
        planned: true,
      } as RoomSpec;
    }

    const owned = collections(check, source.collections, at('collections'));
    const people = characters(check, source.characters, at('characters'));
    let inner: RoomSpec[] = [];
    if (source.rooms !== undefined) {
      const list = check.list(source.rooms, at('rooms'), 0, LIMITS.rooms);
      if (list.length && depth >= LIMITS.depth)
        check.at(at('rooms'), `rooms may nest at most ${LIMITS.depth} levels`);
      else inner = list.map((r, i) => room(r, at(`rooms[${i}]`), { language, theme }, depth + 1));
      check.unique(inner, at('rooms'));
    }
    const panels = check
      .list(source.panels, at('panels'), 1, LIMITS.panels)
      .map((p, i) =>
        panel(check, p, at(`panels[${i}]`), owned, inner.length, source.world !== undefined),
      );
    check.unique(panels, at('panels'));
    if (panels.filter((p) => p.kind === 'world').length > 1)
      check.at(at('panels'), 'a room shows its world at most once');

    const spec: RoomSpec = { ...head, ...icon, characters: people, collections: owned, panels };
    if (source.pulse !== undefined) {
      const pulse = check.object(source.pulse, at('pulse'));
      spec.pulse = yesNoField(check, owned, pulse.collection, pulse.field, at('pulse'));
    }
    if (source.world !== undefined)
      spec.world = validateWorld(check, source.world, at('world'), people);
    if (inner.length) spec.rooms = inner;
    return spec;
  };

  const spec = room(value, '', undefined, 1);
  if (count > LIMITS.totalRooms)
    check.at('rooms', `a room tree may hold at most ${LIMITS.totalRooms} rooms`);
  if (check.errors.length) return { ok: false, errors: check.errors.slice(0, 20) };
  return { ok: true, spec };
}
