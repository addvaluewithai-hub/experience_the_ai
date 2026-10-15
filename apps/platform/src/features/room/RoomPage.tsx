import { Fragment, useEffect } from 'react';
import { RoomView } from '@experience/room-runtime';
import { pathOf, roomHref, type OpenRoom } from '../../app/rooms';
import { AiNotice } from '../../shared/AiNotice';
import { AgentDock } from './AgentDock';
import { conversationFor, takeHandoff } from './conversation';
import { ImmersiveRoom } from './ImmersiveRoom';
import { endCall } from './voiceCall';

export function RoomPage(props: {
  room: OpenRoom;
  rooms: Map<string, OpenRoom>;
  ai: boolean | null;
  focus?: string;
}) {
  const { room, rooms } = props;
  // A character above sent the person here: this room's first character picks up its note.
  useEffect(() => {
    // An immersive room takes its handoff itself, once its arrival scene has played.
    if (room.spec.layout === 'immersive') return;
    const handoff = takeHandoff(room.key);
    if (handoff)
      void conversationFor(room, room.spec.characters[0]).send(handoff.message, {
        kind: 'activity',
        text: handoff.shown,
      });
  }, [room]);
  // A voice call belongs to its room: leaving the room hangs up.
  useEffect(() => () => void endCall(), [room]);
  if (room.spec.layout === 'immersive')
    return <ImmersiveRoom room={room} rooms={rooms} ai={props.ai} />;
  return (
    <div className="room-page">
      <nav className="room-bar" aria-label="Rooms path">
        <span className="room-crumbs" dir={room.spec.language === 'ar' ? 'rtl' : 'ltr'}>
          <a href="#/">⌂</a>
          {pathOf(room).map((step) => (
            <Fragment key={step.key}>
              <span aria-hidden="true">›</span>
              {step === room ? (
                <span aria-current="page">{step.spec.title}</span>
              ) : (
                <a href={roomHref(step.key)}>{step.spec.title}</a>
              )}
            </Fragment>
          ))}
        </span>
        <span>Preview · data lives only in this tab</span>
      </nav>
      <AiNotice ai={props.ai} />
      <RoomView
        spec={room.spec}
        store={room.store}
        focus={props.focus}
        custom={room.panels}
        surface={room.surface}
        world={{
          dataAt: (path) => rooms.get(`${room.key}/${path}`)?.store.get(),
          open: (path) => (location.hash = roomHref(`${room.key}/${path}`)),
        }}
        aside={<AgentDock room={room} ai={props.ai} />}
      />
    </div>
  );
}
