import type { ComponentType } from 'react';
import type {
  Collection,
  Presence,
  DataAt,
  Panel,
  PanelKind,
  RoomData,
  RoomSpec,
} from '@experience/room-spec';
import type { RoomStore } from '../store';

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
  /** The room's own surface, when the room declares a world. */
  surface?: RoomSurface;
};

/** What a surface's view receives: the same room data and edits as any panel. */
export type SurfaceViewProps = Pick<PanelProps, 'spec' | 'data' | 'edit' | 'world'> & {
  /** `panel`: a framed view inside a page (the surface picks its own shape). `screen`: an
   * immersive room, so fill the parent, which is the whole screen. */
  frame: 'panel' | 'screen';
};

/**
 * A room's surface: whatever draws its world (Phaser, 3D, SVG, plain UI), plus the Presence
 * the brain drives. Rooms ship their own; the engine only mounts and talks to it.
 */
export type RoomSurface = Presence & {
  View: ComponentType<SurfaceViewProps>;
  /** The director: plays one of the world's scenes; resolves when it is over. */
  play?(scene: string): Promise<void>;
  dispose?(): void;
};

export type PanelComponent = ComponentType<PanelProps>;
export type PanelRegistry = Record<Exclude<PanelKind, 'custom'>, PanelComponent>;
/** A room's own components, keyed by the id its custom panels name. */
export type CustomPanels = Record<string, PanelComponent>;
/**
 * One registered room tree: its spec (validated by the host), its custom panels, and the
 * surface of any room in the tree that declares a world (called once per open room).
 */
export type RoomEntry = {
  spec: unknown;
  panels?: CustomPanels;
  surface?: (spec: RoomSpec, store: RoomStore, path: string) => RoomSurface | undefined;
};

/** Values a panel reads, gathered once so panels stay small. */
export function doneCount(data: RoomData, panel: Panel) {
  const records = data[panel.collection ?? ''] ?? [];
  const done = records.filter((r) => panel.field && r.values[panel.field] === true).length;
  return { done, total: records.length };
}
