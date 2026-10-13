/**
 * The shared kit that looks and stages are built from. Rooms pick from these lists; adding a
 * variant, prop, routine or body plan is engine work that every room then gets.
 */
export const BODY_PLANS = ['humanoid'] as const;
export type BodyPlan = (typeof BODY_PLANS)[number];
export const AGES = ['child', 'teen', 'adult'] as const;
export const HAIR = [
  'short',
  'curly',
  'long',
  'bob',
  'bun',
  'ponytail',
  'spiky',
  'bald',
  'hijab',
] as const;
export const EYES = ['round', 'almond', 'sleepy', 'sparkle'] as const;
export const TOPS = [
  'tshirt',
  'hoodie',
  'shirt',
  'blazer',
  'dress',
  'sweater',
  'spacesuit',
] as const;
export const BOTTOMS = ['pants', 'shorts', 'skirt', 'jeans'] as const;
export const ACCESSORIES = [
  'glasses',
  'headset',
  'cap',
  'backpack',
  'scarf',
  'bow',
  'jetpack',
  'headband',
] as const;

export const POSES = ['stand', 'sit'] as const;
export type Pose = (typeof POSES)[number];
export const LOCOMOTION = ['walk', 'run', 'hop', 'fly'] as const;
export type Locomotion = (typeof LOCOMOTION)[number];
export const EXPRESSIONS = [
  'neutral',
  'happy',
  'sad',
  'surprised',
  'thinking',
  'laughing',
  'excited',
  'sleepy',
] as const;
export type Expression = (typeof EXPRESSIONS)[number];
export const GESTURES = [
  'none',
  'wave',
  'explain',
  'think',
  'celebrate',
  'cheer',
  'nod',
  'point',
] as const;
export type Gesture = (typeof GESTURES)[number];

export const SCENES = ['classroom', 'space', 'home', 'garden', 'stage', 'plain'] as const;
export type Scene = (typeof SCENES)[number];

/** What can be done at a place, by the place itself or by a prop standing there. */
export const AFFORDANCES = [
  'eat',
  'drink',
  'sleep',
  'sit',
  'read',
  'play',
  'present',
  'launch',
  'land',
  'rest',
] as const;
export type Affordance = (typeof AFFORDANCES)[number];

/** Props: their states (first is the default), what they offer, and whether one sits on them. */
export const PROPS = {
  desk: { states: [], affords: ['sit', 'read'], seat: 'top' },
  chair: { states: [], affords: ['sit'], seat: 'seat' },
  rug: { states: [], affords: ['sit', 'play'], seat: 'floor' },
  sofa: { states: [], affords: ['sit', 'rest'], seat: 'seat' },
  bed: { states: [], affords: ['sleep', 'rest'], seat: 'seat' },
  board: { states: ['clean', 'written'], affords: ['present'] },
  bowl: { states: ['empty', 'full'], affords: ['eat'] },
  water: { states: ['empty', 'full'], affords: ['drink'] },
  plant: { states: ['small', 'grown'], affords: [] },
  tree: { states: ['bare', 'green', 'blooming'], affords: ['rest'] },
  rocket: { states: ['parked', 'flying'], affords: ['launch', 'land'] },
  planet: { states: ['dark', 'lit'], affords: ['land'] },
  star: { states: ['dim', 'bright'], affords: [] },
  door: { states: ['closed', 'open'], affords: [] },
  window: { states: ['day', 'night'], affords: [] },
  lamp: { states: ['off', 'on'], affords: [] },
  flag: { states: ['down', 'up'], affords: [] },
} as const satisfies Record<
  string,
  { states: readonly string[]; affords: readonly Affordance[]; seat?: 'top' | 'seat' | 'floor' }
>;
export type PropKind = keyof typeof PROPS;
export const PROP_KINDS = Object.keys(PROPS) as PropKind[];

/**
 * Routines are small choreographies the engine plays. `needs` is an affordance the place must
 * offer (the character walks there first); `fly` means the character must be able to fly.
 */
export const ROUTINES = {
  eat: { needs: 'eat' },
  drink: { needs: 'drink' },
  sleep: { needs: 'sleep' },
  read: { needs: 'read' },
  present: { needs: 'present' },
  launch: { needs: 'launch', fly: true },
  orbit: { fly: true },
  cheer: {},
  dance: {},
  wave: {},
} as const satisfies Record<string, { needs?: Affordance; fly?: boolean }>;
export type Routine = keyof typeof ROUTINES;
export const ROUTINE_NAMES = Object.keys(ROUTINES) as Routine[];

export const STAGE_LIMITS = { places: 16, props: 24, routes: 6, routeStops: 8, cast: 6 } as const;

/** Gemini Live's prebuilt voices, by Google's names (as in new-learn's Nova settings). */
export const VOICES = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
] as const;
export type VoiceName = (typeof VOICES)[number];
