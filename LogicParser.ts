namespace Agi {
    interface IStatement {
        (...args: number[]): void;
    }

    interface ITest {
        (...args: number[]): boolean;
    }

    export class LogicParser {
        logic: Logic;
        scanStart: number;
        run: Function                 = new Function();
        private decryptionKey: string = "Avis Durgan";
        private entryPoint: number;
        private gotoTable: any        = [];
        private messagesStartOffset: number;
        static tests: string[]        = [
            "equaln",
            "equalv",
            "lessn",
            "lessv",
            "greatern",
            "greaterv",
            "isset",
            "issetv",
            "has",
            "obj_in_room",
            "posn",
            "controller",
            "have_key",
            "said",
            "compare_strings",
            "obj_in_box",
            "center_posn",
            "right_posn"
        ];
        static statements: string[]   = [
            "return",
            "increment",
            "decrement",
            "assignn",
            "assignv",
            "addn",
            "addv",
            "subn",
            "subv",
            "lindirectv",
            "rindirect",
            "lindirectn",
            "set",
            "reset",
            "toggle",
            "set_v",
            "reset_v",
            "toggle_v",
            "new_room",
            "new_room_v",
            "load_logic",
            "load_logic_v",
            "call",
            "call_v",
            "load_pic",
            "draw_pic",
            "show_pic",
            "discard_pic",
            "overlay_pic",
            "show_pri_screen",
            "load_view",
            "load_view_v",
            "discard_view",
            "animate_obj",
            "unanimate_all",
            "draw",
            "erase",
            "position",
            "position_v",
            "get_posn",
            "reposition",
            "set_view",
            "set_view_v",
            "set_loop",
            "set_loop_v",
            "fix_loop",
            "release_loop",
            "set_cel",
            "set_cel_v",
            "last_cel",
            "current_cel",
            "current_loop",
            "current_view",
            "number_of_loops",
            "set_priority",
            "set_priority_v",
            "release_priority",
            "get_priority",
            "stop_update",
            "start_update",
            "force_update",
            "ignore_horizon",
            "observe_horizon",
            "set_horizon",
            "object_on_water",
            "object_on_land",
            "object_on_anything",
            "ignore_objs",
            "observe_objs",
            "distance",
            "stop_cycling",
            "start_cycling",
            "normal_cycle",
            "end_of_loop",
            "reverse_cycle",
            "reverse_loop",
            "cycle_time",
            "stop_motion",
            "start_motion",
            "step_size",
            "step_time",
            "move_obj",
            "move_obj_v",
            "follow_ego",
            "wander",
            "normal_motion",
            "set_dir",
            "get_dir",
            "ignore_blocks",
            "observe_blocks",
            "block",
            "unblock",
            "get",
            "get_v",
            "drop",
            "put",
            "put_v",
            "get_room_v",
            "load_sound",
            "sound",
            "stop_sound",
            "print",
            "print_v",
            "display",
            "display_v",
            "clear_lines",
            "text_screen",
            "graphics",
            "set_cursor_char",
            "set_text_attribute",
            "shake_screen",
            "configure_screen",
            "status_line_on",
            "status_line_off",
            "set_string",
            "get_string",
            "word_to_string",
            "parse",
            "get_num",
            "prevent_input",
            "accept_input",
            "set_key",
            "add_to_pic",
            "add_to_pic_v",
            "status",
            "save_game",
            "restore_game",
            "init_disk",
            "restart_game",
            "show_obj",
            "random",
            "program_control",
            "player_control",
            "obj_status_v",
            "quit",
            "show_mem",
            "pause",
            "echo_line",
            "cancel_line",
            "init_joy",
            "toggle_monitor",
            "version",
            "script_size",
            "set_game_id",
            "log",
            "set_scan_start",
            "reset_scan_start",
            "reposition_to",
            "reposition_to_v",
            "trace_on",
            "trace_info",
            "print_at",
            "print_at_v",
            "discard_view_v",
            "clear_text_rect",
            "set_upper_left",
            "set_menu",
            "set_menu_member",
            "submit_menu",
            "enable_member",
            "disable_member",
            "menu_input",
            "show_obj_v",
            "open_dialogue",
            "close_dialogue",
            "mul_n",
            "mul_v",
            "div_n",
            "div_v",
            "close_window",
            "set_simple",
            "push_script",
            "pop_script",
            "hold_key",
            "set_pri_base",
            "discard_sound",
            "hide_mouse",
            "allow_menu",
            "show_mouse",
            "fence_mouse",
            "mouse_posn",
            "release_key",
            "adj_ego_move_to_xy"
        ];

        constructor(private interpreter: Interpreter, private no: number) {
            this.loadLogic(no);
        }

        private readUint8(): number {
            return this.logic.data.readUint8();
        }

        private readUint16(): number {
            return this.logic.data.readUint16();
        }

        private readInt16(): number {
            return this.logic.data.readInt16();
        }

        loadLogic(no: number): string {
            this.logic                  = new Logic(no, Resources.readAgiResource(Resources.AgiResource.Logic, no));
            var messageOffset: number   = this.readUint16();
            this.logic.data.position += messageOffset;
            var pos                     = this.logic.data.position;
            this.messagesStartOffset    = pos;
            var numMessages: number     = this.readUint8();
            var ptrMessagesEnd: number  = this.readUint16();
            var decryptionIndex: number = 0;
            for (var i = 0; i < numMessages; i++) {
                var msgPtr: number = this.readUint16();
                if (msgPtr == 0)
                    continue;
                var mpos                 = this.logic.data.position;
                this.logic.data.position = pos + msgPtr + 1;
                var msg: string          = "";
                while (true) {
                    var decrypted: string = String.fromCharCode(this.decryptionKey[decryptionIndex++].charCodeAt(0) ^ this.readUint8());
                    if (decryptionIndex >= this.decryptionKey.length)
                        decryptionIndex = 0;
                    if (decrypted == '\0')
                        break;
                    msg += decrypted;
                }
                this.logic.messages[i + 1] = msg;
                this.logic.data.position   = mpos;
            }
            this.logic.data.position = pos - messageOffset;
            this.scanStart           = this.entryPoint = this.logic.data.position;

            return `
                EMSCRIPTEN_KEEPALIVE
                void logic${this.logic.no}() {
                    ${this.decompile()}
                }
            `;
        }

        decompile(): string {
            this._decompile(true);
            return this._decompile();
        }

        _decompile(shouldAddLabels = false, stopPosition = this.messagesStartOffset): string {
            // Start from beginning
            this.logic.data.position = this.entryPoint;

            let code                                         = '\n';
            let isInsideConditional                          = false;
            let conditionalExpression                        = [];
            let conditionalStatementBlockOffsets: number[][] = [];
            let elseStatementBlockOffsets: number[][]        = [];
            let isNotExpression                              = false;
            let isOrExpression                               = false;

            const countIndentations = () => conditionalStatementBlockOffsets.concat(elseStatementBlockOffsets).reduce(
                (prev, curr) => {
                    if (this.logic.data.position - 1 >= curr[0] && this.logic.data.position - 1 <= curr[1]) {
                        return prev + 1;
                    }

                    return prev;
                }, 0);

            // How many block terminations should we have
            const getBlockTerminations = () => conditionalStatementBlockOffsets.concat(elseStatementBlockOffsets).reduce((prev, curr) => {
                if (this.logic.data.position - 1 === curr[1]) {
                    return prev + 1;
                }

                return prev;
            }, 0);

            const isNextInsideElse = () => elseStatementBlockOffsets.some(blockInfo => {
                return this.logic.data.position >= blockInfo[0] && this.logic.data.position <= blockInfo[1];
            });

            while (this.logic.data.position < stopPosition) {
                let willBeInsideConditional = false;
                let codeLine                = '';

                this.gotoTable.forEach(label => {
                    if (this.logic.data.position === label[1]) {
                        codeLine += `${label[0]}:\n`;
                    }
                });

                let opCodeNr: number = this.readUint8();
                switch (opCodeNr) {
                    case 0x00: // return
                        codeLine += '  '.repeat(countIndentations());
                        codeLine += 'return;';
                        break;
                    case 0xFF: // if / endif
                        if (isInsideConditional) {

                            isInsideConditional = false;

                            codeLine += '  '.repeat(countIndentations());
                            codeLine += 'if (' + conditionalExpression.join(' && ') + ') {\n';
                            conditionalExpression = [];

                            // -3 due to https://wiki.scummvm.org/index.php/AGI/Specifications/Resources#The_else_command_and_more_on_brackets
                            let standaloneIfStart       = this.logic.data.position + 2;
                            let standaloneIfBlockLength = this.readUint16();

                            const ifStart = standaloneIfStart;
                            const ifEnd   = standaloneIfBlockLength + standaloneIfStart - 1;
                            conditionalStatementBlockOffsets.push([ifStart, ifEnd]);

                        } else {
                            willBeInsideConditional = true;
                        }
                        break;
                    case 0xFD: // not
                        isNotExpression = true;
                        break;

                    case 0xFC: // or
                        if (isOrExpression) {
                            const orStart = conditionalExpression.lastIndexOf('OR') + 1;
                            const orBody  = conditionalExpression.slice(orStart).join(' || ');

                            conditionalExpression = conditionalExpression.slice(0, orStart - 1);
                            conditionalExpression.push(`(${orBody})`);
                            isOrExpression = false;

                        } else {
                            conditionalExpression.push('OR');
                            isOrExpression = true;
                        }
                        break;
                    case 0xFE: // goto / ELSE (very careful here)
                        const labelAddress = this.readInt16();
                        codeLine += '  '.repeat(countIndentations() - 1);

                        if (shouldAddLabels) {
                            this.gotoTable.push([`Label${this.gotoTable.length + 1}`, this.logic.data.position + labelAddress]);
                            codeLine += `goto ${labelAddress};\n`;
                        } else {
                            const labelName = this.gotoTable.find(label => label[1] === this.logic.data.position + labelAddress)[0];
                            codeLine += `goto ${labelName};\n`;
                        }

                        break;
                    default:
                        if (isInsideConditional) { // Use test commands
                            const funcName = LogicParser.tests[opCodeNr - 1];
                            const testFunc = <ITest>this.interpreter["agi_test_" + funcName];
                            if (testFunc === undefined) {
                                console.log(code);
                                throw `Test not implemented: ${funcName} [0x${opCodeNr.toString(16)}]`;
                            }

                            const testFuncArgs = [];
                            let argLen         = testFunc.length; // How many arguments for this testFunc

                            if (opCodeNr === 0x0E) { // `said`
                                argLen = this.readUint8();
                                for (let i = 0; i < argLen; i++) {
                                    testFuncArgs.push(this.readUint16());
                                }
                            } else {
                                for (let i = 0; i < argLen; i++) {
                                    testFuncArgs.push(this.readUint8());
                                }
                            }

                            if (isNotExpression) {
                                conditionalExpression.push(`!EM_ASM_INT({ return Agi.interpreter['agi_test_${funcName}'](${testFuncArgs.join(',')}); })`);
                                isNotExpression = false;
                            } else {
                                conditionalExpression.push(`EM_ASM_INT({ return Agi.interpreter['agi_test_${funcName}'](${testFuncArgs.join(',')}); })`);
                            }
                        } else { // Use AGI command statements
                            const funcName = LogicParser.statements[opCodeNr] || 'UNKNOWN';
                            let actionFunc = <IStatement>this.interpreter["agi_" + funcName];
                            if (actionFunc === undefined) {
                                throw `Action not implemented: ${funcName} [0x${opCodeNr.toString(16)}]`;
                            }

                            const actionFuncArgs = [];
                            for (let i = 0; i < actionFunc.length; i++) {
                                actionFuncArgs.push(this.readUint8());
                            }

                            codeLine += '  '.repeat(countIndentations());
                            codeLine += `EM_ASM_INT({ return Agi.interpreter['agi_${funcName}'](${actionFuncArgs.join(',')}); });\n`;
                        }
                        break;
                }

                if (!isInsideConditional) {
                    let blockTerminations = getBlockTerminations();

                    if (isNextInsideElse()) {
                        blockTerminations--;
                    }

                    for (let i = blockTerminations; i-- > 0;) {
                        codeLine += '  '.repeat(countIndentations() - (blockTerminations - i) + 1);
                        codeLine += '}\n';
                    }
                }

                code += codeLine;

                if (willBeInsideConditional) {
                    isInsideConditional = true;
                }
            }

            return code;
        }

        showHex(stopPosition = this.messagesStartOffset, maxPerRow = 10): string {
            let hex                  = '';
            this.logic.data.position = this.entryPoint;
            let col                  = 0;
            while (this.logic.data.position < stopPosition) {
                if (col === maxPerRow) {
                    hex += '\n';
                    col = 0;
                }

                let BB = this.readUint8().toString(16).toUpperCase();

                if (BB.length === 1) {
                    BB = '0' + BB;
                }

                hex += BB + '  ';
                col++;

            }

            return hex;
        }
    }
}
