import {FLAG, GAMEOBJECT_DIRECTION, GAMEOBJECT_MOVE_FLAGS, VAR} from './constants';
import {Bitmap} from './bitmap';
import screen from './screen';
import logicCommands from './logicCommands';
import SoundEmulatorTiSn76496a from './soundEmulator';
import {randomBetween} from './helpers';

const state = {
    programControl: false,
    visualBuffer:   null,
    priorityBuffer: null,
    scriptSize:     0,
    strings:        [],
    items:          new Uint8Array(256),
    variables:      new Uint8Array(256),
    flags:          new Uint8Array(256),
    controllers:    new Uint8Array(256),

    // For prompt screens
    isTextScreen:       false,
    textScreenMessages: [],

    msgBoxText:  '',
    msgBoxX:     0,
    msgBoxY:     0,
    msgBoxWidth: 128,

    gameObjects: [],

    testSaid:   {},    // List all the said test command queries as options to be chosen
    playerSaid: '',    // Has the player said anything that has matched any of the wordgroups? ex: "3,204"

    horizon: 0,
    blockX1: 0,
    blockY1: 0,
    blockX2: 0,
    blockY2: 0,

    loadedViews:  [],
    loadedLogics: [],
    loadedPics:   [],
    loadedSounds: [],
    logicStack:   [],
    logicNo:      0,

    soundEmulator: null, // SoundEmulatorTiSn76496a,
    playedSound:   null,

    frameData:             null, // ImageData
    framePriorityData:     null, // Bitmap,
    keyboardSpecialBuffer: [], // number[]
    keyboardCharBuffer:    [], // number[]
    inputBuffer:           '',
    allowInput:            true,
    haveKey:               false,
    hasPaused:             false,
    hasQuit:               false,

    dialogue:       false,
    dialogueStrNo:  0,
    dialoguePrompt: '',
    dialogueStrLen: 0,
    dialogueStrY:   0,
    dialogueStrX:   0,
    dialogueMode:   0,

    menu:                 [],
    menuContainerElement: null,

    actionContainerElement: null,
}

const restart = () => {
    state.hasPaused = false;
    state.hasQuit   = false;

    resetControllers();
    resetMenu();

    state.variables.fill(0);
    state.flags.fill(0);
    state.items.fill(0);

    state.variables[VAR.video_mode]    = 3; // EGA
    state.variables[VAR.free_memory]   = 255;
    state.variables[VAR.sound_volume]  = 15;
    state.variables[VAR.max_input_len] = 41;

    state.flags[FLAG.sound_on]      = 1;
    state.flags[FLAG.noise_enabled] = 1;
    state.flags[FLAG.new_room]      = 1;

    commands.agi_unanimate_all();
    commands.agi_load_logic(0);
};

let canvasContext;
let audioContext;

const bltFrame = () => canvasContext.putImageData(state.frameData, 0, 0);

const resetControllers = () => state.controllers.fill(0);
const resetMenu        = () => {
    state.menu = [];
    while (state.menuContainerElement.children.length > 0) {
        state.menuContainerElement.removeChild(
            state.menuContainerElement.children[0]
        );
    }
};

const resetActions = () => {
    while (state.actionContainerElement.children.length > 0) {
        state.actionContainerElement.removeChild(
            state.actionContainerElement.children[0]
        );
    }
};


export const commands = logicCommands(state, restart);

const init = (_canvasContext, _audioContext, _menuContainerElement, _actionContainerElement) => {
    if (canvasContext) return;

    canvasContext                = _canvasContext;
    audioContext                 = _audioContext;
    state.menuContainerElement   = _menuContainerElement;
    state.actionContainerElement = _actionContainerElement;

    state.visualBuffer      = new Bitmap();
    state.priorityBuffer    = new Bitmap();
    state.framePriorityData = new Bitmap();
    state.frameData         = canvasContext.createImageData(320, 200);

    state.soundEmulator = new SoundEmulatorTiSn76496a(_audioContext);

    screen.init(state);

    window.onkeypress = e => e.which !== 13 ? state.keyboardCharBuffer.push(e.which) : null;
    window.onkeydown  = e => state.keyboardSpecialBuffer.push(e.which);

    restart();
};

const setEgoDir = newEgoDir => {
    const egoDir                 = state.variables[VAR.ego_dir];
    state.variables[VAR.ego_dir] = egoDir === newEgoDir ? 0 : newEgoDir;
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
                    case 27:  // Escape
                        // Use this to enter in words usually reserved for `said`

                        break;
                }
            }
        }

        while (state.keyboardCharBuffer.length > 0) {
            const key = state.keyboardCharBuffer.shift();
            if (key >= 32 && key < 127 && state.inputBuffer.length < state.variables[VAR.max_input_len]) {
                state.inputBuffer += String.fromCharCode(key);
            } else if (key === 8 && state.inputBuffer.length > 0) { // Backspace
                state.inputBuffer = state.inputBuffer.substr(0, state.inputBuffer.length - 1);
            } else if (key === 8 && state.inputBuffer.length > 0) { // Backspace
                state.inputBuffer = state.inputBuffer.substr(0, state.inputBuffer.length - 1);
            } else if (key === 13) {
                state.flags[FLAG.input_received] = true; // The player has entered a command
                state.keyboardCharBuffer         = [];
                break;
            }
        }
    }

    state.keyboardCharBuffer    = [];
    state.keyboardSpecialBuffer = [];
}

const updateScore = () => {
    const scoreEl = document.getElementById('score');
    if (!scoreEl) return;

    scoreEl.innerHTML = `Score: ${state.variables[VAR.score]} / ${state.variables[VAR.max_score]}`;
}

const updateObject = (obj, no) => {
    obj.oldX = obj.x;
    obj.oldY = obj.y;

    if (obj.draw) {
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

        if (obj.ignoreBlocks === false && newY !== obj.y) {
            for (let xNumber = 0; xNumber < cel.width; xNumber++) {
                const idx = newY * 160 + (obj.x + xNumber);
                if (state.priorityBuffer.data[idx] === 0 || state.priorityBuffer.data[idx] === 1) {
                    newY          = obj.y;
                    obj.direction = 0;
                    if (obj.movementFlag === GAMEOBJECT_MOVE_FLAGS.Wander) {
                        obj.direction = randomBetween(1, 9);
                        if (no === 0) state.variables[VAR.ego_dir] = obj.direction;
                    }

                    break;
                }
            }
        }
        if (obj.ignoreHorizon) {
            obj.y = newY;
        } else {
            obj.y = Math.max(newY, state.horizon);
        }

        if (obj.ignoreBlocks === false && newX !== obj.x) {
            const leftIdx  = obj.y * 160 + newX;
            const rightIdx = obj.y * 160 + newX + cel.width;
            if (state.priorityBuffer.data[leftIdx] === 0 || state.priorityBuffer.data[rightIdx] === 0 || state.priorityBuffer.data[leftIdx] === 1 || state.priorityBuffer.data[rightIdx] === 1) {
                newX          = obj.x;
                obj.direction = 0;
                if (obj.movementFlag === GAMEOBJECT_MOVE_FLAGS.Wander) {
                    obj.direction = randomBetween(1, 9);
                    if (no === 0) state.variables[VAR.ego_dir] = obj.direction;
                }
            }

        }
        obj.x = newX;

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
            } else if (obj.x + cel.width >= 160) {
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
            } else if (obj.y >= 168) {
                if (no === 0) {
                    state.variables[VAR.ego_edge_code] = 3;
                } else {
                    state.variables[VAR.object_touching_edge] = no;
                    state.variables[VAR.object_edge_code]     = 3;
                }
            }
        }

        if (!obj.fixedPriority) {
            if (obj.y < 48) {
                obj.priority = 4;
            } else if (obj.y === 168) {
                obj.priority = 15;
            } else {
                obj.priority = ((obj.y / 12) | 0) + 1;
            }

        }
        if (!obj.fixedLoop) {
            if (view.loops.length > 1 && view.loops.length < 4) {
                if (obj.direction === 2 || obj.direction === 3 || obj.direction === 4 ||
                    obj.direction === 6 || obj.direction === 7 || obj.direction === 8) {
                    obj.loop = 1;
                }
            } else if (view.loops.length >= 4) {
                if (obj.direction === 1) {
                    obj.loop = 3;
                } else if (obj.direction === 2 || obj.direction === 3 || obj.direction === 4) {
                    obj.loop = 0;
                } else if (obj.direction === 5) {
                    obj.loop = 2;
                } else if (obj.direction === 6 || obj.direction === 7 || obj.direction === 8) {
                    obj.loop = 1;
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
            } else
                obj.nextCycle--;
        }

        screen.drawObject(obj, no);
    }
}

// SQ2 specific
const discardCommon = /^(clock|restore|restore game|restart|restart game|fastest|normal|slow|fast|quit|pause game|explore pocket|check out|rescue|rescue game|inv|check out inv)$/;

const setSaid = e => state.playerSaid = e.target.getAttribute('data-word-groups');

const updateSaidSystem = () => {
    const actionNames = Object.keys(state.testSaid).filter(k => !discardCommon.test(k));
    if (state.actionContainerElement.children.length !== actionNames.length) {
        resetActions();

        actionNames.forEach(act => {
            const buttonEl = document.createElement('button');
            buttonEl.setAttribute('data-word-groups', state.testSaid[act]);
            buttonEl.onclick   = setSaid;
            buttonEl.innerHTML = act;
            state.actionContainerElement.appendChild(buttonEl);
        });
    }

    state.playerSaid = '';
};

const cycle = () => {
    resetControllers();
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

        for (let j = 0; j < state.gameObjects.length; j++) {
            const obj = state.gameObjects[j];
            if (j === 0) {
                obj.direction = egoDir;
            }
            if (obj.update) {
                updateObject(obj, j);
            }
        }


        break;
    }

    bltFrame();
    updateScore();
    updateSaidSystem();
}


export default {
    state,
    init,
    restart,
    cycle,
    commands,
}
