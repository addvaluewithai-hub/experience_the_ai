/**
 * An optional kit, not the engine: a 2.5D SVG stage with recipe-drawn humanoids, places,
 * props and routines. A room uses it through `stageRoom(room, stageConfig)`.
 */
export { StageController } from './controller';
export { StageView } from './StageView';
export { StageSurface, stageRoom } from './surface';
export { Humanoid } from './humanoid/Humanoid';
export { metricsOf, type Metrics } from './humanoid/metrics';
export { Rig, type Mode, type RigFrame, type Step, type World } from './rig';
export { project, VIEW, type Projected } from './project';
export { Spring } from './spring';
export { routineSteps } from './routines';
export {
  canFly,
  stageState,
  stageWorld,
  toCommand,
  type Positions,
  type StageCommand,
} from './world/agent';
export { capabilitiesOf, type CharacterLook } from './world/look';
export { affordancesAt, parseStage, propStateOf, type Stage } from './world/stage';
export * from './world/kit';
