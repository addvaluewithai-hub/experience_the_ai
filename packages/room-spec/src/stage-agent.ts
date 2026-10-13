import {
  EXPRESSIONS,
  GESTURES,
  POSES,
  PROPS,
  ROUTINE_NAMES,
  ROUTINES,
  type Expression,
  type Gesture,
  type Locomotion,
  type Pose,
  type Routine,
} from './kit';
import { capabilitiesOf } from './look';
import { affordancesAt, propStateOf, type Stage } from './stage';
import type { RoomData } from './data';
import type { Character, RoomSpec } from './types';

/**
 * What a character on a stage may do, as semantic commands. The model never sends pixels:
 * it names places, routes, routines and characters, and the runtime moves the rig.
 */
export type StageCommand = { character: string } & (
  | { type: 'go'; place: string; how: Locomotion; speed: number }
  | { type: 'route'; route: string; speed: number }
  | { type: 'routine'; routine: Routine; at?: string }
  | { type: 'look'; target: string }
  | { type: 'pose'; pose: Pose }
  | {
      type: 'perform';
      expression: Expression;
      gesture: Gesture;
      intensity: number;
      duration: number;
    }
);
export type Positions = Record<string, { at: string | null; pose: Pose }>;
type Declaration = {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required: string[] };
};

export const STAGE_TOOLS = [
  'go_to',
  'follow_route',
  'play_routine',
  'look_at',
  'set_pose',
  'perform',
];

export function stageOf(spec: RoomSpec): Stage | undefined {
  return spec.panels.find((p) => p.kind === 'stage')?.stage;
}

function onStage(spec: RoomSpec, character: Character) {
  const stage = stageOf(spec);
  if (!stage || !character.look || !stage.cast.some((c) => c.character === character.id))
    return undefined;
  return { stage, look: character.look, caps: capabilitiesOf(character.look) };
}

/** Routines this character can play somewhere on this stage. */
function routinesFor(stage: Stage, canFly: boolean) {
  return ROUTINE_NAMES.filter((name) => {
    const rule: { needs?: string; fly?: boolean } = ROUTINES[name];
    if (rule.fly && !canFly) return false;
    return (
      !rule.needs ||
      stage.places.some((p) => affordancesAt(stage, p.id).includes(rule.needs as never))
    );
  });
}

export function stageTools(spec: RoomSpec, character: Character): Declaration[] {
  const here = onStage(spec, character);
  if (!here) return [];
  const { stage, caps } = here;
  const places = stage.places.map((p) => p.id);
  const others = stage.cast.filter((c) => c.character !== character.id).map((c) => c.character);
  const object = (properties: Record<string, unknown>, required: string[]) => ({
    type: 'object' as const,
    properties,
    required,
  });
  const speed = { type: 'number', description: '0.2 slow to 1 brisk; default 0.5' };
  const tools: Declaration[] = [
    {
      name: 'go_to',
      description: 'Move yourself to a place on the stage while you keep talking.',
      parameters: object(
        {
          place: { type: 'string', enum: places },
          how: { type: 'string', enum: caps.locomotion },
          speed,
        },
        ['place'],
      ),
    },
    {
      name: 'play_routine',
      description: 'Play a short action; you walk to a place that allows it first when needed.',
      parameters: object(
        {
          routine: { type: 'string', enum: routinesFor(stage, caps.locomotion.includes('fly')) },
          at: { type: 'string', enum: places },
        },
        ['routine'],
      ),
    },
    {
      name: 'look_at',
      description: 'Turn your face toward a place, another character or the person.',
      parameters: object({ target: { type: 'string', enum: [...places, ...others, 'person'] } }, [
        'target',
      ]),
    },
    {
      name: 'set_pose',
      description: 'Stand up or sit where you are.',
      parameters: object({ pose: { type: 'string', enum: caps.poses } }, ['pose']),
    },
    {
      name: 'perform',
      description:
        'Show a feeling and a gesture while you speak. Use at meaningful moments, not every sentence.',
      parameters: object(
        {
          expression: { type: 'string', enum: [...EXPRESSIONS] },
          gesture: { type: 'string', enum: [...GESTURES] },
          intensity: { type: 'number', description: '0 to 1, prefer 0.5–0.9' },
          duration: { type: 'number', description: 'seconds, 1 to 6' },
        },
        ['expression'],
      ),
    },
  ];
  if (stage.routes.length)
    tools.splice(1, 0, {
      name: 'follow_route',
      description: 'Travel along a named route, stop by stop, while you tell what happens.',
      parameters: object(
        { route: { type: 'string', enum: stage.routes.map((r) => r.id) }, speed },
        ['route'],
      ),
    });
  return tools;
}

const num = (v: unknown, low: number, high: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(high, Math.max(low, v)) : fallback;

/** Checks a stage tool call against this stage and character; never trusts the model's args. */
export function parseStageCall(
  spec: RoomSpec,
  character: Character,
  name: string,
  args: Record<string, unknown>,
): StageCommand | { error: string } {
  const here = onStage(spec, character);
  if (!here) return { error: 'You are not on a stage' };
  const { stage, caps } = here;
  const base = { character: character.id };
  const place = (v: unknown) => stage.places.find((p) => p.id === v)?.id;
  if (name === 'go_to') {
    const how = (args.how ??
      (place(args.place) && stage.places.find((p) => p.id === args.place)?.height
        ? 'fly'
        : 'walk')) as Locomotion;
    if (!place(args.place)) return { error: 'Unknown place' };
    if (!caps.locomotion.includes(how)) return { error: `You cannot ${how}` };
    return {
      ...base,
      type: 'go',
      place: args.place as string,
      how,
      speed: num(args.speed, 0.2, 1, 0.5),
    };
  }
  if (name === 'follow_route') {
    if (!stage.routes.some((r) => r.id === args.route)) return { error: 'Unknown route' };
    return {
      ...base,
      type: 'route',
      route: args.route as string,
      speed: num(args.speed, 0.2, 1, 0.5),
    };
  }
  if (name === 'play_routine') {
    const routine = args.routine as Routine;
    if (!routinesFor(stage, caps.locomotion.includes('fly')).includes(routine))
      return { error: 'You cannot play that here' };
    const needs: string | undefined = (ROUTINES[routine] as { needs?: string }).needs;
    let at = place(args.at);
    if (needs && (!at || !affordancesAt(stage, at).includes(needs as never)))
      at = stage.places.find((p) => affordancesAt(stage, p.id).includes(needs as never))?.id;
    return { ...base, type: 'routine', routine, ...(at ? { at } : {}) };
  }
  if (name === 'look_at') {
    const target = args.target as string;
    const known =
      place(target) ||
      target === 'person' ||
      stage.cast.some((c) => c.character === target && c.character !== character.id);
    return known ? { ...base, type: 'look', target } : { error: 'Unknown target' };
  }
  if (name === 'set_pose')
    return POSES.includes(args.pose as Pose)
      ? { ...base, type: 'pose', pose: args.pose as Pose }
      : { error: 'Unknown pose' };
  if (name === 'perform') {
    if (!EXPRESSIONS.includes(args.expression as Expression))
      return { error: 'Unknown expression' };
    const gesture = (GESTURES.includes(args.gesture as Gesture) ? args.gesture : 'none') as Gesture;
    return {
      ...base,
      type: 'perform',
      expression: args.expression as Expression,
      gesture,
      intensity: num(args.intensity, 0, 1, 0.7),
      duration: num(args.duration, 1, 6, 3),
    };
  }
  return { error: 'Unknown stage tool' };
}

/** The short description of the stage a character reads every turn. */
export function stageBrief(
  spec: RoomSpec,
  character: Character,
  positions: Positions = {},
  data?: RoomData,
): string {
  const here = onStage(spec, character);
  if (!here) return '';
  const { stage, caps } = here;
  const label = (id: string | null | undefined) =>
    stage.places.find((p) => p.id === id)?.label ?? 'between places';
  const where = (id: string) =>
    positions[id] ??
    (() => {
      const c = stage.cast.find((m) => m.character === id)!;
      return { at: c.at, pose: c.pose };
    })();
  const me = where(character.id);
  const places = stage.places.map((p) => {
    const offers = affordancesAt(stage, p.id);
    const props = stage.props.filter((x) => x.at === p.id).map((x) => x.prop);
    return `${p.id} "${p.label}"${p.means ? `: ${p.means}` : ''}${props.length ? ` [${props.join(', ')}]` : ''}${offers.length ? ` (${offers.join(', ')})` : ''}`;
  });
  const others = stage.cast
    .filter((c) => c.character !== character.id)
    .map((c) => {
      const who = spec.characters.find((p) => p.id === c.character);
      const pos = where(c.character);
      return `${c.character} (${who?.name}, ${who?.role}) ${pos.pose === 'sit' ? 'sitting' : 'standing'} at ${label(pos.at)}`;
    });
  return [
    `You are on a ${stage.scene} stage. You can ${caps.locomotion.join(', ')}; you are ${me.pose === 'sit' ? 'sitting' : 'standing'} at ${label(me.at)}.`,
    `Places: ${places.join('; ')}.`,
    stage.routes.length
      ? `Routes: ${stage.routes.map((r) => `${r.id} "${r.label}": ${r.through.join(' → ')}`).join('; ')}.`
      : '',
    others.length ? `Others here: ${others.join('; ')}.` : 'Nobody else is here.',
    `Props: ${stage.props.map((p) => `${p.id} (${p.prop}${PROPS[p.prop].states.length ? `, ${propStateOf(p, data)}` : ''})`).join(', ') || 'none'}.`,
    'Move and act with the stage tools while you talk; they are silent and do not need an answer. Name places, never coordinates. Do not narrate the tools.',
  ]
    .filter(Boolean)
    .join('\n');
}
