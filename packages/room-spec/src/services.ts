import type { Checker } from './check';
import type { Character, RoomSpec } from './types';
import { actionArgs, actionTool, validateAction, type WorldAction } from './world';

/**
 * What a room may change outside itself: the person's own records in a source the host
 * registers (their LifeOS goals, say). A room declares each action like a world action, with
 * typed params and who may use it; the engine turns them into checked tools, and the host
 * performs accepted calls with the person's own authorization. `confirm`: the person confirms
 * each call on screen before it runs. The engine never knows what a source is.
 */
export type ServiceAction = WorldAction & { label: string; confirm: boolean };
export type Service = { source: string; actions: ServiceAction[] };
/** An accepted call, for the host to perform. */
export type ServiceCall = {
  source: string;
  action: string;
  label: string;
  args: Record<string, unknown>;
  confirm: boolean;
  character: string;
};

export const SERVICE_LIMITS = { services: 2, actions: 12 };
const SOURCE = /^[a-z][a-z0-9.-]{1,39}$/;

export function validateServices(
  check: Checker,
  value: unknown,
  path: string,
  people: Character[],
  taken: Set<string>,
): Service[] {
  return check.list(value, path, 1, SERVICE_LIMITS.services).map((v, i) => {
    const at = `${path}[${i}]`;
    const input = check.object(v, at);
    const source = typeof input.source === 'string' ? input.source : '';
    if (!SOURCE.test(source)) check.at(`${at}.source`, 'must name a source, e.g. lifeos.goals');
    const actions = check
      .list(input.actions, `${at}.actions`, 1, SERVICE_LIMITS.actions)
      .map((raw, j) => {
        const where = `${at}.actions[${j}]`;
        const a = check.object(raw, where);
        const declared = validateAction(check, a, where, people);
        if (taken.has(declared.name))
          check.at(`${where}.name`, `${declared.name} is already a tool`);
        taken.add(declared.name);
        return {
          ...declared,
          silent: false,
          label: check.text(a.label, `${where}.label`),
          confirm: a.confirm === true,
        };
      });
    return { source, actions };
  });
}

function serviceActions(spec: RoomSpec, character: Character) {
  return (spec.services ?? []).flatMap((service) =>
    service.actions
      .filter((a) => !a.characters || a.characters.includes(character.id))
      .map((action) => ({ service, action })),
  );
}

export function serviceTools(spec: RoomSpec, character: Character) {
  return serviceActions(spec, character).map(({ action }) => {
    const tool = actionTool(action);
    const asks = action.confirm
      ? ' The person confirms it on screen first; if they decline, accept it.'
      : '';
    return {
      ...tool,
      description: `${action.description} Changes the person's own records; done only when the result says ok.${asks}`,
    };
  });
}

export const isServiceCall = (spec: RoomSpec, name: string) =>
  Boolean(spec.services?.some((s) => s.actions.some((a) => a.name === name)));

/** Checks a call against the declared action; the host only ever sees accepted args. */
export function parseServiceCall(
  spec: RoomSpec,
  character: Character,
  name: string,
  input: Record<string, unknown>,
): { call: ServiceCall } | { error: string } {
  const found = serviceActions(spec, character).find(({ action }) => action.name === name);
  if (!found) return { error: `You cannot ${name} here` };
  const checked = actionArgs(found.action, input);
  if ('error' in checked) return checked;
  const { service, action } = found;
  return {
    call: {
      source: service.source,
      action: action.name,
      label: action.label,
      args: checked.args,
      confirm: action.confirm,
      character: character.id,
    },
  };
}

/** A call the person makes from the room's own surface: the same params, no character. */
export function parsePersonCall(spec: RoomSpec, name: string, input: Record<string, unknown>) {
  const service = spec.services?.find((s) => s.actions.some((a) => a.name === name));
  const action = service?.actions.find((a) => a.name === name);
  if (!service || !action) return { error: `${name} is not an action of this room` } as const;
  const checked = actionArgs(action, input);
  if ('error' in checked) return checked;
  return { source: service.source, action: name, args: checked.args };
}
