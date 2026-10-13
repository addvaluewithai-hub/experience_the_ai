import type { ComponentType } from 'react';
import type { Collection, Panel, PanelKind, RoomData, RoomSpec } from '@experience/room-spec';

export type PanelProps = {
  spec: RoomSpec;
  panel: Panel;
  /** The panel's collection, when its kind uses one (validation guarantees it exists). */
  collection?: Collection;
  data: RoomData;
  /** A person's edit; the host applies it through the room data rules. */
  edit: (change: (data: RoomData) => RoomData) => void;
};

export type PanelComponent = ComponentType<PanelProps>;
export type PanelRegistry = Record<Exclude<PanelKind, 'custom'>, PanelComponent>;
/** A room's own components, keyed by the id its custom panels name. */
export type CustomPanels = Record<string, PanelComponent>;

/** Values a panel reads, gathered once so panels stay small. */
export function doneCount(data: RoomData, panel: Panel) {
  const records = data[panel.collection ?? ''] ?? [];
  const done = records.filter((r) => panel.field && r.values[panel.field] === true).length;
  return { done, total: records.length };
}
