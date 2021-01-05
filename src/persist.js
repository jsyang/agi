import state from './state';
import {FLAG} from './constants';
import {commands} from './logicCommands';

let slot = 'agi_savegame_1';

const getPersistableState = () => {
    return {
        items:     state.items,
        variables: state.variables,
        flags:     state.flags,
        ego:       state.gameObjects[0],

        // Ensure the restored game can successfully show views and process logic
        loadedViews:  state.loadedViews.map((v, i) => v ? i : null).filter(i => i !== null),
        loadedLogics: state.loadedLogics.map((v, i) => v ? i : null).filter(i => i !== null)
    };
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
            for (let i = 0; i < 256; i++) {
                state.variables[i] = savedState.variables[i];
                state.flags[i]     = savedState.flags[i];
                state.items[i]     = savedState.items[i];
            }

            for (let k in savedState.ego) {
                state.gameObjects[0][k] = savedState.ego[k];
            }

            for (let i of savedState.loadedViews) {
                commands.agi_load_view(i);
            }

            for (let i of savedState.loadedLogics) {
                commands.agi_load_logic(i);
            }

            state.allowInput                = true;
            state.flags[FLAG.game_restored] = true;

            commands.agi_new_room(state.variables[VAR.room_no]);
        }
    } catch (e) {
        alert('Restore game failed!');
    }
};
