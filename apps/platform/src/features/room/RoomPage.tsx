import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomView } from '@experience/room-runtime';
import type { OpenRoom } from '../../app/App';
import { AiNotice } from '../../shared/AiNotice';
import { AgentDock } from './AgentDock';

export function RoomPage({ room, ai }: { room: OpenRoom; ai: boolean | null }) {
  const [focus, setFocus] = useState<string>();
  const timer = useRef(0);
  const point = useCallback((panelId: string) => {
    setFocus(panelId);
    document
      .getElementById(`panel-${panelId}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setFocus(undefined), 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className="room-page">
      <nav className="room-bar">
        <a href="#/">← Rooms</a>
        <span>Preview · this room’s data lives only in this tab</span>
      </nav>
      <AiNotice ai={ai} />
      <RoomView
        spec={room.spec}
        store={room.store}
        focus={focus}
        custom={room.panels}
        aside={<AgentDock room={room} ai={ai} setFocus={point} />}
      />
    </div>
  );
}
