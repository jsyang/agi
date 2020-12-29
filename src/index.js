import {load} from './resources';
import interpreter from './interpreter';

let renderTimeout;

window.AGI = {
    FPS:      30,
    state:    null,
    commands: null,

    start: async (canvasContext, audioContext, menuContainerElement) => {
        if (AGI.state) return;

        await load();

        interpreter.init(canvasContext, audioContext, menuContainerElement);
        AGI.state    = interpreter.state;
        AGI.commands = interpreter.commands;
        AGI.cycle    = interpreter.cycle;

        //AGI.render();
    },

    render: () => {
        if (!AGI.state) return;
        if (AGI.state.hasQuit) return;

        interpreter.cycle();
        renderTimeout = setTimeout(AGI.render, (1000 / AGI.FPS) * AGI.state.variables[10]);
    },

    togglePause: () => {
        if (!AGI.state) return;

        if (renderTimeout) {
            clearTimeout(renderTimeout);
            renderTimeout = null;
            AGI.state.soundEmulator.deactivate();
        } else {
            AGI.state.soundEmulator.activate();
            AGI.render();
        }
    }
};
