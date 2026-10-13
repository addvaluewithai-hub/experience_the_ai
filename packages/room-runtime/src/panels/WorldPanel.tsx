import { wordsFor } from '../words';
import type { PanelProps } from './types';

/** Shows the room's own surface; the engine does not know what it draws. */
export function WorldPanel(props: PanelProps) {
  const View = props.surface?.View;
  if (!View) return <p className="room-error">{wordsFor(props.spec.language).missing}</p>;
  return <View spec={props.spec} data={props.data} edit={props.edit} world={props.world} />;
}
