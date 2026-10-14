import type * as Phaser from 'phaser';

/** A rectangle in world coordinates, where an interface element sits in the world. */
export type WorldRect = { x: number; y: number; width: number; height: number };

/**
 * Interface elements pinned to things in a world (a list on a chalkboard, a note on a
 * fridge). The view registers each element with its world rectangle; the scene projects them
 * every frame, so they move and scale with the camera and stay tappable.
 */
export class Anchors {
  private pinned = new Map<string, { el: HTMLElement; rect: WorldRect }>();

  pin(id: string, el: HTMLElement | null, rect: WorldRect) {
    if (el) this.pinned.set(id, { el, rect });
    else this.pinned.delete(id);
  }

  /** Places every element over its rectangle for this camera; `density` is canvas px per CSS px. */
  project(camera: Phaser.Cameras.Scene2D.Camera, density: number) {
    const view = camera.worldView;
    const scale = camera.zoom / density;
    for (const { el, rect } of this.pinned.values()) {
      const x = (rect.x - view.x) * scale;
      const y = (rect.y - view.y) * scale;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      const visible = rect.x + rect.width > view.x && rect.x < view.right;
      el.style.visibility = visible ? 'visible' : 'hidden';
    }
  }
}
