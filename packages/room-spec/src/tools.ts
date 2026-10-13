import { addRecord, describeData, removeRecord, updateRecord, type RoomData } from './data';
import { parseWorldCall, worldTools, type WorldAct } from './world';
import { innerRooms } from './tree';
import type { Character, Field, RoomSpec } from './types';

/**
 * Agent tools are derived from the room, never authored: one set per collection with typed
 * parameters, plus focus_panel, and open_room when the room holds rooms. A character only
 * receives the tools its capabilities allow, and every call runs through the same data rules
 * as a person's edit. Characters never write into another room's data.
 */
export type ToolDeclaration = {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] };
};
export type ToolCall = { name: string; args: Record<string, unknown> };
export type ToolOutcome = {
  data: RoomData;
  response: Record<string, unknown>;
  /** A short human line for the activity log, e.g. "Added to Habits". */
  activity?: string;
  focus?: string;
  /** open_room: the inner room to take the person to, with a note for its character. */
  open?: { path: string; note: string };
  /** A world action for the room's surface. Presentation only, never data. */
  act?: WorldAct;
  /** Answer it silently, without blocking speech (world actions declared silent). */
  silent?: boolean;
};

const key = (id: string) => id.replaceAll('-', '_');

function fieldSchema(field: Field) {
  const description = field.label;
  if (field.type === 'choice') return { type: 'string', enum: field.options, description };
  if (field.type === 'date') return { type: 'string', description: `${description} (YYYY-MM-DD)` };
  return { type: field.type === 'text' ? 'string' : field.type, description };
}

export function agentTools(spec: RoomSpec, character: Character): ToolDeclaration[] {
  const tools: ToolDeclaration[] = [];
  const write = character.capabilities.includes('data.write');
  for (const c of spec.collections) {
    const properties = Object.fromEntries(c.fields.map((f) => [f.id, fieldSchema(f)]));
    const recordId = { type: 'string', description: 'The record id shown in [brackets]' };
    tools.push({
      name: `list_${key(c.id)}`,
      description: `Read every ${c.label} record with its id.`,
      parameters: { type: 'object', properties: {}, required: [] },
    });
    if (!write) continue;
    tools.push(
      {
        name: `add_${key(c.id)}`,
        description: `Add one ${c.label} record. Only when the person asked or clearly agreed.`,
        parameters: {
          type: 'object',
          properties,
          required: c.fields.filter((f) => f.required).map((f) => f.id),
        },
      },
      {
        name: `update_${key(c.id)}`,
        description: `Change fields of one ${c.label} record; omitted fields stay as they are.`,
        parameters: {
          type: 'object',
          properties: { recordId, ...properties },
          required: ['recordId'],
        },
      },
      {
        name: `remove_${key(c.id)}`,
        description: `Delete one ${c.label} record. Only after the person confirmed.`,
        parameters: { type: 'object', properties: { recordId }, required: ['recordId'] },
      },
    );
  }
  if (character.capabilities.includes('ui.focus') && spec.panels.length)
    tools.push({
      name: 'focus_panel',
      description: 'Draw the person’s attention to one panel of the room while you talk about it.',
      parameters: {
        type: 'object',
        properties: { panelId: { type: 'string', enum: spec.panels.map((p) => p.id) } },
        required: ['panelId'],
      },
    });
  const inner = innerRooms(spec).filter((r) => !r.spec.planned);
  if (inner.length)
    tools.push({
      name: 'open_room',
      description:
        'Take the person to a room inside this one when their need belongs there. Its own character continues from your note, so say what they want in a sentence or two.',
      parameters: {
        type: 'object',
        properties: {
          room: { type: 'string', enum: inner.map((r) => r.path), description: 'Room path' },
          note: { type: 'string', description: 'What the person needs, in their language' },
        },
        required: ['room', 'note'],
      },
    });
  return [...tools, ...worldTools(spec, character)];
}

/** Runs one call against the data. Errors become tool responses so the agent can recover. */
export function runTool(
  spec: RoomSpec,
  character: Character,
  data: RoomData,
  call: ToolCall,
  newId: () => string,
): ToolOutcome {
  const allowed = agentTools(spec, character).some((t) => t.name === call.name);
  if (!allowed) return { data, response: { error: `Tool ${call.name} is not available` } };
  if (spec.world?.actions.some((a) => a.name === call.name)) {
    const parsed = parseWorldCall(spec, character, call.name, call.args);
    if ('error' in parsed) return { data, response: { error: parsed.error } };
    return { data, response: { ok: true }, act: parsed.act, silent: parsed.silent };
  }
  if (call.name === 'open_room') {
    const room = innerRooms(spec).find((r) => r.path === call.args.room && !r.spec.planned);
    const note = typeof call.args.note === 'string' ? call.args.note.trim().slice(0, 1000) : '';
    if (!room || !note) return { data, response: { error: 'Give a known room and a note' } };
    return { data, response: { ok: true }, open: { path: room.path, note } };
  }
  if (call.name === 'focus_panel') {
    const panel = spec.panels.find((p) => p.id === call.args.panelId);
    if (!panel) return { data, response: { error: 'Unknown panel' } };
    return { data, response: { ok: true }, focus: panel.id };
  }
  const [verb, ...rest] = call.name.split('_');
  const collection = spec.collections.find((c) => key(c.id) === rest.join('_'));
  if (!collection) return { data, response: { error: 'Unknown collection' } };
  const { recordId, ...values } = call.args;
  try {
    if (verb === 'list')
      return {
        data,
        response: { records: describeData({ ...spec, collections: [collection] }, data, 50) },
      };
    if (verb === 'add') {
      const id = newId();
      const next = addRecord(spec, data, collection.id, values, id);
      return {
        data: next,
        response: { ok: true, recordId: id },
        activity: `+ ${collection.label}`,
      };
    }
    if (verb === 'update') {
      const next = updateRecord(spec, data, collection.id, recordId, values);
      return { data: next, response: { ok: true }, activity: `✎ ${collection.label}` };
    }
    const next = removeRecord(spec, data, collection.id, recordId);
    return { data: next, response: { ok: true }, activity: `− ${collection.label}` };
  } catch (error) {
    return { data, response: { error: error instanceof Error ? error.message : 'Failed' } };
  }
}
