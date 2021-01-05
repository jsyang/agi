import {state} from './state';
import {FLAG, MAX_GAMEOBJECTS, VAR} from './constants';
import {commands} from './logicCommands';

let slot = 'agi_savegame_1';

const getIndicesForArray = a => Array.from(a).map((v, i) => v ? i : null).filter(i => i !== null);

const getPersistableState = () => {
    const stateToBeSaved = {...state};

    // Don't want to store these
    delete stateToBeSaved.menu;
    delete stateToBeSaved.menuContainerElement;
    delete stateToBeSaved.actionContainerElement;
    delete stateToBeSaved.debugFrameData;
    delete stateToBeSaved.frameData;
    delete stateToBeSaved.framePriorityData;
    delete stateToBeSaved.testSaid;
    delete stateToBeSaved.soundEmulator;
    delete stateToBeSaved.playedSound;
    delete stateToBeSaved.playerSaid;
    delete stateToBeSaved.textScreenMessages;
    delete stateToBeSaved.keysForControllers;
    delete stateToBeSaved.strings;
    delete stateToBeSaved.priorityBuffer;
    delete stateToBeSaved.visualBuffer;
    delete stateToBeSaved.visualPriorityBuffer;
    delete stateToBeSaved.keyboardCharBuffer;
    delete stateToBeSaved.keyboardSpecialBuffer;

    // Ensure we save the Uint8Arrays correctly
    stateToBeSaved.items       = Array.from(state.items);
    stateToBeSaved.flags       = Array.from(state.flags);
    stateToBeSaved.variables   = Array.from(state.variables);
    stateToBeSaved.controllers = Array.from(state.controllers);

    // Ensure the restored game can successfully show views and process logic
    stateToBeSaved.loadedSounds = getIndicesForArray(state.loadedSounds);
    stateToBeSaved.loadedPics   = getIndicesForArray(state.loadedPics);
    stateToBeSaved.loadedViews  = getIndicesForArray(state.loadedViews);
    stateToBeSaved.loadedLogics = getIndicesForArray(state.loadedLogics);

    return stateToBeSaved;
};

export const saveGame = () => {
    try {
        localStorage.setItem('agi_savegame_1', JSON.stringify(getPersistableState(state)));
    } catch (e) {
        alert('Save game failed!');
    }
};

export const restoreGame = () => {
    let savedState;
    try {
        savedState = JSON.parse(localStorage.getItem(slot));

        if (savedState) {

            for (let i = 0; i < MAX_GAMEOBJECTS; i++) {
                Object.assign(state.gameObjects[i], savedState.gameObjects[i]);
            }

            for (let i of savedState.loadedViews) {
                commands.agi_load_view(i);
            }

            for (let i of savedState.loadedLogics) {
                commands.agi_load_logic(i);
            }

            for (let i of savedState.loadedPics) {
                state.variables[255] = i;
                commands.agi_load_pic(255);
            }

            for (let i of savedState.loadedLogics) {
                commands.agi_load_logic(i);
            }

            for (let i = 0; i < 256; i++) {
                state.variables[i] = savedState.variables[i];
                state.flags[i]     = savedState.flags[i];
                state.items[i]     = savedState.items[i];
            }


            // todo: this isn't quite working the way I wanted it
            // the ego doesn't return to the original spot and I have to run
            // one cycle with the new_room flag to get things working
            commands.agi_set(FLAG.new_room);

            // Execution jumps to the start of logic 0
            state.loadedLogics[0].data.position = state.loadedLogics[0].scanStart;

            // Empty out the said options
            state.testSaid   = {};
            state.allowInput = true;

            commands.agi_set(FLAG.game_restored);
        }
    } catch (e) {
        alert('Restore game failed!');
    }
};
