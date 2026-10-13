import { composeRoom } from '@experience/room-spec';
import kitchen from './rooms/kitchen';
import house from './room.json';

/** The garden stays a planned stub from room.json; the kitchen is built in its own folder. */
export default composeRoom(house, [kitchen]);
