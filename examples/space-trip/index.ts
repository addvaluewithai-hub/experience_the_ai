import { stageRoom } from '@experience/kit-stage-svg';
import room from './room.json';
import stage from './stage.json';

/** This example lives on the SVG stage kit; the kit declares its world and draws it. */
export default stageRoom(room, stage);
