/**
 * Allow player to trigger an intention to save / restore current game
 *
 * Cannot do it within the same cycle because it will always set the controller
 * for save/restore within current state which will cause a call stack overflow
 */

import {restoreGame, saveGame} from './persist';

let isNextCycleSaveGame    = false;
let isNextCycleRestoreGame = false;

const handleSaveRestore = () => {
    if (isNextCycleSaveGame) {
        saveGame();
    } else if (isNextCycleRestoreGame) {
        restoreGame();
    }

    // Reset this otherwise it will save/restore for every subsequent cycle once set!
    isNextCycleSaveGame    = false;
    isNextCycleRestoreGame = false;
};

function saveNextCycle() {
    isNextCycleSaveGame = true;
}

function restoreNextCycle() {
    isNextCycleRestoreGame = true;
}

export default {
    handleSaveRestore,
    saveNextCycle,
    restoreNextCycle,
};
