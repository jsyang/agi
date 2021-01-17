import {GAMEOBJECT_DIRECTION, GAMEOBJECT_MOVE_FLAGS} from './constants';

const TEMPLATE = {
    x:                     0,
    y:                     0,
    draw:                  false,
    direction:             GAMEOBJECT_DIRECTION.Stopped,
    viewNo:                0,
    loop:                  0,
    cel:                   0,
    fixedLoop:             false,
    priority:              0,
    fixedPriority:         false,
    reverseCycle:          false,
    cycleTime:             1,
    celCycling:            false,
    callAtEndOfLoop:       false,
    flagToSetWhenFinished: 0,
    ignoreHorizon:         false,
    ignoreBlocks:          false,
    ignoreObjs:            false,
    stepSize:              1,
    stepTime:              0,

    moveToX:    0,
    moveToY:    0,
    moveToStep: 0,

    movementFlag:   GAMEOBJECT_MOVE_FLAGS.Normal,
    allowedOnLand:  true,
    allowedOnWater: true,
    update:         false,
    nextCycle:      1,

    oldX:        0,
    oldY:        0,
    nextLoop:    0,
    nextCel:     0,
    oldLoop:     0,
    oldCel:      0,
    oldView:     0,
    oldPriority: 0,
    oldDrawX:    0,
    oldDrawY:    0,
}

export function setObjDirectionViaMoveTo(obj) {
    if (obj.moveToX > obj.x) {
        if (obj.moveToY > obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.DownRight;
        } else if (obj.moveToY < obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.UpRight;
        } else {
            obj.direction = GAMEOBJECT_DIRECTION.Right;
        }
    } else if (obj.moveToX < obj.x) {
        if (obj.moveToY > obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.DownLeft;
        } else if (obj.moveToY < obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.UpLeft;
        } else {
            obj.direction = GAMEOBJECT_DIRECTION.Left;
        }
    } else {
        if (obj.moveToY > obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.Down;
        } else if (obj.moveToY < obj.y) {
            obj.direction = GAMEOBJECT_DIRECTION.Up;
        }
    }
}

export default () => ({...TEMPLATE});
