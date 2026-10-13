import { composeRoom } from '@experience/room-spec';
import pantry from './rooms/pantry/room.json';
import kitchen from './room.json';

export default composeRoom(kitchen, [pantry]);
