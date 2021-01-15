import {state} from './state';

/**
 * Mechanism to allow the player to filter and choose (identified) input for the parser via a GUI.
 */

const clearElementChildren = el => {
    while (el.children.length > 0) el.removeChild(el.children[0]);
};

const setSaid = e => state.playerSaid = e.target.getAttribute('data-word-groups');

let previousActionCount = 0;
const actionListByAlpha = [];

const updateSaidSystem = () => {
    const actionNames = Object.keys(state.testSaid);

    if (previousActionCount !== actionNames.length) {
        clearElementChildren(state.actionContainerElement);

        for (let listEl of actionListByAlpha) {
            if (!listEl) continue;

            clearElementChildren(listEl);
        }

        actionNames.forEach(act => {
            act = act.toLowerCase();

            const actionsListIndex = act.charCodeAt(0) - 97;

            let list = actionListByAlpha[actionsListIndex];

            if (!list) {
                list = document.createElement('div');
                list.classList.add('list');
            }

            const buttonEl = document.createElement('button');
            buttonEl.setAttribute('data-word-groups', state.testSaid[act]);
            buttonEl.onclick   = setSaid;
            buttonEl.innerHTML = act;

            list.appendChild(buttonEl);
            actionListByAlpha[actionsListIndex] = list;
        });

        actionListByAlpha.forEach(listEl => state.actionContainerElement.appendChild(listEl));

        previousActionCount = actionNames.length;
        searchSaidSystem();
    }

    state.playerSaid = '';
};

let currentSaidSearch = '';

const searchSaidSystem = () => {
    currentSaidSearch = state.actionSearchElement.value.trim().toLowerCase().replace(/\\/g, '');

    if (currentSaidSearch.length === 0) {
        for (let b of Array.from(state.actionContainerElement.querySelectorAll('button'))) {
            b.classList.remove('hide');
        }
    } else {
        const searchRE = new RegExp(currentSaidSearch, 'gi');

        Object.keys(state.testSaid)
            .forEach(actionToHide => {
                const actionEl = state.actionContainerElement.querySelector(`button[data-word-groups="${state.testSaid[actionToHide]}"]`);
                if (searchRE.test(actionToHide)) {
                    actionEl.classList.remove('hide');
                } else {
                    actionEl.classList.add('hide');
                }
            });
    }

    // Hide any empty lists so we don't see empty columns
    for (let listEl of actionListByAlpha) {
        if (!listEl) continue;

        if (listEl.children.length === listEl.querySelectorAll('.hide').length) {
            listEl.classList.add('hide');
        } else {
            listEl.classList.remove('hide');
        }
    }
};

export default {
    searchSaidSystem,
    updateSaidSystem,
};
