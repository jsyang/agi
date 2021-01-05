import {load} from './resources';
import interpreter from './interpreter';
import {VAR} from './constants'
import TTS from './tts';
import {state} from './state';
import {commands} from './logicCommands';

let renderTimeout;

window.AGI = {
    FPS:      40,
    state:    null,
    commands: null,
    canvasEl: null,
    TTS:      null,

    start: async (canvasEl, audioContext, menuContainerElement, actionContainerElement) => {
        if (AGI.state) return;

        AGI.canvasEl        = canvasEl;
        const canvasContext = canvasEl.getContext("2d");

        TTS.init();
        await load();

        interpreter.init(canvasContext, audioContext, menuContainerElement, actionContainerElement);
        AGI.state    = state;
        AGI.commands = commands;
        AGI.cycle    = interpreter.cycle;
        AGI.bltDebug = interpreter.bltDebug;
        AGI.TTS      = TTS;
    },

    getNextCycleTimeMS: () => 1000 / AGI.FPS * Math.max(AGI.state.variables[VAR.cycle_delay], 1),

    render: () => {
        if (!AGI.state) return;
        if (AGI.state.hasQuit) return;

        interpreter.cycle();
        renderTimeout = setTimeout(AGI.render, AGI.getNextCycleTimeMS());
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
