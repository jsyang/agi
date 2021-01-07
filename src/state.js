import {FLAG, MAX_GAMEOBJECTS, VAR} from './constants';
import GameObject from './gameObject';
import {commands} from './logicCommands';

export const state = {
    programControl:       false,    // Does the game have control over player character (ego)?
    visualBuffer:         null,     // 2x1 pixels for colored drawing
    visualPriorityBuffer: null,     // Only for drawing priority
    priorityBuffer:       null,     // Only for obstacles and control priorities
    scriptSize:           0,
    strings:              [],
    items:                new Uint8Array(256),
    variables:            new Uint8Array(256),
    flags:                new Uint8Array(256),
    controllers:          new Uint8Array(256),
    keysForControllers:   {},       // For key.set

    // For prompt screens
    isTextScreen:       false,
    textScreenMessages: [],

    gameObjects: [],    // Characters, animated sprites, etc.

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

    textBG:                15,       // For agi_display
    textFG:                0,      // For agi_display
    debugFrameData:        null,    // ImageData // For checking various visual / priority aspects
    frameData:             null,    // ImageData
    framePriorityData:     null,    // Bitmap,
    keyboardSpecialBuffer: [],      // number[]
    keyboardCharBuffer:    [],      // number[]
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
};

const resetMenu = () => {
    state.menu = [];
    while (state.menuContainerElement.children.length > 0) {
        state.menuContainerElement.removeChild(
            state.menuContainerElement.children[0]
        );
    }
};

export function resetControllers() {
    state.controllers.fill(0);
}

export function restart() {
    state.hasPaused = false;
    state.hasQuit   = false;

    resetControllers();
    state.keysForControllers = {};

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

    for (let i = MAX_GAMEOBJECTS; i-- > 0;) {
        state.gameObjects[i] = GameObject();
    }
    commands.agi_load_logic(0);
}

export function updateSound() {
    state.soundEmulator.muted = !state.flags[FLAG.sound_on];
}
