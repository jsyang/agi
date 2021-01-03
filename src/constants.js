export const DECRYPTION_KEY = "Avis Durgan";

export const palette = [
    0x000000,   // BLACK
    0x0000AA,   // DARK BLUE
    0x00AA00,   // DARK GREEN
    0x00AAAA,   // DARK CYAN
    0xAA0000,   // DARK RED
    0xAA00AA,   // DARK MAGENTA
    0xAA5500,   // DARK BROWN
    0xAAAAAA,   // GRAY
    0x555555,   // DARK GRAY
    0x5555FF,   // BLUE
    0x55FF55,   // GREEN
    0x55FFFF,   // CYAN
    0xFF5555,   // RED
    0xFF55FF,   // MAGENTA
    0xFFFF55,   // YELLOW
    0xFFFFFF    // WHITE
];

export const FLAG = {
    ego_on_water:             0,
    ego_hidden:               1,
    input_received:           2,
    ego_touching_signal_line: 3,
    input_parsed:             4,
    new_room:                 5,
    game_restarted:           6,
    script_buffer_blocked:    7,
    joystick_sensitivity_set: 8,
    sound_on:                 9,
    trace_enabled:            10,
    noise_enabled:            11,
    game_restored:            12,
    inventory_select_enabled: 13,
    menu_enabled:             14,
    windows_remain:           15,
    auto_restart:             16,
    auto_loop:                20
};

// http://agi.sierrahelp.com/AGIStudioHelp/Logic/SpecialVariables.html
export const VAR = {
    room_no:                 0,
    prev_room_no:            1,
    ego_edge_code:           2,
    score:                   3,
    object_touching_edge:    4,
    object_edge_code:        5,
    ego_dir:                 6,
    max_score:               7,
    free_memory:             8,
    unknown_word_no:         9,
    cycle_delay:             10,
    clock_seconds:           11,
    clock_minutes:           12,
    clock_hours:             13,
    clock_days:              14,
    joystick_sensitivity:    15,
    ego_view_no:             16,
    error_code:              17,
    error_information:       18,
    key_pressed:             19,
    computer_type:           20,
    window_close_time:       21,
    sound_channels:          22,
    sound_volume:            23,
    max_input_len:           24,
    selected_inventory_item: 25,
    video_mode:              26
};

export const GAMEOBJECT_MOVE_FLAGS = {
    Normal:   0,
    ChaseEgo: 1,
    Wander:   2,
    MoveTo:   3
};

export const GAMEOBJECT_DIRECTION = {
    Stopped:   0,
    Up:        1,
    UpRight:   2,
    Right:     3,
    DownRight: 4,
    Down:      5,
    DownLeft:  6,
    Left:      7,
    UpLeft:    8
};

export const LOGIC_TESTS = [
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

export const LOGIC_ACTIONS = [
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

export const AGI_RESOURCE_TYPE = {
    LOGIC: 0,
    PIC:   1,
    VIEW:  2,
    SOUND: 3
};

// http://agi.sierrahelp.com/AGIStudioHelp/Picture/Priorities.html
export const GAMEOBJECT_MAX_Y = 167;

export const MAX_GAMEOBJECTS = 16;

// Corresponds to palette
export const GAMEOBJECT_PRIORITY = {
    UNCONDITIONAL_BARRIER: 0,   // BLACK
    CONDITIONAL_BARRIER:   1,   // DARK BLUE
    SIGNAL:                2,   // DARK GREEN
    WATER:                 3,   // DARK GREEN
    TOP:                   15,  // WHITE
};

export const NCODE_F1  = 59;
export const NCODE_F10 = 68;
