import {load} from './resources';
import interpreter from './interpreter';
import {VAR} from './constants'

let renderTimeout;

window.AGI = {
    FPS:      40,
    state:    null,
    commands: null,
    canvasEl: null,

    start: async (canvasEl, audioContext, menuContainerElement, actionContainerElement) => {
        if (AGI.state) return;

        AGI.canvasEl        = canvasEl;
        const canvasContext = canvasEl.getContext("2d");

        await load();

        interpreter.init(canvasContext, audioContext, menuContainerElement, actionContainerElement);
        AGI.state    = interpreter.state;
        AGI.commands = interpreter.commands;
        AGI.cycle    = interpreter.cycle;
        AGI.bltDebug = interpreter.bltDebug;
    },

    render: () => {
        if (!AGI.state) return;
        if (AGI.state.hasQuit) return;

        interpreter.cycle();
        renderTimeout = setTimeout(AGI.render, (1000 / AGI.FPS) * AGI.state.variables[VAR.cycle_delay]);
    },

    togglePause: () => {
        if (!AGI.state) return;

        if (renderTimeout) {
            AGI.canvasEl.style.opacity = 0.4;
            clearTimeout(renderTimeout);
            renderTimeout = null;
            AGI.state.soundEmulator.deactivate();
        } else {
            AGI.canvasEl.style.opacity = 1;

            AGI.state.soundEmulator.activate();
            AGI.render();
        }
    }
};
