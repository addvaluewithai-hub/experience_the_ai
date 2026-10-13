import {
  CAPABILITIES,
  FIELD_TYPES,
  LANGUAGES,
  LIMITS,
  PANEL_KINDS,
  SCHEMA_VERSION,
  THEMES,
  type Character,
  type Collection,
  type Field,
  type Panel,
  type RoomSpec,
} from './types';

export type Validation = { ok: true; spec: RoomSpec } | { ok: false; errors: string[] };

const ID = /^[a-z][a-z0-9-]{0,39}$/;
const HEX = /^#[0-9a-f]{6}$/i;
type Input = Record<string, unknown>;

/**
 * Checks shape, limits and every cross-reference, and returns a copy holding only known keys.
 * Structural validity says the runtime can render it; it is not a review of what it says.
 */
export function validateRoom(value: unknown): Validation {
  const errors: string[] = [];
  const at = (path: string, message: string) => errors.push(`${path}: ${message}`);
  const object = (v: unknown, path: string): Input => {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Input;
    at(path, 'must be an object');
    return {};
  };
  const text = (v: unknown, path: string, max: number = LIMITS.shortText): string => {
    if (typeof v !== 'string' || !v.trim()) at(path, 'must be non-empty text');
    else if (v.length > max) at(path, `must be at most ${max} characters`);
    return typeof v === 'string' ? v.trim() : '';
  };
  const id = (v: unknown, path: string): string => {
    if (typeof v !== 'string' || !ID.test(v)) at(path, 'must be a kebab-case id');
    return typeof v === 'string' ? v : '';
  };
  const oneOf = <T extends string>(v: unknown, allowed: readonly T[], path: string): T => {
    if (!allowed.includes(v as T)) at(path, `must be one of ${allowed.join(', ')}`);
    return v as T;
  };
  const list = (v: unknown, path: string, min: number, max: number): unknown[] => {
    if (!Array.isArray(v)) {
      at(path, 'must be a list');
      return [];
    }
    if (v.length < min || v.length > max) at(path, `must have ${min} to ${max} items`);
    return v.slice(0, max);
  };
  const unique = (items: { id: string }[], path: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) at(path, `duplicate id ${item.id}`);
      seen.add(item.id);
    }
  };

  const root = object(value, 'room');
  if (root.schemaVersion !== SCHEMA_VERSION) at('schemaVersion', `must be ${SCHEMA_VERSION}`);
  const theme = object(root.theme, 'theme');
  const accent = typeof theme.accent === 'string' ? theme.accent : '';
  if (!HEX.test(accent)) at('theme.accent', 'must be a #rrggbb colour');

  const field = (v: unknown, path: string): Field => {
    const f = object(v, path);
    const result: Field = {
      id: id(f.id, `${path}.id`),
      label: text(f.label, `${path}.label`),
      type: oneOf(f.type, FIELD_TYPES, `${path}.type`),
    };
    if (result.type === 'choice')
      result.options = list(f.options, `${path}.options`, 1, LIMITS.options).map((o, i) =>
        text(o, `${path}.options[${i}]`),
      );
    if (f.required === true) result.required = true;
    return result;
  };
  const collections: Collection[] = list(root.collections, 'collections', 0, LIMITS.collections)
    .map((v, i) => object(v, `collections[${i}]`))
    .map((c, i) => {
      const path = `collections[${i}]`;
      const fields = list(c.fields, `${path}.fields`, 1, LIMITS.fields).map((f, j) =>
        field(f, `${path}.fields[${j}]`),
      );
      unique(fields, `${path}.fields`);
      return { id: id(c.id, `${path}.id`), label: text(c.label, `${path}.label`), fields };
    });
  unique(collections, 'collections');

  const characters: Character[] = list(root.characters, 'characters', 1, LIMITS.characters)
    .map((v, i) => object(v, `characters[${i}]`))
    .map((c, i) => {
      const path = `characters[${i}]`;
      const capabilities = list(c.capabilities, `${path}.capabilities`, 0, CAPABILITIES.length);
      return {
        id: id(c.id, `${path}.id`),
        name: text(c.name, `${path}.name`),
        role: text(c.role, `${path}.role`),
        persona: text(c.persona, `${path}.persona`, LIMITS.longText),
        greeting: text(c.greeting, `${path}.greeting`, LIMITS.longText),
        capabilities: [
          ...new Set(
            capabilities.map((v, j) => oneOf(v, CAPABILITIES, `${path}.capabilities[${j}]`)),
          ),
        ],
      };
    });
  unique(characters, 'characters');

  const panels: Panel[] = list(root.panels, 'panels', 1, LIMITS.panels)
    .map((v, i) => object(v, `panels[${i}]`))
    .map((p, i) => {
      const path = `panels[${i}]`;
      const panel: Panel = {
        id: id(p.id, `${path}.id`),
        kind: oneOf(p.kind, PANEL_KINDS, `${path}.kind`),
        title: text(p.title, `${path}.title`),
      };
      if (p.wide === true) panel.wide = true;
      if (panel.kind === 'text') {
        panel.text = text(p.text, `${path}.text`, LIMITS.longText);
        return panel;
      }
      if (panel.kind === 'custom') {
        panel.component = id(p.component, `${path}.component`);
        if (p.collection === undefined) return panel;
        if (collections.some((c) => c.id === p.collection)) panel.collection = String(p.collection);
        else at(`${path}.collection`, 'must name a collection of this room');
        return panel;
      }
      const collection = collections.find((c) => c.id === p.collection);
      if (!collection) {
        at(`${path}.collection`, 'must name a collection of this room');
        return panel;
      }
      panel.collection = collection.id;
      if (p.field === undefined || p.field === null || p.field === '') {
        if (panel.kind === 'progress' || panel.kind === 'growth')
          at(`${path}.field`, 'must name a yes/no field');
        return panel;
      }
      const target = collection.fields.find((f) => f.id === p.field);
      const wanted = panel.kind === 'stat' ? 'number' : 'boolean';
      if (target?.type !== wanted)
        at(`${path}.field`, `must name a ${wanted} field of ${collection.id}`);
      panel.field = String(p.field);
      return panel;
    });
  unique(panels, 'panels');

  const head = {
    id: id(root.id, 'id'),
    title: text(root.title, 'title'),
    purpose: text(root.purpose, 'purpose', LIMITS.longText),
    language: oneOf(root.language, LANGUAGES, 'language'),
    preset: oneOf(theme.preset, THEMES, 'theme.preset'),
  };
  if (errors.length) return { ok: false, errors: errors.slice(0, 20) };
  return {
    ok: true,
    spec: {
      schemaVersion: SCHEMA_VERSION,
      id: head.id,
      title: head.title,
      purpose: head.purpose,
      language: head.language,
      theme: { preset: head.preset, accent: accent.toLowerCase() },
      characters,
      collections,
      panels,
    },
  };
}
