import { useCallback, type CSSProperties, type ReactNode } from 'react';
import type { RoomData, RoomSpec } from '@experience/room-spec';
import { GrowthPanel } from './panels/GrowthPanel';
import { ListPanel } from './panels/ListPanel';
import { RoomsPanel } from './panels/RoomsPanel';
import { ProgressPanel, StatPanel, TextPanel } from './panels/SummaryPanels';
import type { CustomPanels, PanelRegistry, RoomWorld } from './panels/types';
import { PanelBoundary } from './PanelBoundary';
import { wordsFor } from './words';
import { useRoomData, type RoomStore } from './store';

export const builtInPanels: PanelRegistry = {
  list: ListPanel,
  stat: StatPanel,
  progress: ProgressPanel,
  growth: GrowthPanel,
  text: TextPanel,
  rooms: RoomsPanel,
};

export type RoomViewProps = {
  /** A spec that passed validateRoom; the view does not re-check it. */
  spec: RoomSpec;
  store: RoomStore;
  /** Panel an agent is pointing at; highlighted and scrolled into view by the host's choice. */
  focus?: string;
  /** Host-owned area beside the panels, e.g. the agent conversation. */
  aside?: ReactNode;
  registry?: PanelRegistry;
  /** Components of this room's custom panels, compiled in by the host. */
  custom?: CustomPanels;
  /** The rooms inside this one: their data and a way in. Needed for rooms panels. */
  world?: RoomWorld;
};

/** Renders a room: theme, header and a responsive grid of panels from a fixed registry. */
export function RoomView(props: RoomViewProps) {
  const { spec, store, focus, aside, registry = builtInPanels, custom = {}, world } = props;
  const words = wordsFor(spec.language);
  const data = useRoomData(store);
  const edit = useCallback(
    (change: (current: RoomData) => RoomData) => store.set(change(store.get())),
    [store],
  );
  const style = { '--room-accent': spec.theme.accent } as CSSProperties;
  return (
    <div
      className="room"
      data-theme={spec.theme.preset}
      dir={spec.language === 'ar' ? 'rtl' : 'ltr'}
      lang={spec.language}
      style={style}
    >
      <header className="room-header">
        <h1>{spec.title}</h1>
        <p>{spec.purpose}</p>
      </header>
      <div className={aside ? 'room-body has-aside' : 'room-body'}>
        <div className="room-grid">
          {spec.panels.map((panel) => {
            const Panel =
              panel.kind === 'custom' ? custom[panel.component ?? ''] : registry[panel.kind];
            const collection = spec.collections.find((c) => c.id === panel.collection);
            return (
              <section
                key={panel.id}
                id={`panel-${panel.id}`}
                className={`room-panel room-panel-${panel.kind}`}
                data-wide={panel.wide || undefined}
                data-focus={focus === panel.id || undefined}
                aria-labelledby={`panel-title-${panel.id}`}
              >
                <h2 id={`panel-title-${panel.id}`}>{panel.title}</h2>
                <PanelBoundary message={words.broken}>
                  {Panel ? (
                    <Panel
                      spec={spec}
                      panel={panel}
                      collection={collection}
                      data={data}
                      edit={edit}
                      world={world}
                    />
                  ) : (
                    <p className="room-error">{words.missing}</p>
                  )}
                </PanelBoundary>
              </section>
            );
          })}
        </div>
        {aside}
      </div>
    </div>
  );
}
