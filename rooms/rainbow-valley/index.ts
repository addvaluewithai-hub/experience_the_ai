import { composeRoom } from '@experience/room-spec';
import type { RoomEntry, RoomStore } from '@experience/room-runtime';
import crystalRiver from './rooms/crystal-river/room.json';
import { RiverSurface } from './rooms/crystal-river/world/surface';
import room from './room.json';
import { ValleySurface } from './world/surface';

/**
 * The valley and the worlds it draws itself (Phaser, with the flight kit). Its places share
 * one unicorn: the river knows the name Laila gave her, and the valley's river wakes with the
 * crystals brushed awake today.
 */
let valley: ValleySurface | undefined;
let river: RoomStore | undefined;
const rainbowValley: RoomEntry = {
  spec: composeRoom(room, [crystalRiver]),
  surface: (spec, store, path) => {
    if (path === 'rainbow-valley')
      return (valley = new ValleySurface(spec, store, { river: () => river?.get() }));
    if (path === 'rainbow-valley/crystal-river') {
      river = store;
      return new RiverSurface(spec, store, { name: () => valley?.model.nameOf() ?? null });
    }
  },
};
export default rainbowValley;
