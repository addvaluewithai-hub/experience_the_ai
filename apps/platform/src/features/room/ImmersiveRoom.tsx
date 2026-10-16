import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { RoomData } from '@experience/room-spec';
import { useRoomData } from '@experience/room-runtime';
import { roomHref, type OpenRoom } from '../../app/rooms';
import { personRun } from '../../app/services';
import { arrivalCue, conversationFor, takeHandoff } from './conversation';
import { PresenceDock } from './PresenceDock';
import { PresenceLayer } from './PresenceLayer';
import { startCall } from './voiceCall';
import './immersive.css';

const briefed = new Set<string>();

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
  // A docked room opens with its first character speaking first, once per visit in this tab.
  const docked = room.spec.presence === 'dock';
  useEffect(() => {
    if (!docked || !props.ai || arriving || briefed.has(room.key)) return;
    briefed.add(room.key);
    const first = room.spec.characters[0];
    void conversationFor(room, first).send(arrivalCue(room, first), null);
  }, [docked, props.ai, arriving, room]);
  const View = room.surface?.View;
  const leave = room.parent ? roomHref(room.parent.key) : '#/';
  const ar = room.spec.language === 'ar';
  return (
    <div
      className={docked ? 'immersive immersive-docked' : 'immersive'}
      dir={ar ? 'rtl' : 'ltr'}
      lang={room.spec.language}
      style={
        {
          background: room.spec.theme.accent,
          '--room-accent': room.spec.theme.accent,
        } as CSSProperties
      }
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
              run: room.spec.services ? (action, args) => personRun(room, action, args) : undefined,
            }}
          />
        )}
      </div>
      {docked ? (
        <PresenceDock room={room} ai={props.ai} leave={leave} />
      ) : (
        <>
          <a className="immersive-exit" href={leave} aria-label={ar ? 'خروج' : 'Leave'}>
            {room.parent ? (ar ? '›' : '‹') : '⌂'}
          </a>
          <PresenceLayer room={room} ai={props.ai} hidden={arriving} />
        </>
      )}
    </div>
  );
}
