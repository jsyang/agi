import {
    FLAG,
    GAMEOBJECT_DIRECTION,
    GAMEOBJECT_MAX_Y,
    GAMEOBJECT_MOVE_FLAGS,
    GAMEOBJECT_PRIORITY,
    MAX_GAMEOBJECTS, SCREEN_WIDTH_UNITS,
    VAR
} from './constants';
import {Bitmap} from './bitmap';
import screen from './screen';
import {commands} from './logicCommands';
import SoundEmulatorTiSn76496a from './soundEmulator';
import {randomBetween} from './helpers';
import {state, resetControllers, restart, updateSound} from './state';
import playerSaveSystem from './playerSaveSystem';
import playerCommandSystem from './playerCommandSystem';

let canvasContext;
let audioContext;

const bltFrame = () => canvasContext.putImageData(state.frameData, 0, 0);
const bltDebug = () => {
    const c  = document.createElement('canvas');
    c.width  = 320;
    c.height = 200;
    c.getContext('2d').putImageData(state.debugFrameData, 0, 0);
    const imageEl   = document.createElement('img');
    imageEl.src     = c.toDataURL();
    imageEl.onclick = e => e.target.parentElement.removeChild(e.target);
    document.getElementById('debug').appendChild(imageEl);
};

const init = (_canvasContext, _audioContext, _menuContainerElement, _actionContainerElement, _actionSearchElement) => {
    if (canvasContext) return;

    canvasContext                = _canvasContext;
    audioContext                 = _audioContext;
    state.menuContainerElement   = _menuContainerElement;
    state.actionContainerElement = _actionContainerElement;
    state.actionSearchElement    = _actionSearchElement;

    state.visualBuffer         = new Bitmap();
    state.visualPriorityBuffer = new Bitmap();
    state.priorityBuffer       = new Bitmap();
    state.framePriorityData    = new Bitmap();
    state.frameData            = canvasContext.createImageData(320, 200);
    state.debugFrameData       = canvasContext.createImageData(320, 200);

    state.soundEmulator = new SoundEmulatorTiSn76496a(_audioContext);

    screen.init(state);

    _actionSearchElement.onkeydown  = e => e.stopPropagation();
    _actionSearchElement.onkeypress = e => e.stopPropagation();
    _actionSearchElement.onkeyup    = () => playerCommandSystem.searchSaidSystem();

    window.onkeypress = e => e.which !== 13 ? state.keyboardCharBuffer.push(e.which) : null;
    window.onkeydown  = e => {
        const {which} = e;
        state.keyboardSpecialBuffer.push(which);

        // Stop native behavior when pressing certain keys
        if (
            (which >= 37 && which <= 40) || // Arrow keys
            (which >= 112 && which <= 121)  // Function keys F1 - F10
        ) {
            e.preventDefault();
        }
    }

    restart();
};

const setEgoDir = newEgoDir => {
    const egoDir                 = state.variables[VAR.ego_dir];
    state.variables[VAR.ego_dir] = egoDir === newEgoDir ? 0 : newEgoDir;
};

const handleAnySetKeys = key => {
    // Handle the rest if the key is set by game logic to toggle a controller
    if (state.keysForControllers[key] !== undefined) {
        state.controllers[state.keysForControllers[key]] = 1;

        state.variables[VAR.key_pressed] = key;
    }
};

const handleInput = () => {
    state.isTextScreen = false;
    commands.agi_reset(FLAG.input_received);
    commands.agi_reset(FLAG.input_parsed);

    state.haveKey = (state.keyboardCharBuffer.length + state.keyboardSpecialBuffer.length) > 0;
    if (state.allowInput) {
        while (state.keyboardSpecialBuffer.length > 0) {
            const key = state.keyboardSpecialBuffer.shift();
            if (!state.dialogue) {
                // Handle special keys for controlling ego
                switch (key) {
                    case 37: // left
                        setEgoDir(GAMEOBJECT_DIRECTION.Left);
                        break;
                    case 36: // left-up
                        setEgoDir(GAMEOBJECT_DIRECTION.UpLeft);
                        break;
                    case 38: // up
                        setEgoDir(GAMEOBJECT_DIRECTION.Up);
                        break;
                    case 33: // right-up
                        setEgoDir(GAMEOBJECT_DIRECTION.UpRight);
                        break;
                    case 39: // right
                        setEgoDir(GAMEOBJECT_DIRECTION.Right);
                        break;
                    case 34: // right-down
                        setEgoDir(GAMEOBJECT_DIRECTION.DownRight);
                        break;
                    case 40: // down
                        setEgoDir(GAMEOBJECT_DIRECTION.Down);
                        break;
                    case 35: // down-left
                        setEgoDir(GAMEOBJECT_DIRECTION.DownLeft);
                        break;
                    case 12: // stop
                        setEgoDir(GAMEOBJECT_DIRECTION.Stopped);
                        break;
                }
            }

            handleAnySetKeys(key);
        }

        while (state.keyboardCharBuffer.length > 0) {
            const key = state.keyboardCharBuffer.shift();

            if (key >= 32 && key < 127 && state.inputBuffer.length < state.variables[VAR.max_input_len]) {
                state.inputBuffer += String.fromCharCode(key);
            } else if (key === 8 && state.inputBuffer.length > 0) { // Backspace
                state.inputBuffer = state.inputBuffer.substr(0, state.inputBuffer.length - 1);
            } else if (key === 13) {
                state.flags[FLAG.input_received] = 1; // The player has entered a command
                state.keyboardCharBuffer         = [];
                break;
            }

            handleAnySetKeys(key);
        }
    } else {
        // Can't control ego and can't enter input for the parser but can still trigger set keys
        const key = state.keyboardCharBuffer.shift() || state.keyboardSpecialBuffer.shift();

        handleAnySetKeys(key);
    }

    state.keyboardCharBuffer    = [];
    state.keyboardSpecialBuffer = [];
}

const updateScore = () => {
    const scoreEl = document.getElementById('score');
    if (!scoreEl) return;

    scoreEl.innerHTML = `Score: ${state.variables[VAR.score]} / ${state.variables[VAR.max_score]}`;
}

const getObjBaselinesTouching = (o1, o2, dx = 0, dy = 0) => {
    if (o1.y + dy !== o2.y) return false;

    const o1View = state.loadedViews[o1.viewNo];
    const o1Cel  = o1View.loops[o1.loop].cels[o1.cel];

    const o2View = state.loadedViews[o2.viewNo];
    const o2Cel  = o2View.loops[o2.loop].cels[o2.cel];

    const finalO1XStart = o1.x + dx;
    const finalO1XEnd   = o1.x + dx + o1Cel.width;

    const finalO2XStart = o2.x;
    const finalO2XEnd   = o2.x + o2Cel.width;

    return (
        (finalO1XStart >= finalO2XStart && finalO1XEnd <= finalO2XEnd) ||       // O1 entirely inside O2
        (finalO1XStart < finalO2XStart && finalO1XEnd >= finalO1XStart) ||      // O1 touching O2 from left
        (finalO1XStart > finalO2XStart && finalO1XStart <= finalO2XStart) ||    // O1 touching O2 from right
        (finalO2XStart >= finalO1XStart && finalO2XEnd <= finalO1XEnd)          // O2 entirely inside O1
    );
};

// http://agi.sierrahelp.com/AGIStudioHelp/ObjectsViews/ControllingObstacles.html
const getNewXYForObjectAccountForBlocks = (obj, no, newX, newY) => {
    const view         = state.loadedViews[obj.viewNo];
    const cel          = view.loops[obj.loop].cels[obj.cel];
    const priorityData = state.priorityBuffer.data;

    let shouldMove       = true;
    let hasHitSignalLine = false;
    let isEgoOnWater     = no === 0;

    // Reached edges of the screen
    if (newY > GAMEOBJECT_MAX_Y || newY < 0 || newX < 0 || newX > 160) {
        shouldMove = false;
    }

    if (shouldMove) {
        // Hit the horizon
        if (!obj.ignoreHorizon) {
            shouldMove &&= newY >= state.horizon;
        }

        for (let i = 0; i < cel.width; i++) {
            if (!shouldMove) break;

            const nextPositionPriority = priorityData[newY * 160 + newX + i];

            // Out of range
            if (nextPositionPriority === undefined) {
                continue;
            }

            shouldMove &&= nextPositionPriority !== GAMEOBJECT_PRIORITY.UNCONDITIONAL_BARRIER;

            if (!obj.ignoreBlocks && nextPositionPriority === GAMEOBJECT_PRIORITY.CONDITIONAL_BARRIER) {
                shouldMove = false;
            }
        }
    }

    // Check for collisions with other GameObjects
    if (shouldMove && !obj.ignoreObjs) {
        for (let i = 0; i < MAX_GAMEOBJECTS; i++) {
            if (i === no) continue;

            const otherObj = state.gameObjects[i];

            // Only check if the objects are being drawn
            if (otherObj.draw) {
                const isTouching = getObjBaselinesTouching(obj, otherObj, newX - obj.x, newY - obj.y);

                if (isTouching && !otherObj.ignoreObjs) {
                    shouldMove = false;
                    break;
                }
            }
        }
    }

    // Hit a stop somewhere
    if (!shouldMove) {
        newX = obj.x;
        newY = obj.y;

        obj.direction = GAMEOBJECT_DIRECTION.Stopped;

        if (obj.movementFlag === GAMEOBJECT_MOVE_FLAGS.Wander) {
            obj.direction = randomBetween(1, 9);
        }

        if (no === 0) {
            state.variables[VAR.ego_dir] = obj.direction;
        }
    }

    if (no === 0) {
        for (let i = 0; i < cel.width; i++) {
            const nextPositionPriority = priorityData[newY * 160 + newX + i];

            // Out of range
            if (nextPositionPriority === undefined) {
                continue;
            }

            // Hit a signal line
            hasHitSignalLine ||= nextPositionPriority === GAMEOBJECT_PRIORITY.SIGNAL;

            // Is entirely within water
            isEgoOnWater &&= nextPositionPriority === GAMEOBJECT_PRIORITY.WATER;
        }

        if (hasHitSignalLine) {
            commands.agi_set(FLAG.ego_touching_signal_line);
        } else {
            commands.agi_reset(FLAG.ego_touching_signal_line);
        }

        if (isEgoOnWater) {
            commands.agi_set(FLAG.ego_on_water);
        } else {
            commands.agi_reset(FLAG.ego_on_water);
        }
    }

    return [newX, newY];
}

const updateObject = (obj, no) => {
    let hasChangedDirection = false;

    if (obj.draw) {

        if (obj.update) {
            obj.oldX = obj.x;
            obj.oldY = obj.y;

            const view = state.loadedViews[obj.viewNo];
            const cel  = view.loops[obj.loop].cels[obj.cel];

            let xStep = obj.stepSize;
            let yStep = obj.stepSize;
            switch (obj.movementFlag) {
                case GAMEOBJECT_MOVE_FLAGS.Normal:
                    break;
                case GAMEOBJECT_MOVE_FLAGS.MoveTo:
                    if (obj.moveToStep !== 0) {
                        xStep = yStep = obj.moveToStep;
                    }
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

                    yStep = Math.min(yStep, Math.abs(obj.y - obj.moveToY));
                    xStep = Math.min(xStep, Math.abs(obj.x - obj.moveToX));
                    break;
                case GAMEOBJECT_MOVE_FLAGS.ChaseEgo:
                    const egoX = state.gameObjects[0].x;
                    const egoY = state.gameObjects[0].y;
                    if (egoX > obj.x) {
                        if (egoY > obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.DownRight;
                        } else if (egoY < obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.UpRight;
                        } else {
                            obj.direction = GAMEOBJECT_DIRECTION.Right;
                        }
                    } else if (egoX < obj.x) {
                        if (egoY > obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.DownLeft;
                        } else if (egoY < obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.UpLeft;
                        } else {
                            obj.direction = GAMEOBJECT_DIRECTION.Left;
                        }
                    } else {
                        if (egoY > obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.Down;
                        } else if (egoY < obj.y) {
                            obj.direction = GAMEOBJECT_DIRECTION.Up;
                        }
                    }

                    yStep = Math.min(yStep, Math.abs(obj.y - egoY));
                    xStep = Math.min(xStep, Math.abs(obj.x - egoX));
                    break;

                case GAMEOBJECT_MOVE_FLAGS.Wander:
                    break;
                default:
            }
            let newX = obj.x;
            let newY = obj.y;
            if (obj.direction === 1 || obj.direction === 2 || obj.direction === 8) {
                newY = obj.y - yStep;
            } else if (obj.direction === 5 || obj.direction === 4 || obj.direction === 6) {
                newY = obj.y + yStep;
            }

            if (obj.direction === 7 || obj.direction === 8 || obj.direction === 6) {
                newX = obj.x - xStep;
            } else if (obj.direction === 3 || obj.direction === 2 || obj.direction === 4) {
                newX = obj.x + xStep;
            }

            // Set newX, newY based on blocks
            [newX, newY] = getNewXYForObjectAccountForBlocks(obj, no, newX, newY);

            obj.x = newX;
            obj.y = newY;

            // Enforce horizon when entering new room
            if (state.flags[FLAG.new_room]) {
                if (!obj.ignoreHorizon && obj.y < state.horizon) {
                    obj.y = state.horizon + 1;
                }
            }

            if (obj.movementFlag === GAMEOBJECT_MOVE_FLAGS.MoveTo && obj.x === obj.moveToX && obj.y === obj.moveToY) {
                obj.direction = GAMEOBJECT_DIRECTION.Stopped;
                commands.agi_set(obj.flagToSetWhenFinished);
                obj.movementFlag = GAMEOBJECT_MOVE_FLAGS.Normal;
            }

            if (obj.x !== obj.oldX || obj.y !== obj.oldY) {
                if (obj.x <= 0) {
                    if (no === 0) {
                        state.variables[VAR.ego_edge_code] = 4;
                    } else {
                        state.variables[VAR.object_touching_edge] = no;
                        state.variables[VAR.object_edge_code]     = 4;
                    }
                } else if (obj.x + cel.width >= SCREEN_WIDTH_UNITS) {
                    if (no === 0) {
                        state.variables[VAR.ego_edge_code] = 2;
                    } else {
                        state.variables[VAR.object_touching_edge] = no;
                        state.variables[VAR.object_edge_code]     = 2;
                    }
                } else if (!obj.ignoreHorizon && obj.y <= state.horizon) {
                    if (no === 0) {
                        state.variables[VAR.ego_edge_code] = 1;
                    } else {
                        state.variables[VAR.object_touching_edge] = no;
                        state.variables[VAR.object_edge_code]     = 1;
                    }
                } else if (obj.y >= GAMEOBJECT_MAX_Y) {
                    if (no === 0) {
                        state.variables[VAR.ego_edge_code] = 3;
                    } else {
                        state.variables[VAR.object_touching_edge] = no;
                        state.variables[VAR.object_edge_code]     = 3;
                    }
                } else {
                    // Not touching any edges
                    if (no === 0) {
                        state.variables[VAR.ego_edge_code] = 0;
                    } else {
                        state.variables[VAR.object_edge_code] = 0;
                    }
                }
            }

            if (!obj.fixedPriority) {
                // http://agi.sierrahelp.com/AGIStudioHelp/Picture/Priorities.html
                if (obj.y < 48) {
                    obj.priority = 4;
                } else if (obj.y < 60) {
                    obj.priority = 5;
                } else if (obj.y < 72) {
                    obj.priority = 6;
                } else if (obj.y < 84) {
                    obj.priority = 7;
                } else if (obj.y < 96) {
                    obj.priority = 8;
                } else if (obj.y < 108) {
                    obj.priority = 9;
                } else if (obj.y < 120) {
                    obj.priority = 10;
                } else if (obj.y < 132) {
                    obj.priority = 11;
                } else if (obj.y < 144) {
                    obj.priority = 12;
                } else if (obj.y < 156) {
                    obj.priority = 13;
                } else if (obj.y <= GAMEOBJECT_MAX_Y) {
                    obj.priority = 14;
                } else {
                    obj.priority = 15;
                }
            }

            if (!obj.fixedLoop) {
                if (view.loops.length > 1 && view.loops.length < 4) {
                    if (
                        obj.direction === GAMEOBJECT_DIRECTION.UpRight ||
                        obj.direction === GAMEOBJECT_DIRECTION.Right ||
                        obj.direction === GAMEOBJECT_DIRECTION.DownRight ||
                        obj.direction === GAMEOBJECT_DIRECTION.DownLeft ||
                        obj.direction === GAMEOBJECT_DIRECTION.Left ||
                        obj.direction === GAMEOBJECT_DIRECTION.UpLeft
                    ) {
                        obj.loop = 1;
                    }
                } else if (view.loops.length >= 4) {
                    if (obj.direction === 1) {
                        obj.loop            = 3;
                        hasChangedDirection = obj.loop !== obj.oldLoop;
                    } else if (obj.direction === 2 || obj.direction === 3 || obj.direction === 4) {
                        obj.loop            = 0;
                        hasChangedDirection = obj.loop !== obj.oldLoop;
                    } else if (obj.direction === 5) {
                        obj.loop            = 2;
                        hasChangedDirection = obj.loop !== obj.oldLoop;
                    } else if (obj.direction === 6 || obj.direction === 7 || obj.direction === 8) {
                        obj.loop            = 1;
                        hasChangedDirection = obj.loop !== obj.oldLoop;
                    }

                    // Ensure we force the correct cel for the new loop if it's changed direction
                    if (hasChangedDirection) {
                        obj.nextCycle = 1;
                    }
                }
            }

            if (obj.celCycling) {
                if (obj.nextCycle === 1) {
                    if (obj.reverseCycle) {
                        obj.cel--;
                    } else {
                        obj.cel++;
                    }

                    let endOfLoop = false;
                    if (obj.cel < 0) {
                        if (obj.callAtEndOfLoop) {
                            obj.cel = 0;
                        } else {
                            obj.cel = view.loops[obj.loop].cels.length - 1;
                        }
                        endOfLoop = true;
                    } else if (obj.cel > view.loops[obj.loop].cels.length - 1) {
                        if (obj.callAtEndOfLoop) {
                            obj.cel = view.loops[obj.loop].cels.length - 1;
                        } else {
                            obj.cel = 0;
                        }
                        endOfLoop = true;
                    }

                    if (endOfLoop && obj.callAtEndOfLoop) {
                        obj.celCycling = false;
                        commands.agi_set(obj.flagToSetWhenFinished);
                    }
                    obj.nextCycle = obj.cycleTime;
                } else {
                    obj.nextCycle--;
                }
            }
        }

        screen.drawObject(obj);
    }
}

function updateInterpreterClock() {
    const now = new Date();

    // Probably not right
    // todo: track time?
    state.variables[VAR.clock_seconds] = now.getSeconds();
    state.variables[VAR.clock_minutes] = now.getMinutes();
    state.variables[VAR.clock_hours]   = now.getHours();
}

const cycle = () => {
    updateInterpreterClock();
    playerSaveSystem.handleSaveRestore();
    handleInput();

    let egoDir = state.variables[VAR.ego_dir];

    if (state.programControl) {
        egoDir = state.variables[VAR.ego_dir];
    } else {
        state.variables[VAR.ego_dir] = egoDir;
    }

    while (true) {
        commands.agi_call(0);

        if (state.paused) break;

        commands.agi_reset(FLAG.new_room);
        commands.agi_reset(FLAG.noise_enabled); // Logic 0 executed for the first time
        commands.agi_reset(FLAG.game_restarted);
        commands.agi_reset(FLAG.game_restored);

        commands.agi_reset_v(VAR.object_edge_code);
        commands.agi_reset_v(VAR.object_touching_edge);

        // Reverse the rendering of objects so that ego might always be drawn on top of anything!
        for (let j = state.gameObjects.length - 1; j >= 0; j--) {
            const obj = state.gameObjects[j];
            if (j === 0) {
                obj.direction = egoDir;
            }

            updateObject(obj, j);
        }


        break;
    }

    bltFrame();
    updateScore();
    playerCommandSystem.updateSaidSystem();
    updateSound();
    resetControllers();
}

export default {
    bltDebug,
    init,
    cycle,
}
