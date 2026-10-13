/**
 * A room is a declarative description, never code. The architect conversation produces one,
 * the runtime renders it with a fixed component registry, and agents act on its data through
 * tools derived from it. Anything a room cannot describe here is a new engine feature.
 */
export const SCHEMA_VERSION = 1;

export const THEMES = ['school', 'studio', 'habit', 'kids', 'planet', 'office', 'calm'] as const;
export type ThemePreset = (typeof THEMES)[number];

export const FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'choice'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/** list: records of a collection; stat: count or sum; progress: share of a boolean field done;
 * growth: a 2.5D world that grows with each done record; text: fixed words from the room;
 * custom: a component the room ships in its own folder (3D scenes, special dashboards). */
export const PANEL_KINDS = ['list', 'stat', 'progress', 'growth', 'text', 'custom'] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

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
};

export const LIMITS = {
  characters: 4,
  collections: 6,
  fields: 8,
  options: 12,
  panels: 8,
  shortText: 60,
  longText: 600,
} as const;
