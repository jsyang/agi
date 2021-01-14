import {load} from './resources';
import interpreter from './interpreter';
import {VAR} from './constants'
import TTS from './tts';
import {state} from './state';
import {commands} from './logicCommands';

let renderRAF;
let renderPrevTime = 0;

window.AGI = {
    hasStarted: false,
    FPS:        40,
    state:      null,
    commands:   null,
    canvasEl:   null,
    TTS:        null,

    start: async () => {
        if (AGI.state) return;

        await load(
            location.hash ? location.hash.slice(1) : undefined
        );

        AGI.hasStarted = true;
        AGI.canvasEl   = document.getElementById('canvas');

        TTS.init();

        interpreter.init(
            AGI.canvasEl.getContext("2d"),
            new AudioContext(),
            document.getElementById('menu'),
            document.getElementById('actions'),
            document.getElementById('player-input'),
        );

        AGI.state    = state;
        AGI.commands = commands;
        AGI.cycle    = interpreter.cycle;
        AGI.bltDebug = interpreter.bltDebug;
        AGI.TTS      = TTS;
    },

    render: () => {
        if (!AGI.state) return;
        if (AGI.state.hasQuit) return;

        const now = Date.now();

        if (now - renderPrevTime > 1000 / AGI.FPS * Math.max(state.variables[VAR.cycle_delay], 1)) {
            interpreter.cycle();
            renderPrevTime = now;
        }

        renderRAF = requestAnimationFrame(AGI.render);
    },

    togglePause: () => {
        if (!AGI.state) return;

        if (renderRAF) {
            AGI.canvasEl.style.opacity = 0.4;
            cancelAnimationFrame(renderRAF);
            renderRAF = null;
            AGI.state.soundEmulator.deactivate();
        } else {
            AGI.canvasEl.style.opacity = 1;

            AGI.state.soundEmulator.activate();
            AGI.render();
        }
    }
};
