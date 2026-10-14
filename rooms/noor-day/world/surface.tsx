import { Anchors, PhaserFrame } from '@experience/kit-phaser';
import type { MouthFrame, PresenceMode, RoomSpec } from '@experience/room-spec';
import type { RoomStore, RoomSurface, SurfaceViewProps } from '@experience/room-runtime';
import type { ComponentType } from 'react';
import { PINNED } from './layout';
import { KitchenModel } from './model';
import { kitchenStyle } from './style';
import { Chalkboard, FridgeNote, Magnets, OpenNote } from './ui';

const prefersLessMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Esraa's kitchen as a room surface: Noor lives in it, and the habits, the week and the
 * shopping are interface pinned to the chalkboard and the fridge.
 */
export class KitchenSurface implements RoomSurface {
  readonly model: KitchenModel;
  readonly anchors = new Anchors();
  readonly View: ComponentType<SurfaceViewProps>;

  constructor(
    private spec: RoomSpec,
    store: RoomStore,
    options: { reducedMotion?: boolean; now?: () => Date } = {},
  ) {
    const model = new KitchenModel({
      reducedMotion: options.reducedMotion ?? prefersLessMotion(),
      data: () => store.get(),
      now: options.now,
    });
    this.model = model;
    const anchors = this.anchors;
    const load = () =>
      import('./scene').then(
        ({ startKitchen }) =>
          (el: HTMLElement) =>
            startKitchen(el, model, anchors).stop,
      );
    this.View = function KitchenView(props: SurfaceViewProps) {
      const ui = { spec: props.spec, data: props.data, edit: props.edit, model };
      return (
        <PhaserFrame
          world="noor-kitchen"
          label="مطبخ إسراء: نور، وسبورة العادات، وخطة الأسبوع والمشتريات على التلاجة"
          background="#dbe4dc"
          frame={props.frame}
          load={load}
          waking="المطبخ بيصحى…"
          failed="المطبخ مش راضي يفتح دلوقتي."
        >
          <style>{kitchenStyle}</style>
          <div className="pin" ref={(el) => anchors.pin('board', el, PINNED.board)}>
            <Chalkboard {...ui} />
          </div>
          <div className="pin" ref={(el) => anchors.pin('week', el, PINNED.week)}>
            <FridgeNote note="week" data={props.data} model={model} />
          </div>
          <div className="pin" ref={(el) => anchors.pin('shopping', el, PINNED.shopping)}>
            <FridgeNote note="shopping" data={props.data} model={model} />
          </div>
          <Magnets data={props.data} model={model} />
          <OpenNote {...ui} />
        </PhaserFrame>
      );
    };
  }

  /** Plays a scene; never waits more than 20 s, even if the kitchen could not be drawn. */
  play(scene: string) {
    return Promise.race([
      this.model.play(scene),
      new Promise<void>((done) => setTimeout(done, 20_000)),
    ]);
  }
  act(character: string, action: string, args: Record<string, unknown>) {
    this.model.act(character, action, args);
  }
  speak(character: string | null) {
    this.model.speak(character);
  }
  get speaking() {
    return this.model.speaker;
  }
  setMode(character: string, mode: PresenceMode) {
    this.model.setMode(character, mode);
  }
  mouth(character: string, frame: MouthFrame | null) {
    this.model.mouth(character, frame);
  }
  state() {
    return this.model.state(this.spec.characters);
  }
}

export const kitchenSurface = (spec: RoomSpec, store: RoomStore) => new KitchenSurface(spec, store);
