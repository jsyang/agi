import {randomBetween} from './helpers';
import screen from './screen';
import Logic from './logic';
import GameObject from './gameObject';
import {Pic} from './bitmap';
import {readAgiResource, wordGroups} from './resources';
import Sound from './sound';
import {View} from './view';
import {
    VAR, AGI_RESOURCE_TYPE, FLAG, GAMEOBJECT_DIRECTION,
    GAMEOBJECT_MOVE_FLAGS, MAX_GAMEOBJECTS
} from './constants';
import {state, restart} from './state';
import {restoreNextCycle, saveNextCycle} from './interpreter';

const INTERPOLATE_VAR = /%v[0-9]+/g;
const INTERPOLATE_MSG = /%m[0-9]{1,3}/g;
const INTERPOLATE_STR = /%s[0-9]{1,3}/g;

let currentMenu;

// Logging
// const LLL = new Function();
const LLL = (...args) => console.log.apply(console, [state.logicNo, ...args]);

// Dialog
const _alert = message => {
    state.soundEmulator.muted = true;
    AGI.TTS.say(message)
    alert(message);
    AGI.TTS.stop();
    state.soundEmulator.muted = false;
};

export const commands = {
    agi_increment: (varNo) => {
        if (state.variables[varNo] < 255)
            state.variables[varNo]++;
    },

    agi_decrement: (varNo) => {
        if (state.variables[varNo] > 0)
            state.variables[varNo]--;
    },

    agi_assignn: (varNo, num) => {
        state.variables[varNo] = num;
    },

    agi_assignv: (varNo1, varNo2) => {
        commands.agi_assignn(varNo1, state.variables[varNo2]);
    },

    agi_addn: (varNo, num) => {
        state.variables[varNo] += num;
    },

    agi_addv: (varNo1, varNo2) => {
        commands.agi_addn(varNo1, state.variables[varNo2]);
    },

    agi_subn: (varNo, num) => {
        state.variables[varNo] -= num;
    },

    agi_subv: (varNo1, varNo2) => {
        commands.agi_subn(varNo1, state.variables[varNo2]);
    },

    agi_lindirectn: (varNo, val) => {
        state.variables[state.variables[varNo]] = val;
    },

    agi_lindirectv: (varNo1, varNo2) => {
        commands.agi_lindirectn(varNo1, state.variables[varNo2]);
    },

    agi_rindirect: (varNo1, varNo2) => {
        state.variables[varNo1] = state.variables[state.variables[varNo2]];
    },

    agi_set: (flagNo) => {
        state.flags[flagNo] = 1;
    },

    agi_reset: (flagNo) => {
        state.flags[flagNo] = 0;
    },

    agi_toggle: (flagNo) => {
        state.flags[flagNo] = state.flags[flagNo] ? 0 : 1;
    },

    agi_set_v: (varNo) => {
        commands.agi_set(state.variables[varNo]);
    },

    agi_reset_v: (varNo) => {
        commands.agi_reset(state.variables[varNo]);
    },

    agi_togglev: (varNo) => {
        commands.agi_toggle(state.variables[varNo]);
    },

    agi_call: (logicNo) => {
        // LLL('agi_call', logicNo);
        state.logicStack.push(state.logicNo);
        state.logicNo = logicNo;
        if (state.loadedLogics[logicNo] != null) {
            state.loadedLogics[logicNo].parseLogic();
        } else {
            commands.agi_load_logic(logicNo);
            state.loadedLogics[logicNo].parseLogic();
            // state.loadedLogics[logicNo] = null;
        }
        state.logicNo = state.logicStack.pop();
    },

    agi_call_v: (varNo) => {
        commands.agi_call(state.variables[varNo]);
    },

    agi_print_at: (msgNo, x, y, width) => {
        const message = commands._agi_get_message(msgNo);

        if (message) {
            _alert(message);
        }
    },

    agi_shake_screen: (shakeCount) => {

    },

    agi_reposition: (oA, vDX, vDY) => {
        // Use variables not absolute value!
        vDX = state.variables[vDX];
        vDY = state.variables[vDY];

        if (vDX > 127) {
            vDX -= 256;
        }

        if (vDY > 127) {
            vDY -= 256;
        }

        state.gameObjects[oA].x += vDX;
        state.gameObjects[oA].y += vDY;
    },

    agi_print_at_v: (varNo, x, y, width) => {
        commands.agi_print_at(state.variables[varNo], x, y, width);
    },

    agi_mul_n: (varNo, val) => {
        state.variables[state.variables[varNo]] *= val;
    },

    agi_mul_v: (varNo1, varNo2) => {
        commands.agi_mul_n(varNo1, state.variables[varNo2]);
    },

    agi_div_n: (varNo, val) => {
        state.variables[state.variables[varNo]] /= val;
    },

    agi_div_v: (varNo1, varNo2) => {
        commands.agi_div_n(varNo1, state.variables[varNo2]);
    },

    agi_new_room: (roomNo) => {
        LLL(`agi_new_room(${roomNo})`);

        // All objects are unanimated
        commands.agi_stop_update(0);
        commands.agi_unanimate_all();

        // All resources except logic 0 are discarded

        // player.control command is executed
        commands.agi_player_control();

        // unblock command is executed
        commands.agi_unblock();

        // horizon is set to 36
        commands.agi_set_horizon(36);

        // v1 (prev_room_no) is set to the value of v0 (room_no)
        state.variables[VAR.prev_room_no] = state.variables[VAR.room_no];

        // v0 (room_no) is assigned to the new room number
        state.variables[VAR.room_no] = roomNo;

        // v16 (ego_view_no) is set to the view number assigned to ego
        state.variables[VAR.ego_view_no] = state.gameObjects[0].viewNo;

        // The logic for the new room is loaded (logic ROOMNO)
        // state.logicStack = [];
        commands.agi_load_logic(roomNo);

        // Flag 5 (new_room) is set (this is reset after the first cycle in the new room)
        commands.agi_set(FLAG.new_room);

        // Execution jumps to the start of logic 0
        state.loadedLogics[0].data.position = state.loadedLogics[0].scanStart;

        // Empty out the said options
        state.testSaid = {};
    },

    agi_new_room_v: (varNo) => {
        commands.agi_new_room(state.variables[varNo]);
    },

    agi_load_pic: (varNo) => {
        const picNo             = state.variables[varNo];
        state.loadedPics[picNo] = new Pic(readAgiResource(AGI_RESOURCE_TYPE.PIC, picNo));
    },

    agi_overlay_pic: (varNo) => {
        const picNo = state.variables[varNo];
        state.loadedPics[picNo].draw(state.visualBuffer, state.visualPriorityBuffer, state.priorityBuffer);
    },

    agi_draw_pic: (varNo) => {
        state.visualBuffer.clear(0x0F);
        state.visualPriorityBuffer.clear(0x04);
        state.priorityBuffer.clear(0x04);
        commands.agi_overlay_pic(varNo);
    },

    agi_show_pic: () => {
        screen.bltPic();
        state.gameObjects.forEach(obj => {
            if (obj.draw) {
                screen.drawObject(obj);
            }
        });
    },

    agi_discard_pic: (varNo) => {
        const picNo             = state.variables[varNo];
        state.loadedPics[picNo] = null;
    },

    agi_get_posn: (objNo, varNo1, varNo2) => {
        state.variables[varNo1] = state.gameObjects[objNo].x;
        state.variables[varNo2] = state.gameObjects[objNo].y;
    },

    agi_stop_update: (objNo) => {
        state.gameObjects[objNo].update = false;
    },

    // https://github.com/huguesv/AgiPlayer/blob/ced9361b910e6ad391c86380c6e17c73ea01064f/src/Woohoo.Agi.Interpreter/Interpreter/AgiInterpreter.Kernel.cs#L371
    agi_animate_obj: (objNo) => {
        // LLL(`agi_animate_obj(${objNo})`);
        const obj = state.gameObjects[objNo];

        obj.celCycling    = true;
        obj.direction     = GAMEOBJECT_DIRECTION.Stopped;
        obj.movementFlag  = GAMEOBJECT_MOVE_FLAGS.Normal;
        obj.update        = true;
        obj.fixedPriority = false;
    },

    agi_unanimate_all: () => {
        for (let j = 0; j < MAX_GAMEOBJECTS; j++) {
            const obj = state.gameObjects[j];

            if (obj.draw) {
                commands.agi_erase(j);
            }
            obj.update          = false;
            obj.ignoreHorizon   = false;
            obj.ignoreBlocks    = false;
            obj.ignoreObjs      = false;
            obj.callAtEndOfLoop = false;
            obj.fixedPriority   = false;
            obj.fixedLoop       = false;
        }
    },

    agi_draw: (objNo) => {
        const obj = state.gameObjects[objNo];
        screen.drawObject(obj);
        obj.draw = true;
    },

    agi_set_view: (objNo, viewNo) => {
        // LLL(`agi_set_view(${objNo},${viewNo})`);

        const obj = state.gameObjects[objNo];

        obj.viewNo = viewNo;
        if (obj.loop >= state.loadedViews[viewNo].loops.length) {
            obj.loop = 0;
        }

        obj.cel = 0;
    },

    agi_set_view_v: (objNo, varNo) => {
        commands.agi_set_view(objNo, state.variables[varNo]);
    },

    agi_player_control: () => {
        state.programControl = false;

        state.variables[VAR.ego_dir] = state.gameObjects[0].direction = GAMEOBJECT_DIRECTION.Stopped;
    },

    agi_program_control: () => {
        state.programControl = true;
    },

    // DEBUG COMMANDS?

    agi_show_pri_screen: () => {
        // ???
    },

    agi_show_mem: () => {
        // ???
    },

    agi_obj_status_v: (oA) => {
        // ???
    },

    agi_return: () => {
        // Logic early exit
    },

    agi_set_horizon: (y) => {
        state.horizon = y;
    },

    agi_unblock: () => {
        state.blockX1 = state.blockY1 = state.blockX2 = state.blockY2 = 0;
    },

    agi_load_view: (viewNo) => {
        state.loadedViews[viewNo] = new View(readAgiResource(AGI_RESOURCE_TYPE.VIEW, viewNo));
    },

    agi_load_view_v: (varNo) => {
        commands.agi_load_view(state.variables[varNo]);
    },

    agi_discard_view: (viewNo) => {
        state.loadedViews[viewNo] = null;
    },

    agi_discard_view_v: (varNo) => {
        commands.agi_discard_view(state.variables[varNo]);
    },

    agi_observe_objs: (objNo) => {
        state.gameObjects[objNo].ignoreObjs = false;
    },

    agi_ignore_objs: (objNo) => {
        state.gameObjects[objNo].ignoreObjs = true;
    },

    agi_position: (objNo, x, y) => {
        const obj = state.gameObjects[objNo];
        if (obj.draw) {
            screen.clearOldObjectView(obj);
        }
        obj.callAtEndOfLoop = false;
        obj.x               = x;
        obj.y               = y;
    },

    agi_position_v: (objNo, varNo1, varNo2) => {
        commands.agi_position(objNo, state.variables[varNo1], state.variables[varNo2]);
    },

    agi_stop_cycling: (objNo) => {
        const obj      = state.gameObjects[objNo];
        obj.celCycling = false;
    },

    agi_start_cycling: (objNo) => {
        state.gameObjects[objNo].celCycling = true;
    },

    agi_normal_cycle: (objNo) => {
        state.gameObjects[objNo].celCycling   = true;
        state.gameObjects[objNo].reverseCycle = false;
    },

    agi_end_of_loop: (objNo, flagNo) => {
        commands.agi_reset(flagNo);

        const obj                 = state.gameObjects[objNo];
        obj.reverseCycle          = false;
        obj.callAtEndOfLoop       = true;
        obj.flagToSetWhenFinished = flagNo;
        obj.celCycling            = true;
        obj.cel                   = 0;
    },

    agi_reverse_cycle: (objNo) => {
        state.gameObjects[objNo].celCycling   = true;
        state.gameObjects[objNo].reverseCycle = true;
    },

    agi_cycle_time: (objNo, varNo) => {
        state.gameObjects[objNo].cycleTime = state.variables[varNo];
    },

    agi_reverse_loop: (objNo, flagNo) => {
        commands.agi_reset(flagNo);

        const obj                 = state.gameObjects[objNo];
        obj.callAtEndOfLoop       = true;
        obj.flagToSetWhenFinished = flagNo;
        obj.reverseCycle          = true;
        obj.celCycling            = true;
        obj.cel                   = state.loadedViews[obj.viewNo].loops[obj.loop].cels.length - 1;
    },

    agi_stop_motion: (objNo) => {
        if (objNo === 0) {
            commands.agi_program_control();
        }
        state.gameObjects[objNo].direction = GAMEOBJECT_DIRECTION.Stopped;
    },

    agi_start_motion: (objNo) => {
        if (objNo === 0) {
            commands.agi_player_control();
        }
        state.gameObjects[objNo].movementFlag = GAMEOBJECT_MOVE_FLAGS.Normal;
    },

    agi_normal_motion: (objNo) => {
        state.gameObjects[objNo].movementFlag = GAMEOBJECT_MOVE_FLAGS.Normal;
    },

    agi_step_size: (objNo, varNo) => {
        // LLL(`agi_step_size(${objNo}, ${varNo})`);
        state.gameObjects[objNo].stepSize = state.variables[varNo];
    },

    agi_step_time: (objNo, varNo) => {
        state.gameObjects[objNo].stepTime = state.variables[varNo];
    },

    agi_set_loop: (objNo, loopNo) => {
        const obj           = state.gameObjects[objNo];
        obj.loop            = loopNo;
        obj.callAtEndOfLoop = false;
        obj.cel             = 0;
    },

    agi_set_loop_v: (objNo, varNo) => {
        commands.agi_set_loop(objNo, state.variables[varNo]);
    },

    agi_fix_loop: (objNo) => {
        state.gameObjects[objNo].fixedLoop = true;
    },

    agi_set_priority: (objNo, priority) => {
        state.gameObjects[objNo].priority      = priority;
        state.gameObjects[objNo].fixedPriority = true;
    },

    agi_set_priority_v: (objNo, varNo) => {
        commands.agi_set_priority(objNo, state.variables[varNo]);
    },

    agi_release_loop: (objNo) => {
        state.gameObjects[objNo].fixedLoop = false;
    },

    agi_set_cel: (objNo, celNo) => {
        state.gameObjects[objNo].nextCycle = 1;
        state.gameObjects[objNo].cel       = celNo;
    },

    agi_set_cel_v: (objNo, varNo) => {
        commands.agi_set_cel(objNo, state.variables[varNo]);
    },

    agi_last_cel: (objNo, varNo) => {
        const obj              = state.gameObjects[objNo];
        state.variables[varNo] = state.loadedViews[obj.viewNo].loops[obj.loop].cels.length - 1;
    },

    agi_current_cel: (objNo, varNo) => {
        state.variables[varNo] = state.gameObjects[objNo].cel;
    },

    agi_current_loop: (objNo, varNo) => {
        state.variables[varNo] = state.gameObjects[objNo].loop;
    },

    agi_current_view: (objNo, varNo) => {
        state.variables[varNo] = state.gameObjects[objNo].viewNo;
    },

    agi_number_of_loops: (objNo, varNo) => {
        state.variables[varNo] = state.loadedViews[state.gameObjects[objNo].viewNo].loops.length;
    },

    agi_release_priority: (objNo) => {
        state.gameObjects[objNo].fixedPriority = false;
    },

    agi_get_priority: (objNo, varNo) => {
        state.variables[varNo] = state.gameObjects[objNo].priority;
    },

    agi_start_update: (objNo) => {
        const obj  = state.gameObjects[objNo];
        obj.update = true;
        obj.draw   = true;
        screen.drawObject(obj);
    },

    agi_force_update: (objNo) => {
        state.gameObjects[objNo].draw = true;
        commands.agi_draw(objNo);
    },

    agi_ignore_horizon: (objNo) => {
        state.gameObjects[objNo].ignoreHorizon = true;
    },

    agi_observe_horizon: (objNo) => {
        state.gameObjects[objNo].ignoreHorizon = false;
    },

    agi_prevent_input: () => {
        state.allowInput = false;
    },

    agi_accept_input: () => {
        state.allowInput = true;
    },

    agi_add_to_pic: (viewNo, loopNo, celNo, x, y, priority, margin) => {
        // LLL(`agi_add_to_pic(${viewNo}, ${loopNo}, ${celNo}, ${x}, ${y}, ${priority}, ${margin})`);
        screen.bltViewToPic(viewNo, loopNo, celNo, x, y, priority, margin);
    },

    agi_add_to_pic_v: (varNo1, varNo2, varNo3, varNo4, varNo5, varNo6, varNo7) => {
        commands.agi_add_to_pic(
            state.variables[varNo1],
            state.variables[varNo2],
            state.variables[varNo3],
            state.variables[varNo4],
            state.variables[varNo5],
            state.variables[varNo6],
            state.variables[varNo7]
        );
    },

    agi_random: (start, end, varNo) => {
        state.variables[varNo] = randomBetween(start, end);
    },

    agi_move_obj: (objNo, x, y, stepSize, flagNo) => {
        const obj                 = state.gameObjects[objNo];
        obj.moveToX               = x;
        obj.moveToY               = y;
        obj.moveToStep            = stepSize;//stepSize > 0 ? stepSize : obj.moveToStep;
        obj.movementFlag          = GAMEOBJECT_MOVE_FLAGS.MoveTo;
        obj.flagToSetWhenFinished = flagNo;
    },

    agi_move_obj_v: (objNo, varNo1, varNo2, stepSize, flagNo) => {
        // jsyang: very weird, STEPSIZE here gets set to a very large number when this is called
        // docs for AGI command may possibly be wrong
        commands.agi_move_obj(objNo, state.variables[varNo1], state.variables[varNo2], 1, flagNo);
    },

    agi_follow_ego: (objNo, stepSpeed, flagNo) => {
        const obj                 = state.gameObjects[objNo];
        obj.moveToStep            = stepSpeed;
        obj.flagToSetWhenFinished = flagNo;
        obj.movementFlag          = GAMEOBJECT_MOVE_FLAGS.ChaseEgo;
    },

    agi_wander: (objNo) => {
        state.gameObjects[objNo].movementFlag = GAMEOBJECT_MOVE_FLAGS.Wander;
        state.gameObjects[objNo].direction    = randomBetween(1, 9);

        if (objNo === 0) {
            state.variables[VAR.ego_dir] = state.gameObjects[objNo].direction;
            commands.agi_program_control();
        }
    },

    agi_set_dir: (objNo, varNo) => {
        state.gameObjects[objNo].direction = state.variables[varNo];
    },

    agi_get_dir: (objNo, varNo) => {
        state.variables[varNo] = state.gameObjects[objNo].direction;
    },

    agi_ignore_blocks: (objNo) => {
        // LLL(`agi_ignore_blocks(${objNo})`);
        state.gameObjects[objNo].ignoreBlocks = true;
    },

    agi_observe_blocks: (objNo) => {
        // LLL(`agi_observe_blocks(${objNo})`);
        state.gameObjects[objNo].ignoreBlocks = false;
    },

    agi_block: (x1, y1, x2, y2) => {
        state.blockX1 = x1;
        state.blockY1 = y1;
        state.blockX2 = x2;
        state.blockY2 = y2;
    },

    agi_set_string: (strNo, msgNo) => {
        // LLL(`agi_set_string(${strNo},${msgNo})`);
        state.strings[strNo] = commands._agi_get_message(msgNo);
    },

    agi_erase: (objNo) => {
        const obj = state.gameObjects[objNo];
        screen.clearOldObjectView(obj);
        obj.draw = false;
    },

    agi_load_logic: (logNo) => {
        LLL(`agi_load_logic(${logNo})`);

        if (state.loadedLogics[logNo]) {
            state.loadedLogics[logNo].data.position = state.loadedLogics[logNo].entryPoint;
        } else {
            state.loadedLogics[logNo] = new Logic(logNo);
        }
    },

    agi_load_logic_v: (varNo) => {
        commands.agi_load_logic(state.variables[varNo]);
    },

    agi_display: (row, col, msgNo) => {
        const msg = commands._agi_get_message(msgNo);

        if (state.isTextScreen) {
            state.textScreenMessages.push(msg);
        } else {
            screen.bltText(row, col, msg);
        }
    },

    agi_display_v: (varNo1, varNo2, varNo3) => {
        commands.agi_display(state.variables[varNo1], state.variables[varNo2], state.variables[varNo3]);
    },

    agi_clear_lines: (fromRow, toRow, colorNo) => {
        LLL('agi_clear_lines');
        screen.clearTextRect(fromRow, 0, toRow, 40, colorNo);
        // for (let y = fromRow; y < row + 1; y++) {
        //     screen.bltText(y, 0, "                                        ", colorNo);
        // }
    },

    agi_script_size: (bytes) => {

    },

    agi_trace_info: (logNo, firstRow, height) => {

    },

    // http://agi.sierrahelp.com/AGIStudioHelp/Logic/MenuIOCommands/set.key.html
    agi_set_key: (nCODE1, nCODE2, cA) => {
        LLL('agi_set_key', nCODE1, nCODE2, cA);
        if (nCODE1 > 0) {   // ASCII
            state.keysForControllers[nCODE1] = cA;
        } else if (nCODE2 > 0) { // Only support F1 - F10 extended keys for now
            state.keysForControllers[nCODE2 + 53] = cA;
        }
    },

    // http://agi.sierrahelp.com/AGIStudioHelp/Logic/SystemCommands/set.game.id.html
    agi_set_game_id: (msg) => 0,

    // http://agi.sierrahelp.com/AGIStudioHelp/Logic/DisplayCommands/configure.screen.html
    agi_configure_screen: (PLAYTOP, INPUTLINE, STATUSLINE) => 0,

    // http://agi.sierrahelp.com/AGIStudioHelp/Logic/DisplayCommands/set.cursor.char.html
    agi_set_cursor_char: (msg) => 0,

    _agi_get_message: (msgNo) => {
        let interpolated = state.loadedLogics[state.logicNo].messages[msgNo];

        // Variable interpolation
        if (interpolated) {
            interpolated = interpolated.replace(INTERPOLATE_VAR, (match, p1) => {
                const vNum = parseFloat(match.replace('%v', ''));
                return state.variables[vNum].toString();
            });

            interpolated = interpolated.replace(INTERPOLATE_MSG, (match, p1) => {
                const mNum = parseFloat(match.replace('%m', ''));
                return state.loadedLogics[state.logicNo].messages[mNum];
            });

            interpolated = interpolated.replace(INTERPOLATE_STR, (match, p1) => {
                const sNum = parseFloat(match.replace('%s', ''));
                return state.strings[sNum];
            });
        }

        return interpolated;
    },

    agi_set_menu: (msg) => {
        currentMenu = {
            name:    commands._agi_get_message(msg),
            members: [{text: commands._agi_get_message(msg), ctrNo: -1}]
        };

        state.menu.push(currentMenu);
    },

    agi_set_menu_member: (msg, ctrNo) => {
        currentMenu.members.push({
            text: commands._agi_get_message(msg),
            ctrNo
        });
    },

    agi_submit_menu: () => {
        if (state.menuContainerElement.children.length > 0) return;

        for (let m of state.menu) {
            const menuId           = 'menu-' + m.name.toLowerCase();
            const selectEl         = document.createElement('select');
            selectEl.id            = menuId;
            selectEl.selectedIndex = 0;
            selectEl.onchange      = () => {
                const ctrNo              = parseFloat(selectEl.value);
                state.controllers[ctrNo] = 1;
                selectEl.selectedIndex   = 0;
                selectEl.blur();
            };

            for (let i of m.members) {
                const optionEl     = document.createElement('option');
                optionEl.value     = i.ctrNo.toString();
                optionEl.innerHTML = i.text;

                selectEl.appendChild(optionEl);
            }

            state.menuContainerElement.appendChild(selectEl);

        }

        const scoreEl = document.createElement('span');
        scoreEl.id    = 'score';
        state.menuContainerElement.appendChild(scoreEl);
    },

    agi_enable_member: (ctrl) => {

    },

    agi_disable_member: (ctrl) => {

    },

    agi_put_v: (item, room) => {
        state.items[item] = room;
    },

    agi_drop: (item) => {
        state.items[item] = 0;
    },

    agi_status_line_on: () => {

    },

    agi_status_line_off: () => {

    },

    agi_load_sound: (soundNo) => {
        state.loadedSounds[soundNo] = new Sound(readAgiResource(AGI_RESOURCE_TYPE.SOUND, soundNo));
    },

    agi_sound: (soundNo, flagNo) => {
        state.playedSound && state.playedSound.stop();
        state.playedSound = state.loadedSounds[soundNo];

        if (state.playedSound) {
            state.playedSound.play(state.soundEmulator, () => {
                commands.agi_set(flagNo);
            });
        }
    },

    agi_stop_sound: () => {
        state.playedSound && state.playedSound.stop();
        state.playedSound = null;
    },

    agi_reposition_to: (objNo, x, y) => {
        state.gameObjects[objNo].x = x;
        state.gameObjects[objNo].y = y;
    },

    agi_reposition_to_v: (objNo, varNo1, varNo2) => {
        commands.agi_reposition_to(objNo, state.variables[varNo1], state.variables[varNo2]);
    },

    agi_text_screen: () => {
        // set up for a text only screen
        state.isTextScreen = true;
    },

    agi_status: () => {

    },

    agi_clear_text_rect: (Y1, X1, Y2, X2, COLOR) => {
        // jsyang: Doesn't clear anything in our version
        // We dump all text to an `alert()` window
        LLL('agi_clear_text_rect');
        screen.clearTextRect(Y1, X1, Y2, X2, COLOR);
    },

    agi_menu_input: () => {

    },

    agi_graphics: () => {
        if (state.textScreenMessages.length > 0) {
            const message = state.textScreenMessages.join('\n');
            _alert(message);
            state.textScreenMessages = [];
        }
    },

    agi_show_obj: (objNo) => {
        console.log('agi_show_obj');
    },

    agi_show_obj_v: (varNo) => {
        console.log('agi_show_obj_v');
    },

    agi_get: (itemNo) => {
        // http://agi.sierrahelp.com/AGIStudioHelp/Logic/InventoryItemCommands/get.html
        state.items[itemNo] = 255;
    },

    agi_get_v: (vItem) => {
        commands.agi_get(state.variables[vItem]);
    },

    agi_discard_sound: (soundNo) => {
        state.loadedSounds[soundNo] = null;
    },

    agi_save_game:    saveNextCycle,
    agi_restore_game: restoreNextCycle,
    agi_restart_game: restart,

    agi_quit: (n1) => {
        state.hasQuit = true;
        state.soundEmulator.deactivate();
        document.body.innerHTML = '';
    },

    agi_pause: () => {
        state.hasPaused = !state.hasPaused;
    },

    agi_toggle_monitor: () => {

    },

    agi_init_joy: () => {

    },

    agi_version: () => {

    },

    agi_echo_line: () => {

    },

    agi_cancel_line: () => {

    },

    agi_open_dialogue: () => {
        state.dialogue = true;
    },

    agi_close_dialogue: () => {
        state.dialogue = false;
    },

    agi_get_string: (strNo, msg, x, y, maxLen) => {
        state.dialogueStrNo  = strNo;
        state.dialoguePrompt = msg;
        state.dialogueStrX   = x;
        state.dialogueStrY   = y;
        state.dialogueStrLen = maxLen;
        state.dialogueMode   = 1;

        // Ask user for a string
        const result = prompt(
            [...state.textScreenMessages, '', commands._agi_get_message(msg)].join('\n')
        );

        if (result) {
            state.strings[strNo] = result.substring(0, maxLen);
            commands.agi_set(FLAG.input_received);
            commands.agi_set(FLAG.input_parsed);
        }

        state.textScreenMessages = [];
    },

    agi_parse: (strNo) => {
        // LLL('agi_parse');
    },

    agi_print: (msgNo) => {
        _alert(commands._agi_get_message(msgNo));
    },

    agi_print_v: (varNo) => {
        commands.agi_print(state.variables[varNo]);
    },

    // http://agi.sierrahelp.com/AGIStudioHelp/Logic/DisplayCommands/set.text.attribute.html
    agi_set_text_attribute: (textFG, textBG) => {
        LLL('agi_set_text_attribute');
        state.textBG = textBG;

        if (textBG === 15) {
            state.textFG = 0;
        } else {
            state.textFG = textFG
            state.textBG = 0;
        }
    },

    /* Handled by Logic.parseLogic

    agi_set_scan_start,
    agi_reset_scan_start,

     */

    agi_close_window: () => {

    },

    agi_get_num: (mPROMPT, vNUM) => {
        // http://agi.sierrahelp.com/AGIStudioHelp/Logic/MathematicalCommands/get.num.html
        const choice          = prompt(commands._agi_get_message(mPROMPT), '0');
        state.variables[vNUM] = parseFloat(choice || '0');
    },

    /* Tests */
    agi_test_equaln: (varNo, val) => {
        return state.variables[varNo] == val;
    },

    agi_test_equalv: (varNo1, varNo2) => {
        return commands.agi_test_equaln(varNo1, state.variables[varNo2]);
    },

    agi_test_lessn: (varNo, val) => {
        return state.variables[varNo] < val;
    },

    agi_test_lessv: (varNo1, varNo2) => {
        return commands.agi_test_lessn(varNo1, state.variables[varNo2]);
    },

    agi_test_greatern: (varNo, val) => {
        return state.variables[varNo] > val;
    },

    agi_test_greaterv: (varNo1, varNo2) => {
        return commands.agi_test_greatern(varNo1, state.variables[varNo2]);
    },

    agi_test_isset: (flagNo) => {
        return state.flags[flagNo];
    },

    agi_test_issetv: (varNo) => {
        return commands.agi_test_isset(state.variables[varNo]);
    },

    agi_test_has: (itemNo) => {
        return state.items[itemNo] === 255;
    },

    agi_test_obj_in_room: (itemNo, varNo) => {
        return state.items[itemNo] === state.variables[varNo];
    },

    agi_test_posn: (objNo, x1, y1, x2, y2) => {
        const obj = state.gameObjects[objNo];
        return obj.x >= x1 && obj.x <= x2 && obj.y >= y1 && obj.y <= y2;
    },

    agi_test_right_posn: (objNo, x1, y1, x2, y2) => {
        const obj      = state.gameObjects[objNo];
        const view     = state.loadedViews[obj.viewNo];
        const celWidth = view.loops[obj.loop].cels[obj.cel].width;

        const rightPosn = obj.x + celWidth;

        return rightPosn >= x1 && rightPosn <= x2 && obj.y >= y1 && obj.y <= y2;
    },

    agi_test_center_posn: (objNo, x1, y1, x2, y2) => {
        const obj      = state.gameObjects[objNo];
        const view     = state.loadedViews[obj.viewNo];
        const celWidth = view.loops[obj.loop].cels[obj.cel].width;

        const centerPosn = obj.x + celWidth >> 1;

        return centerPosn >= x1 && centerPosn <= x2 && obj.y >= y1 && obj.y <= y2;
    },

    agi_test_controller: (ctrNo) => {
        return state.controllers[ctrNo] > 0;
    },

    agi_test_have_key: () => {
        const haveKey = state.haveKey;
        state.haveKey = false;
        return haveKey;
    },

    agi_test_said: (...testWordGroups) => {
        const indicesString = testWordGroups.join(',');

        if (state.playerSaid.length > 0) {
            return indicesString === state.playerSaid;
        }

        // Make sure we can see what the options are
        const key           = testWordGroups.map(iWG => wordGroups[iWG][0]).join(' ');
        state.testSaid[key] = indicesString;

        return false;
    },

    agi_test_compare_strings: (strNo1, strNo2) => {
        return state.strings[strNo1] == state.strings[strNo2];
    },

    agi_test_obj_in_box: (oA, X1, Y1, X2, Y2) => {
        return (
            state.gameObjects[oA].x <= X2 &&
            state.gameObjects[oA].x >= X1 &&
            state.gameObjects[oA].y <= Y2 &&
            state.gameObjects[oA].y <= Y1
        );
    },

    agi_distance: (objNo1, objNo2, varNo) => {
        const obj1 = state.gameObjects[objNo1];
        const obj2 = state.gameObjects[objNo2];
        if (obj1 != null && obj2 != null && obj1.draw && obj2.draw) {
            state.variables[varNo] = Math.abs(obj1.x - obj2.x) + Math.abs(obj1.y - obj2.y);
        } else {
            state.variables[varNo] = 255;
        }
    },

    agi_object_on_water: (oA) => {
        const obj          = state.gameObjects[oA];
        obj.allowedOnWater = true;
        obj.allowedOnLand  = false;
    },

    agi_object_on_land: (oA) => {
        const obj          = state.gameObjects[oA];
        obj.allowedOnWater = false;
        obj.allowedOnLand  = true;
    },

    agi_object_on_anything: (oA) => {
        const obj          = state.gameObjects[oA];
        obj.allowedOnWater = true;
        obj.allowedOnLand  = true;
    },
};
