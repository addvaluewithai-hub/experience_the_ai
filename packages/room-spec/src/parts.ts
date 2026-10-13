import type { Checker } from './check';
import { validateLook } from './look';
import { validateStage } from './stage';
import {
  CAPABILITIES,
  FIELD_TYPES,
  LIMITS,
  PANEL_KINDS,
  ROOM_VIEWS,
  type Character,
  type Collection,
  type Field,
  type Panel,
} from './types';

/** Checks of one room's parts; validate.ts walks the rooms and joins them. */
function field(check: Checker, value: unknown, path: string): Field {
  const f = check.object(value, path);
  const result: Field = {
    id: check.id(f.id, `${path}.id`),
    label: check.text(f.label, `${path}.label`),
    type: check.oneOf(f.type, FIELD_TYPES, `${path}.type`),
  };
  if (result.type === 'choice')
    result.options = check
      .list(f.options, `${path}.options`, 1, LIMITS.options)
      .map((o, i) => check.text(o, `${path}.options[${i}]`));
  if (f.required === true) result.required = true;
  return result;
}

export function collections(check: Checker, value: unknown, path: string): Collection[] {
  const result = check.list(value, path, 0, LIMITS.collections).map((v, i) => {
    const at = `${path}[${i}]`;
    const c = check.object(v, at);
    const fields = check
      .list(c.fields, `${at}.fields`, 1, LIMITS.fields)
      .map((f, j) => field(check, f, `${at}.fields[${j}]`));
    check.unique(fields, `${at}.fields`);
    return { id: check.id(c.id, `${at}.id`), label: check.text(c.label, `${at}.label`), fields };
  });
  check.unique(result, path);
  return result;
}

export function characters(check: Checker, value: unknown, path: string): Character[] {
  const result = check.list(value, path, 1, LIMITS.characters).map((v, i) => {
    const at = `${path}[${i}]`;
    const c = check.object(v, at);
    const capabilities = check
      .list(c.capabilities, `${at}.capabilities`, 0, CAPABILITIES.length)
      .map((cap, j) => check.oneOf(cap, CAPABILITIES, `${at}.capabilities[${j}]`));
    return {
      id: check.id(c.id, `${at}.id`),
      name: check.text(c.name, `${at}.name`),
      role: check.text(c.role, `${at}.role`),
      persona: check.text(c.persona, `${at}.persona`, LIMITS.longText),
      greeting: check.text(c.greeting, `${at}.greeting`, LIMITS.longText),
      capabilities: [...new Set(capabilities)],
      ...(c.look === undefined ? {} : { look: validateLook(check, c.look, `${at}.look`) }),
    };
  });
  check.unique(result, path);
  return result;
}

/** A boolean field of a collection, as progress, growth and pulse need. */
export function yesNoField(
  check: Checker,
  owned: Collection[],
  collectionId: unknown,
  fieldId: unknown,
  path: string,
) {
  const collection = owned.find((c) => c.id === collectionId);
  if (!collection) check.at(`${path}.collection`, 'must name a collection of this room');
  else if (collection.fields.find((f) => f.id === fieldId)?.type !== 'boolean')
    check.at(`${path}.field`, `must name a boolean field of ${collection.id}`);
  return { collection: String(collectionId), field: String(fieldId) };
}

export function panel(
  check: Checker,
  value: unknown,
  path: string,
  owned: Collection[],
  innerRooms: number,
  people: Character[],
): Panel {
  const p = check.object(value, path);
  const result: Panel = {
    id: check.id(p.id, `${path}.id`),
    kind: check.oneOf(p.kind, PANEL_KINDS, `${path}.kind`),
    title: check.text(p.title, `${path}.title`),
  };
  if (p.wide === true) result.wide = true;
  if (result.kind === 'text') {
    result.text = check.text(p.text, `${path}.text`, LIMITS.longText);
    return result;
  }
  if (result.kind === 'stage') {
    result.stage = validateStage(check, p.stage, `${path}.stage`, owned, people);
    return result;
  }
  if (result.kind === 'rooms') {
    if (!innerRooms) check.at(path, 'a rooms panel needs rooms inside this room');
    result.view = p.view === undefined ? 'doors' : check.oneOf(p.view, ROOM_VIEWS, `${path}.view`);
    return result;
  }
  if (result.kind === 'custom') {
    result.component = check.id(p.component, `${path}.component`);
    if (p.collection === undefined) return result;
    if (owned.some((c) => c.id === p.collection)) result.collection = String(p.collection);
    else check.at(`${path}.collection`, 'must name a collection of this room');
    return result;
  }
  const collection = owned.find((c) => c.id === p.collection);
  if (!collection) {
    check.at(`${path}.collection`, 'must name a collection of this room');
    return result;
  }
  result.collection = collection.id;
  if (p.field === undefined || p.field === null || p.field === '') {
    if (result.kind === 'progress' || result.kind === 'growth')
      check.at(`${path}.field`, 'must name a yes/no field');
    return result;
  }
  const wanted = result.kind === 'stat' ? 'number' : 'boolean';
  if (collection.fields.find((f) => f.id === p.field)?.type !== wanted)
    check.at(`${path}.field`, `must name a ${wanted} field of ${collection.id}`);
  result.field = String(p.field);
  return result;
}
