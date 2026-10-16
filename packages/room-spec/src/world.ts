import type { Checker, Input } from './check';
import type { Character, RoomSpec } from './types';

/**
 * A room's world, declared by the room itself: which surface draws it, how it looks in words,
 * and what its characters may do there. The engine knows no places, props or bodies; it only
 * turns these declared actions into checked tools and hands accepted calls to the surface.
 */
export const PARAM_TYPES = ['text', 'number', 'boolean', 'choice'] as const;
export type WorldParam = {
  type: (typeof PARAM_TYPES)[number];
  description?: string;
  /** choice only: the allowed values (places, routines, other characters…). */
  options?: string[];
  /** number only: accepted range; values outside are clamped. */
  min?: number;
  max?: number;
};
export type WorldAction = {
  name: string;
  description: string;
  params: Record<string, WorldParam>;
  required: string[];
  /** Only these characters may use it; all characters when absent. */
  characters?: string[];
  /** Presentation only: answered silently and never blocks speech (default true). */
  silent: boolean;
};
/** A moment the surface directs (camera, staging, effects), named so characters can call it. */
export type WorldScene = { id: string; description: string };
export type World = {
  surface: string;
  describe: string;
  actions: WorldAction[];
  /** Directed moments. Characters get a `play_scene` tool to play one at the right time. */
  scenes?: WorldScene[];
  /** The scene the surface plays when a person arrives, before anyone speaks. */
  arrival?: string;
};
/** An accepted call, for the surface to perform. */
export type WorldAct = { character: string; action: string; args: Record<string, unknown> };

const NAME = /^[a-z][a-z0-9_]{1,39}$/;
const RESERVED = /^(list_|add_|update_|remove_|open_room$|play_scene$)/;
export const WORLD_LIMITS = {
  actions: 16,
  params: 8,
  options: 40,
  describe: 1500,
  state: 2000,
  scenes: 12,
};

export function validateWorld(
  check: Checker,
  value: unknown,
  path: string,
  people: Character[],
): World {
  const input = check.object(value, path);
  const actions = check
    .list(input.actions, `${path}.actions`, 0, WORLD_LIMITS.actions)
    .map((v, i) =>
      validateAction(
        check,
        check.object(v, `${path}.actions[${i}]`),
        `${path}.actions[${i}]`,
        people,
      ),
    );
  const seen = new Set<string>();
  for (const a of actions) {
    if (seen.has(a.name)) check.at(`${path}.actions`, `duplicate action ${a.name}`);
    seen.add(a.name);
  }
  const world: World = {
    surface: check.id(input.surface, `${path}.surface`),
    describe: check.text(input.describe, `${path}.describe`, WORLD_LIMITS.describe),
    actions,
  };
  if (input.scenes !== undefined) {
    world.scenes = check
      .list(input.scenes, `${path}.scenes`, 1, WORLD_LIMITS.scenes)
      .map((v, i) => {
        const at = `${path}.scenes[${i}]`;
        const scene = check.object(v, at);
        return {
          id: check.id(scene.id, `${at}.id`),
          description: check.text(scene.description, `${at}.description`, 300),
        };
      });
    check.unique(world.scenes, `${path}.scenes`);
  }
  if (input.arrival !== undefined) {
    world.arrival = check.id(input.arrival, `${path}.arrival`);
    if (!world.scenes?.some((s) => s.id === world.arrival))
      check.at(`${path}.arrival`, 'must name one of the scenes');
  }
  return world;
}

/** One declared action (a world action, or a service action's shared part). */
export function validateAction(
  check: Checker,
  a: Input,
  at: string,
  people: Character[],
): WorldAction {
  const name = typeof a.name === 'string' ? a.name : '';
  if (!NAME.test(name) || RESERVED.test(name))
    check.at(`${at}.name`, 'must be a snake_case name that is not a data tool');
  const paramsIn = a.params === undefined ? {} : check.object(a.params, `${at}.params`);
  const entries = Object.entries(paramsIn).slice(0, WORLD_LIMITS.params);
  if (Object.keys(paramsIn).length > WORLD_LIMITS.params)
    check.at(`${at}.params`, `at most ${WORLD_LIMITS.params} params`);
  const params: Record<string, WorldParam> = {};
  for (const [key, raw] of entries) {
    const p = check.object(raw, `${at}.params.${key}`);
    if (!NAME.test(key)) check.at(`${at}.params.${key}`, 'must be a snake_case name');
    const param: WorldParam = {
      type: check.oneOf(p.type, PARAM_TYPES, `${at}.params.${key}.type`),
    };
    if (p.description !== undefined)
      param.description = check.text(p.description, `${at}.params.${key}.description`, 200);
    if (param.type === 'choice')
      param.options = check
        .list(p.options, `${at}.params.${key}.options`, 1, WORLD_LIMITS.options)
        .map((o, i) => check.text(o, `${at}.params.${key}.options[${i}]`));
    if (param.type === 'number')
      for (const bound of ['min', 'max'] as const)
        if (p[bound] !== undefined) {
          if (typeof p[bound] !== 'number' || !Number.isFinite(p[bound]))
            check.at(`${at}.params.${key}.${bound}`, 'must be a number');
          else param[bound] = p[bound] as number;
        }
    params[key] = param;
  }
  const required = (
    a.required === undefined ? [] : check.list(a.required, `${at}.required`, 0, WORLD_LIMITS.params)
  ).map(String);
  for (const r of required) if (!(r in params)) check.at(`${at}.required`, `${r} is not a param`);
  const result: WorldAction = {
    name,
    description: check.text(a.description, `${at}.description`, 300),
    params,
    required,
    silent: a.silent !== false,
  };
  if (a.characters !== undefined) {
    result.characters = check.list(a.characters, `${at}.characters`, 1, 8).map(String);
    for (const id of result.characters)
      if (!people.some((c) => c.id === id))
        check.at(`${at}.characters`, `${id} is not a character of this room`);
  }
  return result;
}

/** Declared actions this character may use, plus `play_scene` when the world has scenes. */
function actionsFor(spec: RoomSpec, character: Character): WorldAction[] {
  const declared = (spec.world?.actions ?? []).filter(
    (a) => !a.characters || a.characters.includes(character.id),
  );
  const scenes = spec.world?.scenes ?? [];
  if (!scenes.length) return declared;
  return [
    ...declared,
    {
      name: 'play_scene',
      description: `Play a directed moment of the world when it fits what is happening: ${scenes.map((s) => `${s.id} (${s.description})`).join('; ')}.`,
      params: { scene: { type: 'choice', options: scenes.map((s) => s.id) } },
      required: ['scene'],
      silent: true,
    },
  ];
}

/** A declared action as a tool the model can call, with typed parameters. */
export function actionTool(a: WorldAction) {
  return {
    name: a.name,
    description: a.description,
    parameters: {
      type: 'object' as const,
      properties: Object.fromEntries(
        Object.entries(a.params).map(([key, p]) => [
          key,
          p.type === 'choice'
            ? { type: 'string', enum: p.options, description: p.description }
            : p.type === 'number'
              ? { type: 'number', description: p.description, minimum: p.min, maximum: p.max }
              : { type: p.type === 'text' ? 'string' : 'boolean', description: p.description },
        ]),
      ),
      required: a.required,
    },
  };
}

export function worldTools(spec: RoomSpec, character: Character) {
  return actionsFor(spec, character).map(actionTool);
}

/** Whether a tool name belongs to the world (a declared action, or a scene to play). */
export const isWorldCall = (spec: RoomSpec, name: string) =>
  Boolean(spec.world?.actions.some((a) => a.name === name)) ||
  (name === 'play_scene' && Boolean(spec.world?.scenes?.length));

/** Checks a call against the declared action; the surface only ever sees accepted args. */
export function parseWorldCall(
  spec: RoomSpec,
  character: Character,
  name: string,
  input: Record<string, unknown>,
): { act: WorldAct; silent: boolean } | { error: string } {
  const declared = actionsFor(spec, character).find((a) => a.name === name);
  if (!declared) return { error: `You cannot ${name} here` };
  const checked = actionArgs(declared, input);
  if ('error' in checked) return checked;
  return {
    act: { character: character.id, action: name, args: checked.args },
    silent: declared.silent,
  };
}

/** The call's arguments checked against the declared params: only these ever reach a host. */
export function actionArgs(
  declared: WorldAction,
  input: Record<string, unknown>,
): { args: Record<string, unknown> } | { error: string } {
  const args: Record<string, unknown> = {};
  for (const [key, p] of Object.entries(declared.params)) {
    const v = input[key];
    if (v === undefined || v === null || v === '') {
      if (declared.required.includes(key)) return { error: `${key} is required` };
      continue;
    }
    if (p.type === 'choice' && !p.options!.includes(v as string))
      return { error: `${key} must be one of ${p.options!.join(', ')}` };
    if (p.type === 'number') {
      if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `${key} must be a number` };
      args[key] = Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, v));
      continue;
    }
    if (p.type === 'boolean' && typeof v !== 'boolean')
      return { error: `${key} must be true or false` };
    if (p.type === 'text' && (typeof v !== 'string' || v.length > 300))
      return { error: `${key} must be short text` };
    args[key] = v;
  }
  return { args };
}

/** The world as a character reads it: the room's description, the surface's "now", the rules. */
export function worldBrief(spec: RoomSpec, character: Character, state = ''): string {
  if (!spec.world) return '';
  const actions = actionsFor(spec, character);
  return [
    spec.world.describe,
    state ? `Now: ${state.slice(0, WORLD_LIMITS.state)}` : '',
    actions.length
      ? `You act in this world with your world tools (${actions.map((a) => a.name).join(', ')}). Name things by the given options, never coordinates. ${actions.some((a) => a.silent) ? 'Silent tools need no answer: keep talking while you use them and never narrate them.' : ''}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}
