﻿namespace Agi {
    interface IStatement {
        (...args: number[]): void;
    }

    interface ITest {
        (...args: number[]): boolean;
    }

    export class LogicParser {
        logic: Logic;
        scanStart: number;
        private decryptionKey: string = "Avis Durgan";
        private entryPoint: number;
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

        private jumpRelative(offset: number): void {
            this.logic.data.position += offset;
        }

        loadLogic(no: number): void {
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
        }

        parseLogic(): void {
            var orMode: boolean     = false;
            var invertMode: boolean = false;
            var testMode: boolean   = false;
            var testResult: boolean = true;
            var debugLine: string   = "";
            var orResult: boolean   = false;
            var funcName: string;
            var test: ITest;
            var statement: IStatement;
            var args: number[];

            this.logic.data.position = this.scanStart;
            while (true) {
                var opCodeNr: number = this.readUint8();
                if (opCodeNr == 0x00) {
                    break;
                } else if (opCodeNr == 0x91) {
                    // set.scan.start
                    this.scanStart = this.logic.data.position + 1;
                } else if (opCodeNr == 0x92) {
                    // reset.scan.start
                    this.scanStart = this.entryPoint;
                } else if (opCodeNr == 0xFE) {
                    // GOTO block (not else!)
                    var n1: number     = this.readUint8();
                    var n2: number     = this.readUint8();
                    var offset: number = (((n2 << 8) | n1) << 16) >> 16;
                    this.jumpRelative(offset);
                } else if (opCodeNr == 0xFF) {
                    if (testMode) {
                        testMode = false;

                        // -3 due to https://wiki.scummvm.org/index.php/AGI/Specifications/Resources#The_else_command_and_more_on_brackets
                        var possibleElseOffset: number = this.readUint16() - 3;

                        // Evaluate last test
                        if (testResult != true) {
                            this.jumpRelative(possibleElseOffset);

                            if (this.readUint8() === 0xFE) {
                                // This was an ELSE!
                                this.readUint16();
                            } else {
                                // Just a standalone IF
                                this.jumpRelative(-1); // undo uint8 read
                                this.jumpRelative(-possibleElseOffset); // undo jumprel
                                this.jumpRelative(-2); // undo uint16 read
                                this.jumpRelative(this.readUint16());
                            }
                        }
                    } else {
                        debugLine  = "if(";
                        invertMode = false;
                        orMode     = false;
                        testResult = true;
                        orResult   = false;
                        testMode   = true;
                    }
                } else if (testMode) {
                    if (opCodeNr == 0xFC) {
                        orMode = !orMode;
                        if (orMode === true) {
                            orResult = false;
                        } else {
                            testResult = testResult && orResult;
                        }
                    } else if (opCodeNr == 0xFD) {
                        invertMode = !invertMode;
                    } else {
                        funcName           = LogicParser.tests[opCodeNr - 1];
                        test               = <ITest>this.interpreter["agi_test_" + funcName];
                        args               = [];
                        var argLen: number = test.length;
                        if (opCodeNr == 0x0E) { // Said, variable nr of arguments
                            argLen = this.readUint8();
                            for (var i = 0; i < argLen; i++) {
                                args.push(this.readUint16());
                            }
                        } else {
                            for (var i = 0; i < argLen; i++) {
                                args.push(this.readUint8());
                            }
                        }
                        var result = test.apply(this.interpreter, args);
                        if (testResult == null) {
                            debugLine += funcName;
                        } else {
                            debugLine += (orMode ? " || " : " && ") + funcName;
                        }
                        if (invertMode) {
                            result     = !result;
                            invertMode = false;
                        }

                        if (orMode) {
                            orResult = orResult || result;
                        } else {
                            testResult = testResult && result;
                        }
                    }
                } else {
                    funcName  = LogicParser.statements[opCodeNr];
                    statement = <IStatement>this.interpreter["agi_" + funcName];
                    if (statement === undefined) {
                        throw `Statement not implemented: ${funcName} [${opCodeNr}]`;
                    }

                    args = [];
                    for (var i = 0; i < statement.length; i++) {
                        args.push(this.readUint8());
                    }
                    statement.apply(this.interpreter, args);
                    if (opCodeNr == 0x12) // new.room
                    {
                        this.logic.data.position = 0;
                        break;
                    }
                }
            }
        }
    }
}
