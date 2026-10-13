import type { Character, World, WorldAction } from '@experience/room-spec';
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

/** What a rig on this stage is asked to do. */
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

export const canFly = (stage: Stage, id: string) =>
  Boolean(
    stage.cast.find((c) => c.character === id && capabilitiesOf(c.look).locomotion.includes('fly')),
  );

function routines(stage: Stage, flying: boolean) {
  return ROUTINE_NAMES.filter((name) => {
    const rule: { needs?: string; fly?: boolean } = ROUTINES[name];
    if (Boolean(rule.fly) !== flying) return false;
    return (
      !rule.needs ||
      stage.places.some((p) => affordancesAt(stage, p.id).includes(rule.needs as never))
    );
  });
}

/**
 * The world this stage declares to the engine: its description and its actions, with this
 * stage's places, routes and routines as the only options. Goes into the room's `world`.
 */
export function stageWorld(stage: Stage): World {
  const cast = stage.cast.map((c) => c.character);
  const flyers = cast.filter((id) => canFly(stage, id));
  const ground = stage.places.filter((p) => !p.height).map((p) => p.id);
  const all = stage.places.map((p) => p.id);
  const speed = { type: 'number', min: 0.2, max: 1, description: '0.2 slow to 1 brisk' } as const;
  const action = (
    name: string,
    description: string,
    params: WorldAction['params'],
    required: string[],
    characters = cast,
  ): WorldAction => ({ name, description, params, required, characters, silent: true });
  const actions: WorldAction[] = [
    action(
      'go_to',
      'Walk to a place on the floor while you keep talking.',
      { place: { type: 'choice', options: ground }, speed },
      ['place'],
    ),
    ...(flyers.length
      ? [
          action(
            'fly_to',
            'Fly to any place, high or low.',
            { place: { type: 'choice', options: all }, speed },
            ['place'],
            flyers,
          ),
        ]
      : []),
    ...(stage.routes.length
      ? [
          action(
            'follow_route',
            'Travel a named route stop by stop while you tell what happens.',
            { route: { type: 'choice', options: stage.routes.map((r) => r.id) }, speed },
            ['route'],
          ),
        ]
      : []),
    action(
      'play_routine',
      'Play a short action; you go first to a place that allows it.',
      {
        routine: { type: 'choice', options: routines(stage, false) },
        at: { type: 'choice', options: all },
      },
      ['routine'],
    ),
    ...(flyers.length && routines(stage, true).length
      ? [
          action(
            'fly_routine',
            'A flying action: launch from a place or orbit where you are.',
            {
              routine: { type: 'choice', options: routines(stage, true) },
              at: { type: 'choice', options: all },
            },
            ['routine'],
            flyers,
          ),
        ]
      : []),
    action(
      'look_at',
      'Turn toward a place, another character or the person.',
      { target: { type: 'choice', options: [...all, ...cast, 'person'] } },
      ['target'],
    ),
    action(
      'set_pose',
      'Stand up or sit where you are.',
      { pose: { type: 'choice', options: [...POSES] } },
      ['pose'],
    ),
    action(
      'perform',
      'Show a feeling and a gesture at a meaningful moment, not every sentence.',
      {
        expression: { type: 'choice', options: [...EXPRESSIONS] },
        gesture: { type: 'choice', options: [...GESTURES] },
        intensity: { type: 'number', min: 0, max: 1 },
        duration: { type: 'number', min: 1, max: 6 },
      },
      ['expression'],
    ),
  ];
  const places = stage.places.map((p) => {
    const offers = affordancesAt(stage, p.id);
    const props = stage.props.filter((x) => x.at === p.id).map((x) => x.prop);
    return `${p.id} "${p.label}"${p.height ? ' (in the air)' : ''}${p.means ? `: ${p.means}` : ''}${props.length ? ` [${props.join(', ')}]` : ''}${offers.length ? ` (${offers.join(', ')})` : ''}`;
  });
  const routes = stage.routes.map((r) => `${r.id} "${r.label}": ${r.through.join(' → ')}`);
  const describe = [
    `A ${stage.scene} stage.`,
    `Places: ${places.join('; ')}.`,
    routes.length ? `Routes: ${routes.join('; ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return { surface: 'stage-svg', describe, actions };
}

/** Maps an action the engine accepted to a rig command; null when it means nothing here. */
export function toCommand(
  stage: Stage,
  character: string,
  action: string,
  args: Record<string, unknown>,
): StageCommand | null {
  const base = { character };
  const speed = typeof args.speed === 'number' ? args.speed : 0.5;
  switch (action) {
    case 'go_to':
    case 'fly_to':
      return {
        ...base,
        type: 'go',
        place: String(args.place),
        how: action === 'fly_to' ? 'fly' : 'walk',
        speed,
      };
    case 'follow_route':
      return { ...base, type: 'route', route: String(args.route), speed };
    case 'play_routine':
    case 'fly_routine': {
      const routine = args.routine as Routine;
      const needs: string | undefined = (ROUTINES[routine] as { needs?: string }).needs;
      let at = typeof args.at === 'string' ? args.at : undefined;
      if (needs && (!at || !affordancesAt(stage, at).includes(needs as never)))
        at = stage.places.find((p) => affordancesAt(stage, p.id).includes(needs as never))?.id;
      return { ...base, type: 'routine', routine, ...(at ? { at } : {}) };
    }
    case 'look_at':
      return args.target === character
        ? null
        : { ...base, type: 'look', target: String(args.target) };
    case 'set_pose':
      return { ...base, type: 'pose', pose: args.pose as Pose };
    case 'perform':
      return {
        ...base,
        type: 'perform',
        expression: args.expression as Expression,
        gesture: (args.gesture as Gesture) ?? 'none',
        intensity: typeof args.intensity === 'number' ? args.intensity : 0.7,
        duration: typeof args.duration === 'number' ? args.duration : 3,
      };
    default:
      return null;
  }
}

/** The stage now in words: who is where and how, and what each prop shows. */
export function stageState(
  stage: Stage,
  characters: Character[],
  positions: Positions,
  data?: Record<string, { values: Record<string, unknown>; createdAt: string }[]>,
): string {
  const label = (id: string | null) =>
    stage.places.find((p) => p.id === id)?.label ?? 'between places';
  const people = stage.cast.map((c) => {
    const pos = positions[c.character] ?? { at: c.at, pose: c.pose };
    const name = characters.find((p) => p.id === c.character)?.name ?? c.character;
    return `${c.character} (${name}) ${pos.pose === 'sit' ? 'sitting' : 'standing'} at ${label(pos.at)}`;
  });
  const props = stage.props
    .filter((p) => PROPS[p.prop].states.length)
    .map((p) => `${p.id} (${p.prop}, ${propStateOf(p, data)})`);
  return [people.join('; '), props.length ? `Props: ${props.join(', ')}` : '']
    .filter(Boolean)
    .join('. ');
}
