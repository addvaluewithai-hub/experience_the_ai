import type { OpenRoom } from '../../app/rooms';
import { endCall, startCall, toggleMute, useCall } from './voiceCall';

/** A compact voice control, not a transcript/chat beside the game. */
export function CubeVoiceControls({ room, ai, started }: {
  room: OpenRoom;
  ai: boolean | null;
  started: boolean;
}) {
  const call = useCall();
  if (!started) return null;
  const active = call.roomKey === room.key;
  const status = active ? call.status : 'idle';
  const character = room.spec.characters[0];

  if (ai === false)
    return <span className="cf-voice-state" role="status">اللعبة من غير صوت حاليًا</span>;

  if (status === 'error' || status === 'ended')
    return (
      <button className="cf-voice-retry" type="button"
        onClick={() => void startCall(room, character, {
          greet: 'GAME: We reconnected to Cube Flight. Speak briefly in Egyptian Arabic. The game is already running. Do not restart it. Ask how the player wants to be addressed if unknown.',
        })}>
        <span aria-hidden="true">🎙</span><span>رجّعي صوت لومي</span>
      </button>
    );

  if (status === 'connecting')
    return <span className="cf-voice-state" role="status">لومي بتوصل صوتها…</span>;

  if (status === 'live')
    return (
      <div className="cf-voice-tools" role="group" aria-label="صوت لومي">
        <button type="button" onClick={toggleMute} aria-label={call.muted ? 'شغّلي المايك' : 'اكتمي المايك'}>
          {call.muted ? '🔇' : '🎙'}
        </button>
        <button type="button" onClick={() => void endCall()} aria-label="اقفلي المحادثة الصوتية">✕</button>
      </div>
    );

  return null;
}
