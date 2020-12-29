import {GAMEOBJECT_DIRECTION, GAMEOBJECT_MOVE_FLAGS} from './constants';

const TEMPLATE = {
    x:                     0,
    y:                     0,
    draw:                  false,
    redraw:                false,
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
    motion:                false,
    stepSize:              1,
    stepTime:              0,

    moveToX:    0,
    moveToY:    0,
    moveToStep: 0,

    movementFlag:   GAMEOBJECT_MOVE_FLAGS.Normal,
    allowedSurface: 0,
    update:         true,
    reverseLoop:    false,
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

export default () => ({...TEMPLATE});
