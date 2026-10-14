import type { VoiceName } from './voices';
import type { World } from './world';

/**
 * A room is a declarative description, never code. It is the only building block: a room has
 * a look, characters and its own data, and may hold rooms of its own. Claude Code authors
 * rooms in this repository, the runtime renders them with a fixed component registry, and
 * characters act on their data through tools derived from them. Anything a room cannot
 * describe here is a new engine feature.
 */
export const SCHEMA_VERSION = 1;

export const THEMES = ['school', 'studio', 'habit', 'kids', 'planet', 'office', 'calm'] as const;
export type ThemePreset = (typeof THEMES)[number];

export const FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'choice'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** list: records of a collection; stat: count or sum; progress: share of a boolean field done;
 * growth: a 2.5D world that grows with each done record; text: fixed words from the room;
 * custom: a component the room ships in its own folder (3D scenes, special dashboards);
 * rooms: the rooms inside this one, as doors or as a world, each lit by its pulse;
 * world: the room's own surface (a game world, a 3D place, a stage…), declared in `world`. */
export const PANEL_KINDS = [
  'list',
  'stat',
  'progress',
  'growth',
  'text',
  'custom',
  'rooms',
  'world',
] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

export const ROOM_VIEWS = ['doors', 'world'] as const;
export type RoomsView = (typeof ROOM_VIEWS)[number];

/** What a character may do. Reading is always granted; these unlock actions. */
export const CAPABILITIES = ['data.write', 'ui.focus'] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const LANGUAGES = ['ar', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export type Field = {
  id: string;
  label: string;
  type: FieldType;
  /** Required for choice; the allowed values. */
  options?: string[];
  required?: boolean;
};

export type Collection = { id: string; label: string; fields: Field[] };

export type Character = {
  id: string;
  name: string;
  /** Short role shown under the name, e.g. "Habit coach" or "CEO". */
  role: string;
  /** How the character thinks, talks and what it cares about. */
  persona: string;
  /** First line shown when the learner opens the room. */
  greeting: string;
  capabilities: Capability[];
  /** The character's voice in live calls. */
  voice?: VoiceName;
};

export type Panel = {
  id: string;
  kind: PanelKind;
  title: string;
  collection?: string;
  /** stat: a number field to sum; progress/growth: the boolean "done" field; list: optional
   * boolean field shown as a checkbox. */
  field?: string;
  text?: string;
  /** custom only: the id of a component registered by the room's own folder. */
  component?: string;
  /** rooms only: how the inner rooms are shown (default doors). */
  view?: RoomsView;
  wide?: boolean;
};

export type RoomTheme = { preset: ThemePreset; accent: string };

export type RoomSpec = {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  title: string;
  purpose: string;
  language: Language;
  theme: RoomTheme;
  characters: Character[];
  collections: Collection[];
  panels: Panel[];
  /** How the room appears inside its parent (an emoji). */
  icon?: string;
  /** How alive the room is: the share of `field` that is true in `collection`. A room without
   * one takes the average of its inner rooms. */
  pulse?: { collection: string; field: string };
  /** Rooms inside this one. In authored JSON an inner room may leave out language and theme
   * (or either theme key) to inherit them; validation fills them in. */
  rooms?: RoomSpec[];
  /** The room's world: the surface that draws it and the actions characters may take there. */
  world?: World;
  /** `panels` (default): a page of panels beside the conversation. `immersive`: the room is
   * its world on the whole screen; people talk with its characters by voice (captions over the
   * world, a small keyboard when voice cannot be used) and characters change everything through
   * their tools, so there are no forms. Needs a world, shown by its only panel. */
  layout?: 'panels' | 'immersive';
  /** Immersive rooms only. `overlay` (default): captions float over a world you live in.
   * `dock`: the characters sit beside a world that is a working interface (a planner, a
   * tracker): their conversation, a voice call and typing are always at hand, and on arrival
   * the first character speaks first in words. */
  presence?: 'overlay' | 'dock';
  /** An inner room agreed on but not built yet: only id, title, purpose and icon. It shows as
   * a closed door, so a world can be built from the outside in, one room at a time. */
  planned?: true;
};

export const LIMITS = {
  characters: 4,
  collections: 6,
  fields: 8,
  options: 12,
  panels: 8,
  /** Inner rooms per room, levels from the top room down, and rooms in one tree. */
  rooms: 8,
  depth: 4,
  totalRooms: 40,
  shortText: 60,
  longText: 600,
} as const;
