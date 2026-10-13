import type { ComponentType } from 'react';
import type {
  Collection,
  DataAt,
  Panel,
  PanelKind,
  RoomData,
  RoomSpec,
} from '@experience/room-spec';
import type { StageController } from '@experience/stage-runtime';

/** What the host gives a room about the rooms inside it. */
export type RoomWorld = {
  /** Data of an inner room by its path relative to this room. */
  dataAt: DataAt;
  /** Take the person into an inner room by that path. */
  open: (path: string) => void;
};

export type PanelProps = {
  spec: RoomSpec;
  panel: Panel;
  /** The panel's collection, when its kind uses one (validation guarantees it exists). */
  collection?: Collection;
  data: RoomData;
  /** A person's edit; the host applies it through the room data rules. */
  edit: (change: (data: RoomData) => RoomData) => void;
  world?: RoomWorld;
  /** The room's stage, when it has one. */
  stage?: StageController;
};

export type PanelComponent = ComponentType<PanelProps>;
export type PanelRegistry = Record<Exclude<PanelKind, 'custom'>, PanelComponent>;
/** A room's own components, keyed by the id its custom panels name. */
export type CustomPanels = Record<string, PanelComponent>;
/** One registered room tree: its spec (validated by the host) and its custom components. */
export type RoomEntry = { spec: unknown; panels?: CustomPanels };

/** Values a panel reads, gathered once so panels stay small. */
export function doneCount(data: RoomData, panel: Panel) {
  const records = data[panel.collection ?? ''] ?? [];
  const done = records.filter((r) => panel.field && r.values[panel.field] === true).length;
  return { done, total: records.length };
}
