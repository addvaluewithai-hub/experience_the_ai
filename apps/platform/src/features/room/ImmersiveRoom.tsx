import { useCallback, useEffect, useState } from 'react';
import type { RoomData } from '@experience/room-spec';
import { useRoomData } from '@experience/room-runtime';
import { roomHref, type OpenRoom } from '../../app/rooms';
import { conversationFor, takeHandoff } from './conversation';
import { PresenceLayer } from './PresenceLayer';
import { startCall } from './voiceCall';
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
  // The arrival scene plays before anyone speaks; the way to begin appears when it ends.
  const arrival = room.spec.world?.arrival;
  const [arriving, setArriving] = useState(Boolean(arrival && room.surface?.play));
  useEffect(() => {
    let here = true;
    const arrived = () => {
      if (!here) return;
      setArriving(false);
      // A character above brought the person here: the first character here carries on, by
      // voice when they came in a call, or in words.
      const handoff = takeHandoff(room.key);
      const first = room.spec.characters[0];
      if (handoff?.voice) void startCall(room, first, { greet: handoff.message });
      else if (handoff)
        void conversationFor(room, first).send(handoff.message, {
          kind: 'activity',
          text: handoff.shown,
        });
    };
    if (!arrival || !room.surface?.play) {
      arrived();
    } else {
      setArriving(true);
      void room.surface
        .play(arrival)
        .catch(() => undefined)
        .then(arrived);
    }
    return () => {
      here = false;
    };
  }, [room, arrival]);
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
      <PresenceLayer room={room} ai={props.ai} hidden={arriving} />
    </div>
  );
}
