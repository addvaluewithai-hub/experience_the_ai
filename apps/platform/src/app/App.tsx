import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { platformStatus } from '../shared/api';
import { Home } from '../features/home/Home';
import { RoomPage } from '../features/room/RoomPage';
import { setConversationHost } from '../features/room/conversation';
import { ConfirmCard } from '../features/room/ConfirmCard';
import { LifeConnect } from '../lifeos/LifeConnect';
import { enteredFrom, startLifeos, useLifeos } from '../lifeos/connection';
import { loadRooms, roomHref } from './rooms';

function subscribe(listener: () => void) {
  addEventListener('hashchange', listener);
  return () => removeEventListener('hashchange', listener);
}
const currentHash = () => location.hash;

export function App() {
  const hash = useSyncExternalStore(subscribe, currentHash, () => '');
  const lifeos = useLifeos();
  const [rooms, setRooms] = useState(() => ({ ...loadRooms(), records: lifeos.records }));
  const [ai, setAi] = useState<boolean | null>(null);
  const [focus, setFocus] = useState<{ key: string; panel: string }>();
  const timer = useRef(0);
  useEffect(() => {
    void platformStatus().then((status) => {
      setAi(status.ai);
      startLifeos(status.lifeos);
    });
  }, []);
  // Records from the person's sources grow the trees that open rooms from them.
  useEffect(
    () =>
      setRooms((before) =>
        before.records === lifeos.records
          ? before
          : { ...loadRooms(lifeos.records, before.all), records: lifeos.records },
      ),
    [lifeos.records],
  );
  useEffect(() => window.scrollTo(0, 0), [hash]);
  useEffect(() => {
    setConversationHost({
      rooms: rooms.all,
      open: (key) => (location.hash = roomHref(key)),
      focus: (key, panel) => {
        setFocus({ key, panel });
        document
          .getElementById(`panel-${panel}`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setFocus(undefined), 4000);
      },
    });
    return () => clearTimeout(timer.current);
  }, [rooms]);

  const key = /^#\/room\/([a-z0-9/-]+)$/.exec(hash)?.[1];
  const room = key ? rooms.all.get(key) : undefined;
  const source = room?.source;
  useEffect(() => {
    if (source) enteredFrom(source.id, source.record);
  }, [source?.id, source?.record]);
  if (room)
    return (
      <>
        <RoomPage
          key={room.key}
          room={room}
          rooms={rooms.all}
          ai={ai}
          focus={focus?.key === room.key ? focus.panel : undefined}
        />
        {(room.instances || room.sourced) && <LifeConnect />}
        <ConfirmCard />
      </>
    );
  // A room from a source opens once the source has loaded (a reload lands here first).
  if (key && (lifeos.status === 'loading' || rooms.records !== lifeos.records))
    return <div className="lifeos-wait" aria-busy="true" />;
  return <Home rooms={rooms.top} ai={ai} />;
}
