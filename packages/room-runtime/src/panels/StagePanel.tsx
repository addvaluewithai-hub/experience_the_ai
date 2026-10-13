import { StageView } from '@experience/stage-runtime';
import type { PanelProps } from './types';

/** A stage panel needs the host's controller, which lives as long as the room is open. */
export function StagePanel({ spec, panel, data, stage }: PanelProps) {
  if (!stage) return null;
  return <StageView spec={spec} controller={stage} data={data} title={panel.title} />;
}
