import { type Routine } from './world/kit';
import type { Step } from './rig';

/** The air above a place: where a launch rises to. Rigs resolve it through the world. */
export const air = (place: string) => `@air:${place}`;

/**
 * Each routine as steps the rig plays in order. Routines that need a place walk there first;
 * the place was already checked to offer what the routine needs.
 */
export function routineSteps(routine: Routine, at: string | undefined, canFly: boolean): Step[] {
  const go: Step[] = at ? [{ kind: 'go', place: at, how: 'walk', speed: 0.5 }] : [];
  switch (routine) {
    case 'eat':
      return [...go, { kind: 'act', action: 'eat', seconds: 3.5, expression: 'happy' }];
    case 'drink':
      return [...go, { kind: 'act', action: 'drink', seconds: 2.5, expression: 'happy' }];
    case 'sleep':
      return [...go, { kind: 'pose', pose: 'sit' }, { kind: 'act', action: 'sleep', seconds: 6 }];
    case 'read':
      return [
        ...go,
        { kind: 'pose', pose: 'sit' },
        { kind: 'act', action: 'read', seconds: 4, expression: 'thinking' },
      ];
    case 'present':
      return [
        ...go,
        { kind: 'act', action: 'explain', seconds: 2.5, expression: 'happy' },
        { kind: 'act', action: 'point', seconds: 1.5 },
      ];
    case 'launch':
      if (!canFly || !at) return [];
      return [
        ...go,
        { kind: 'act', action: 'crouch', seconds: 0.6, expression: 'excited' },
        { kind: 'go', place: air(at), how: 'fly', speed: 0.8 },
      ];
    case 'orbit':
      return canFly ? [{ kind: 'orbit', seconds: 5 }] : [];
    case 'cheer':
      return [{ kind: 'act', action: 'cheer', seconds: 3, expression: 'excited' }];
    case 'dance':
      return [{ kind: 'act', action: 'dance', seconds: 4, expression: 'happy' }];
    case 'wave':
      return [{ kind: 'act', action: 'wave', seconds: 2, expression: 'happy' }];
  }
}
