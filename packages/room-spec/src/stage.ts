import type { Checker, Input } from './check';
import {
  AFFORDANCES,
  POSES,
  PROP_KINDS,
  PROPS,
  SCENES,
  STAGE_LIMITS,
  type Affordance,
  type Pose,
  type PropKind,
  type Scene,
} from './kit';
import type { Character, Collection } from './types';

/** A place on the floor: x 0–1 across, depth 0 (front) to 1 (back). Meaning is for the AI. */
export type Place = {
  id: string;
  label: string;
  x: number;
  depth: number;
  /** Up in the air (0 floor to 1 top), for skies and space. */
  height?: number;
  means?: string;
  affords: Affordance[];
};
/** A prop state shown when the room's data says so: `on` if `collection` has a record whose
 * boolean `field` is true (created today, with `today`), otherwise `off`. */
export type PropBinding = {
  collection: string;
  field: string;
  today?: boolean;
  on: string;
  off: string;
};
export type StageProp = {
  id: string;
  prop: PropKind;
  at: string;
  state?: string;
  bind?: PropBinding;
};
export type Route = { id: string; label: string; through: string[]; means?: string };
export type CastMember = { character: string; at: string; pose: Pose; facing: 'left' | 'right' };
export type Stage = {
  scene: Scene;
  places: Place[];
  props: StageProp[];
  routes: Route[];
  cast: CastMember[];
};

/** Everything a place offers: its own affordances and those of the props standing on it. */
export function affordancesAt(stage: Stage, placeId: string): Affordance[] {
  const place = stage.places.find((p) => p.id === placeId);
  const fromProps = stage.props
    .filter((p) => p.at === placeId)
    .flatMap((p) => PROPS[p.prop].affords);
  return [...new Set([...(place?.affords ?? []), ...fromProps])];
}

export function validateStage(
  check: Checker,
  value: unknown,
  path: string,
  owned: Collection[],
  people: Character[],
): Stage {
  const input = check.object(value, path);
  const unit = (v: unknown, at: string) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 1)
      check.at(at, 'must be 0 to 1');
    return typeof v === 'number' ? Math.min(1, Math.max(0, v)) : 0.5;
  };
  const places: Place[] = check
    .list(input.places, `${path}.places`, 1, STAGE_LIMITS.places)
    .map((v, i) => {
      const at = `${path}.places[${i}]`;
      const p = check.object(v, at);
      const place: Place = {
        id: check.id(p.id, `${at}.id`),
        label: check.text(p.label, `${at}.label`),
        x: unit(p.x, `${at}.x`),
        depth: unit(p.depth, `${at}.depth`),
        affords: (p.affords === undefined ? [] : check.list(p.affords, `${at}.affords`, 0, 6)).map(
          (a, j) => check.oneOf(a, AFFORDANCES, `${at}.affords[${j}]`),
        ),
      };
      if (p.height !== undefined) place.height = unit(p.height, `${at}.height`);
      if (p.means !== undefined) place.means = check.text(p.means, `${at}.means`, 200);
      return place;
    });
  check.unique(places, `${path}.places`);
  const placeIds = new Set(places.map((p) => p.id));
  const placeRef = (v: unknown, at: string) => {
    if (!placeIds.has(v as string)) check.at(at, 'must name a place of this stage');
    return String(v);
  };

  const props = (
    input.props === undefined ? [] : check.list(input.props, `${path}.props`, 0, STAGE_LIMITS.props)
  ).map((v, i) =>
    prop(check, check.object(v, `${path}.props[${i}]`), `${path}.props[${i}]`, placeRef, owned),
  );
  check.unique(props, `${path}.props`);

  const routes = (
    input.routes === undefined
      ? []
      : check.list(input.routes, `${path}.routes`, 0, STAGE_LIMITS.routes)
  ).map((v, i) => {
    const at = `${path}.routes[${i}]`;
    const r = check.object(v, at);
    const route: Route = {
      id: check.id(r.id, `${at}.id`),
      label: check.text(r.label, `${at}.label`),
      through: check
        .list(r.through, `${at}.through`, 2, STAGE_LIMITS.routeStops)
        .map((stop, j) => placeRef(stop, `${at}.through[${j}]`)),
    };
    if (r.means !== undefined) route.means = check.text(r.means, `${at}.means`, 200);
    return route;
  });
  check.unique(routes, `${path}.routes`);

  const cast = (
    input.cast === undefined ? [] : check.list(input.cast, `${path}.cast`, 0, STAGE_LIMITS.cast)
  ).map((v, i) => {
    const at = `${path}.cast[${i}]`;
    const c = check.object(v, at);
    const person = people.find((p) => p.id === c.character);
    if (!person) check.at(`${at}.character`, 'must name a character of this room');
    else if (!person.look)
      check.at(`${at}.character`, `${person.id} needs a look to stand on a stage`);
    return {
      character: String(c.character),
      at: placeRef(c.at, `${at}.at`),
      pose: c.pose === undefined ? 'stand' : check.oneOf(c.pose, POSES, `${at}.pose`),
      facing:
        c.facing === undefined
          ? 'right'
          : check.oneOf(c.facing, ['left', 'right'] as const, `${at}.facing`),
    } satisfies CastMember;
  });
  const seen = new Set<string>();
  for (const member of cast) {
    if (seen.has(member.character)) check.at(`${path}.cast`, `${member.character} is cast twice`);
    seen.add(member.character);
  }
  return {
    scene: check.oneOf(input.scene ?? 'plain', SCENES, `${path}.scene`),
    places,
    props,
    routes,
    cast,
  };
}

function prop(
  check: Checker,
  p: Input,
  at: string,
  placeRef: (v: unknown, at: string) => string,
  owned: Collection[],
): StageProp {
  const kind = check.oneOf(p.prop, PROP_KINDS, `${at}.prop`);
  const states: readonly string[] = PROPS[kind]?.states ?? [];
  const state = (v: unknown, path: string) => {
    if (!states.includes(v as string))
      check.at(
        path,
        states.length ? `must be one of ${states.join(', ')}` : 'this prop has no states',
      );
    return String(v);
  };
  const result: StageProp = {
    id: check.id(p.id, `${at}.id`),
    prop: kind,
    at: placeRef(p.at, `${at}.at`),
  };
  if (p.state !== undefined) result.state = state(p.state, `${at}.state`);
  if (p.bind !== undefined) {
    const b = check.object(p.bind, `${at}.bind`);
    const collection = owned.find((c) => c.id === b.collection);
    if (!collection) check.at(`${at}.bind.collection`, 'must name a collection of this room');
    else if (collection.fields.find((f) => f.id === b.field)?.type !== 'boolean')
      check.at(`${at}.bind.field`, `must name a boolean field of ${collection.id}`);
    result.bind = {
      collection: String(b.collection),
      field: String(b.field),
      on: state(b.on, `${at}.bind.on`),
      off: state(b.off, `${at}.bind.off`),
      ...(b.today === true ? { today: true } : {}),
    };
  }
  return result;
}

/** The state a prop shows: bound to the room's data when it has a binding, else as authored. */
export function propStateOf(
  prop: StageProp,
  data: Record<string, { values: Record<string, unknown>; createdAt: string }[]> | undefined,
  today = new Date().toISOString().slice(0, 10),
): string | undefined {
  if (!prop.bind) return prop.state ?? PROPS[prop.prop].states[0];
  const { collection, field, on, off } = prop.bind;
  const records = data?.[collection] ?? [];
  const hit = records.some(
    (r) => r.values[field] === true && (!prop.bind!.today || r.createdAt.slice(0, 10) === today),
  );
  return hit ? on : off;
}
