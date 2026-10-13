import { useCallback } from 'react';
import type { RoomData } from '@experience/room-spec';
import { useRoomData } from '@experience/room-runtime';
import { roomHref, type OpenRoom } from '../../app/rooms';
import { PresenceLayer } from './PresenceLayer';
import './immersive.css';

/**
 * A room that is its world: the surface fills the screen and the characters are met by voice
 * on top of it. No panels and no forms; characters change things through their tools.
 */
export function ImmersiveRoom(props: {
  room: OpenRoom;
  rooms: Map<string, OpenRoom>;
  ai: boolean | null;
}) {
  const { room, rooms } = props;
  const data = useRoomData(room.store);
  const edit = useCallback(
    (change: (current: RoomData) => RoomData) => room.store.set(change(room.store.get())),
    [room],
  );
  const View = room.surface?.View;
  const ar = room.spec.language === 'ar';
  return (
    <div
      className="immersive"
      dir={ar ? 'rtl' : 'ltr'}
      lang={room.spec.language}
      style={{ background: room.spec.theme.accent }}
    >
      <h1 className="immersive-title">{room.spec.title}</h1>
      <div className="immersive-world">
        {View && (
          <View
            spec={room.spec}
            data={data}
            edit={edit}
            frame="screen"
            world={{
              dataAt: (path) => rooms.get(`${room.key}/${path}`)?.store.get(),
              open: (path) => (location.hash = roomHref(`${room.key}/${path}`)),
            }}
          />
        )}
      </div>
      <a
        className="immersive-exit"
        href={room.parent ? roomHref(room.parent.key) : '#/'}
        aria-label={ar ? 'خروج' : 'Leave'}
      >
        {room.parent ? (ar ? '›' : '‹') : '⌂'}
      </a>
      <PresenceLayer room={room} ai={props.ai} />
    </div>
  );
}
