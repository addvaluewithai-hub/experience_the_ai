import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import type { RoomData } from '@experience/room-spec';
import { useRoomData } from '@experience/room-runtime';
import { roomHref, type OpenRoom } from '../../app/rooms';
import { arrivalCue, conversationFor, takeHandoff } from './conversation';
import { PresenceDock } from './PresenceDock';
import { CubeVoiceControls } from './CubeVoiceControls';
import { PresenceLayer } from './PresenceLayer';
import { noteGameToCall, reactToGameInCall, startCall } from './voiceCall';
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
  const cubeFlight = room.key === 'cube-flight';
  const [gameStarted, setGameStarted] = useState(false);
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
  // The only game-to-voice bridge. Room events carry facts graded by code, never the
  // model's guesses. Text is hidden: the flying character responds with real audio.
  useEffect(() => {
    if (!cubeFlight || !room.surface?.onGameEvent) return;
    const companion = room.spec.characters[0];
    return room.surface.onGameEvent(({ kind, detail }) => {
      if (kind === 'start') {
        setGameStarted(true);
        if (props.ai === false) return;
        // Triggered directly by the big Start button's click, so audio unlock is allowed.
        void startCall(room, companion, {
          greet: [
            'GAME_START: The child has started Cube Flight using the Start button.',
            `First challenge: ${detail.a} × ${detail.b}. Ask for recall, do not give result.`,
            room.surface?.state() ?? '',
            'Speak in friendly, natural Egyptian Arabic, one or two lively sentences at a time.',
            'On the first visit ask the child for an OPTIONAL nickname and what she wants to name you.',
            'Only save a name she explicitly chose with remember_player/name_companion tools.',
            'If a nickname is already saved, welcome her by it, do not ask again.',
            'Your role is to teach flexible strategies through the show_hint and reveal_array tools, never grade arithmetic.',
          ].join(' '),
        });
        return;
      }
      if (kind === 'selection') {
        if (typeof detail.digits === 'string')
          noteGameToCall(
            room.key,
            `GAME_SELECTION: The player is currently composing digits ${detail.digits}; do not react until she submits.`,
          );
        return;
      }
      if (kind === 'pause') {
        reactToGameInCall(
          room.key,
          `GAME_THINKING_PAUSE: The child has placed ${detail.digits} for ${detail.a}×${detail.b} but hasn't submitted. Ask ONE warm, very brief question about her thinking. Don't judge the partial digits, don't reveal the result and don't interrupt if she resumes typing.`,
        );
        return;
      }
      if (kind === 'question') {
        noteGameToCall(
          room.key,
          `GAME_QUESTION: ${detail.a} times ${detail.b} is visible; revisiting=${detail.revisit}. Wait for her attempt.`,
        );
        return;
      }
      if (kind === 'hint') {
        reactToGameInCall(
          room.key,
          `GAME_HINT_REQUEST: Child requested help with ${detail.a} × ${detail.b}. On screen the strategy says: ${detail.strategy}. Explain this connection briefly aloud, ask her to try recalling. No spoilers unless she asks.`,
        );
        return;
      }
      if (kind === 'answer') {
        const correct = detail.correct === true;
        reactToGameInCall(
          room.key,
          detail.revealed === true
            ? `GAME_SOLUTION: The child asked to see ${detail.a} × ${detail.b} = ${detail.expected}. She saw the result. Give one brief memory connection and invite a later recall, without judging her.`
            : correct
              ? `GAME_ANSWER: ${detail.a}×${detail.b} = ${detail.answer}, verified CORRECT by the game. Independent recall=${detail.independent}. Respond with one playful spoken reaction. If assisted, mention the strategy helped and we'll try again later. No long lecture.`
              : `GAME_ANSWER: Child chose ${detail.answer} for ${detail.a}×${detail.b}; verified INCORRECT by game (correct result is ${detail.expected}, never give it immediately). Offer one short way to THINK using ${detail.strategy}; use show_hint/reveal_array only if needed. Let her retry without judgment.`,
        );
        return;
      }
      if (kind === 'round_complete')
        reactToGameInCall(
          room.key,
          `GAME_COMPLETE: ${detail.independent} independent recalls out of ${detail.total} challenges. Congratulate effort briefly in Egyptian Arabic. Invite another round when she wants, no pressure.`,
        );
    });
  }, [cubeFlight, room, props.ai]);
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
            }}
          />
        )}
      </div>
      {cubeFlight ? (
        <CubeVoiceControls room={room} ai={props.ai} started={gameStarted} />
      ) : docked ? (
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
