import { LIMITS, type Collection, type Field, type RoomSpec } from './types';

/**
 * A room's own data: one record list per declared collection. The same rules guard a preview
 * held in browser memory and, later, the persisted per-room store, so a record an agent writes
 * is always a record the room's schema allows.
 */
export type RecordValue = string | number | boolean;
export type RoomRecord = { id: string; values: Record<string, RecordValue>; createdAt: string };
export type RoomData = Record<string, RoomRecord[]>;

export const MAX_RECORDS = 200;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class DataError extends Error {}

export function emptyData(spec: RoomSpec): RoomData {
  return Object.fromEntries(spec.collections.map((c) => [c.id, []]));
}

export function collectionOf(spec: RoomSpec, collectionId: unknown): Collection {
  const collection = spec.collections.find((c) => c.id === collectionId);
  if (!collection) throw new DataError(`Unknown collection ${String(collectionId)}`);
  return collection;
}

function checkValue(field: Field, value: unknown): RecordValue {
  const fail = (): never => {
    throw new DataError(`${field.label} must be ${field.type}`);
  };
  switch (field.type) {
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? value : fail();
    case 'boolean':
      return typeof value === 'boolean' ? value : fail();
    case 'date':
      return typeof value === 'string' && DATE.test(value) ? value : fail();
    case 'choice':
      return typeof value === 'string' && field.options?.includes(value) ? value : fail();
    default:
      return typeof value === 'string' && value.trim() && value.length <= LIMITS.longText
        ? value.trim()
        : fail();
  }
}

/** Accepts only declared fields; a full record must carry every required one. */
export function checkValues(collection: Collection, input: unknown, partial: boolean) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new DataError('Values must be an object');
  const values: Record<string, RecordValue> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    const field = collection.fields.find((f) => f.id === key);
    if (!field) throw new DataError(`${collection.label} has no field ${key}`);
    values[key] = checkValue(field, value);
  }
  if (!partial)
    for (const field of collection.fields)
      if (field.required && !(field.id in values))
        throw new DataError(`${field.label} is required`);
  if (!Object.keys(values).length) throw new DataError('No values given');
  return values;
}

export function addRecord(
  spec: RoomSpec,
  data: RoomData,
  collectionId: unknown,
  input: unknown,
  id: string,
  now = new Date(),
): RoomData {
  const collection = collectionOf(spec, collectionId);
  const records = data[collection.id] ?? [];
  if (records.length >= MAX_RECORDS) throw new DataError(`${collection.label} is full`);
  const record = {
    id,
    values: checkValues(collection, input, false),
    createdAt: now.toISOString(),
  };
  return { ...data, [collection.id]: [...records, record] };
}

function findRecord(spec: RoomSpec, data: RoomData, collectionId: unknown, recordId: unknown) {
  const collection = collectionOf(spec, collectionId);
  const records = data[collection.id] ?? [];
  const index = records.findIndex((r) => r.id === recordId);
  if (index < 0) throw new DataError(`No ${collection.label} record ${String(recordId)}`);
  return { collection, records, index };
}

export function updateRecord(
  spec: RoomSpec,
  data: RoomData,
  collectionId: unknown,
  recordId: unknown,
  input: unknown,
): RoomData {
  const { collection, records, index } = findRecord(spec, data, collectionId, recordId);
  const values = { ...records[index].values, ...checkValues(collection, input, true) };
  const next = records.with(index, { ...records[index], values });
  return { ...data, [collection.id]: next };
}

export function removeRecord(
  spec: RoomSpec,
  data: RoomData,
  collectionId: unknown,
  recordId: unknown,
): RoomData {
  const { collection, records, index } = findRecord(spec, data, collectionId, recordId);
  return { ...data, [collection.id]: records.toSpliced(index, 1) };
}

/** Rebuilds untrusted data (e.g. a preview snapshot sent to the server) through the rules. */
export function parseData(spec: RoomSpec, input: unknown): RoomData {
  const source = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const data = emptyData(spec);
  for (const collection of spec.collections) {
    const records = source[collection.id];
    if (!Array.isArray(records)) continue;
    for (const record of records.slice(0, MAX_RECORDS)) {
      const id = (record as RoomRecord)?.id;
      if (typeof id !== 'string' || !id || id.length > 40) throw new DataError('Bad record id');
      data[collection.id].push({
        id,
        values: checkValues(collection, (record as RoomRecord).values, true),
        createdAt: String((record as RoomRecord).createdAt ?? '').slice(0, 30),
      });
    }
  }
  return data;
}

/** Compact text view of the data for an agent's context; capped per collection. */
export function describeData(spec: RoomSpec, data: RoomData, perCollection = 30): string {
  return spec.collections
    .map((c) => {
      const records = data[c.id] ?? [];
      const lines = records
        .slice(-perCollection)
        .map((r) => `- [${r.id}] ${JSON.stringify(r.values)}`);
      const more = records.length > perCollection ? ` (latest ${perCollection} shown)` : '';
      return `${c.label} (${c.id}), ${records.length} records${more}:\n${lines.join('\n') || '- none'}`;
    })
    .join('\n\n');
}
