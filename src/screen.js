import {getFontStream} from './resources';
import {BITMAP_HEIGHT, BITMAP_WIDTH} from './bitmap';
import {GAMEOBJECT_PRIORITY, palette, SCREEN_HEIGHT_PIXELS, SCREEN_WIDTH_PIXELS} from './constants';
import {state} from './state';

let fontStream;

function clearTextRect(y1, x1, y2, x2, color) {
    color      = palette[color];
    const data = state.frameData.data;

    for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
            for (let i = -7; i <= 0; i++) {
                for (let j = 0; j < 8; j++) {
                    const index         = ((y * 8) + i) * SCREEN_WIDTH_PIXELS + ((x * 8) + j);
                    data[index * 4]     = color;
                    data[index * 4 + 1] = color;
                    data[index * 4 + 2] = color;
                    data[index * 4 + 3] = 0xFF;
                }
            }
        }
    }
}

const sRegex = /%s(\d+)/; // "%s123" string regex

function bltText(row = 0, col = 0, text = '') {
    let regexResult;
    while ((regexResult = sRegex.exec(text)) !== null) {
        text = text.slice(0, regexResult.index) + state.strings[parseInt(regexResult[1])] + text.slice(regexResult.index + regexResult.length + 1);
    }

    let textBGColor;
    let textFGColor;
    //http://agi.sierrahelp.com/AGIStudioHelp/Logic/DisplayCommands/set.text.attribute.html
    // The background color can only be black (if BG is 0)
    // or white (if BG is greater than 0). If the background
    // is white, all text will be displayed with a black
    // foreground. Otherwise, the text will be displayed
    // with the foreground specified by FG (0-15).
    if (state.textBG === 15) {
        textBGColor = palette[15]; // White BG
        textFGColor = palette[0] // Black FG
    } else {
        textBGColor = 0x00; // Black BG
        textFGColor = palette[state.textFG] // Color FG
    }

    for (let i = 0; i < text.length; i++) {
        const chr = text[i].charCodeAt(0);
        if (chr === 10) {
            row++;
            col = 0;
            continue;
        }
        fontStream.position = chr * 8;

        const data = state.frameData.data;
        for (let y = -7; y <= 0; y++) {
            let colData = fontStream.readUint8();
            for (let x = 0; x < 8; x++) {
                let color;

                if ((colData & 0x80) === 0x80) {
                    color = textFGColor; // Black FG
                } else {
                    color = textBGColor; // White BG
                }

                const index         = (row * 8 + y) * 320 + (col * 8 + x);
                data[index * 4]     = color;
                data[index * 4 + 1] = color;
                data[index * 4 + 2] = color;
                data[index * 4 + 3] = 0xFF;
                colData             = colData << 1;
            }
        }

        col++;
        if (col >= 40) {
            col = 0;
            row++;
        }
    }
}

export function bltPic() {
    const {data}        = state.frameData;
    const {data: _data} = state.debugFrameData;
    for (let k = 0; k < BITMAP_HEIGHT * BITMAP_WIDTH; k++) {
        let rgb;
        state.framePriorityData.data[k] = state.visualPriorityBuffer.data[k];

        rgb             = palette[state.visualBuffer.data[k]];
        data[k * 8]     = (rgb >>> 16) & 0xFF;
        data[k * 8 + 1] = (rgb >>> 8) & 0xFF;
        data[k * 8 + 2] = rgb & 0xFF;
        data[k * 8 + 3] = 255;
        data[k * 8 + 4] = (rgb >>> 16) & 0xFF;
        data[k * 8 + 5] = (rgb >>> 8) & 0xFF;
        data[k * 8 + 6] = rgb & 0xFF;
        data[k * 8 + 7] = 255;

        rgb              = palette[state.visualPriorityBuffer.data[k]];
        _data[k * 8]     = (rgb >>> 16) & 0xFF;
        _data[k * 8 + 1] = (rgb >>> 8) & 0xFF;
        _data[k * 8 + 2] = rgb & 0xFF;
        _data[k * 8 + 3] = 255;
        _data[k * 8 + 4] = (rgb >>> 16) & 0xFF;
        _data[k * 8 + 5] = (rgb >>> 8) & 0xFF;
        _data[k * 8 + 6] = rgb & 0xFF;
        _data[k * 8 + 7] = 255;
    }
}

export function clearView(viewNo, loopNo, celNo, x, y, priority) {
    // Don't try clearing if the view doesn't exist
    const view = state.loadedViews[viewNo];
    if (!view) return;
    const loop = view.loops[loopNo];
    if (!loop) return;

    let cel = loop.cels[celNo];
    if (!cel) return;

    // If the view has more loops then we have to ignore the original mirror option and use
    // basic mirroring.
    let shouldMirror = false;

    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
        shouldMirror = view.loops.length >= 4;
    }

    const {data} = state.frameData;
    for (let cy = 0; cy < cel.height; cy++) {
        if (cy + y >= 200) {
            break;
        }

        for (let cx = 0; cx < cel.width; cx++) {
            if (cx + x >= 160) {
                break;
            }

            const idx                   = (cy + y + 1 - cel.height) * 160 + (cx + x);
            const existingFramePriority = state.framePriorityData.data[idx]
            if (priority < existingFramePriority) {
                continue;
            }

            let ccx = cx;
            if (shouldMirror) {
                ccx = cel.width - cx - 1;
            }

            let color;
            color = cel.pixelData[cy * cel.width + ccx];
            if (color === cel.transparentColor) {
                continue;
            }

            color = state.visualBuffer.data[idx];

            state.framePriorityData.data[idx] = state.visualPriorityBuffer.data[idx];

            const rgb         = palette[color];
            data[idx * 8]     = (rgb >>> 16) & 0xFF;
            data[idx * 8 + 1] = (rgb >>> 8) & 0xFF;
            data[idx * 8 + 2] = rgb & 0xFF;
            data[idx * 8 + 3] = 255;
            data[idx * 8 + 4] = (rgb >>> 16) & 0xFF;
            data[idx * 8 + 5] = (rgb >>> 8) & 0xFF;
            data[idx * 8 + 6] = rgb & 0xFF;
            data[idx * 8 + 7] = 255;
        }
    }
}

export function bltView(viewNo, loopNo, celNo, x, y, priority) {
    const view = state.loadedViews[viewNo];
    let cel    = view.loops[loopNo].cels[celNo];

    if (!cel) return;

    // If the view has more loops then we have to ignore the original mirror option and use
    // basic mirroring.
    let shouldMirror = false;

    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
        shouldMirror = view.loops.length >= 4;
    }

    const {data} = state.frameData;
    for (let cy = 0; cy < cel.height; cy++) {
        if (cy + y - cel.height >= 200) {
            break;
        }

        for (let cx = 0; cx < cel.width; cx++) {
            if (cx + x >= 160) {
                break;
            }

            const idx                   = (cy + y + 1 - cel.height) * 160 + (cx + x);
            const existingFramePriority = state.framePriorityData.data[idx];
            if (priority < existingFramePriority) {
                continue;
            }

            let ccx = cx;
            if (shouldMirror) {
                ccx = cel.width - cx - 1;
            }

            const color = cel.pixelData[cy * cel.width + ccx];
            if (color === cel.transparentColor) {
                continue;
            }

            state.framePriorityData.data[idx] = priority;

            let rgb;

            rgb = palette[color];

            data[idx * 8]     = (rgb >>> 16) & 0xFF;
            data[idx * 8 + 1] = (rgb >>> 8) & 0xFF;
            data[idx * 8 + 2] = rgb & 0xFF;
            data[idx * 8 + 3] = 255;
            data[idx * 8 + 4] = (rgb >>> 16) & 0xFF;
            data[idx * 8 + 5] = (rgb >>> 8) & 0xFF;
            data[idx * 8 + 6] = rgb & 0xFF;
            data[idx * 8 + 7] = 255;
        }
    }
}

export function bltViewToPic(viewNo, loopNo, celNo, x, y, priority, margin) {
    const view   = state.loadedViews[viewNo];
    let cel      = view.loops[loopNo].cels[celNo];
    const mirror = cel.mirrored;
    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
    }

    // Ensure no part of the view is occluded
    // https://wiki.scummvm.org/index.php?title=AGIWiki/add.to.pic
    if (y < cel.height) {
        y = cel.height;
    } else if (y > SCREEN_HEIGHT_PIXELS) {
        y = SCREEN_HEIGHT_PIXELS;
    }

    if (y < cel.height) {
        y = cel.height;
    } else if (y > SCREEN_HEIGHT_PIXELS) {
        y = SCREEN_HEIGHT_PIXELS;
    }

    const {data}        = state.visualBuffer;
    const {data: _data} = state.frameData;

    for (let cy = 0; cy < cel.height; cy++) {
        if (cy + y - cel.height >= 200) {
            break;
        }

        for (let cx = 0; cx < cel.width; cx++) {
            if (cx + x >= 160) {
                break;
            }

            const idx = (cy + y + 1 - cel.height) * 160 + (cx + x);

            let ccx = cx;
            if (mirror) {
                ccx = cel.width - cx - 1;
            }

            const color = cel.pixelData[cy * cel.width + ccx];
            if (color === cel.transparentColor) {
                continue;
            }

            // http://agi.sierrahelp.com/AGIStudioHelp/Logic/ObjectViewCommands/add.to.pic.html
            // If MARGIN is 0, 1, 2 or 3, the base line of the object (the bottom row of pixels of the cel) is given a priority of MARGIN.
            if (cy === cel.height - 1) {
                if (margin <= GAMEOBJECT_PRIORITY.WATER) {
                    state.priorityBuffer.data[idx] = margin;
                }
            }

            state.visualPriorityBuffer.data[idx] = priority;
            state.framePriorityData.data[idx]    = priority;

            const rgb = palette[color];
            data[idx] = color;

            _data[idx * 8]     = (rgb >>> 16) & 0xFF;
            _data[idx * 8 + 1] = (rgb >>> 8) & 0xFF;
            _data[idx * 8 + 2] = rgb & 0xFF;
            _data[idx * 8 + 3] = 255;
            _data[idx * 8 + 4] = (rgb >>> 16) & 0xFF;
            _data[idx * 8 + 5] = (rgb >>> 8) & 0xFF;
            _data[idx * 8 + 6] = rgb & 0xFF;
            _data[idx * 8 + 7] = 255;
        }
    }
}


export function clearOldObjectView(obj) {
    clearView(obj.oldView, obj.oldLoop, obj.oldCel, obj.oldDrawX, obj.oldDrawY, obj.oldPriority);
}

export function drawObject(obj) {
    clearOldObjectView(obj);
    bltView(obj.viewNo, obj.loop, obj.cel, obj.x, obj.y, obj.priority);

    obj.oldDrawX    = obj.x;
    obj.oldDrawY    = obj.y;
    obj.oldView     = obj.viewNo;
    obj.oldLoop     = obj.loop;
    obj.oldCel      = obj.cel;
    obj.oldPriority = obj.priority;
}

export const init = () => {
    fontStream = getFontStream();

    for (let i = 320 * 200; i-- > 0;) {
        state.frameData.data[i * 4]     = 0;
        state.frameData.data[i * 4 + 1] = 0;
        state.frameData.data[i * 4 + 2] = 0;
        state.frameData.data[i * 4 + 3] = 0xFF;

        state.debugFrameData.data[i * 4]     = 0;
        state.debugFrameData.data[i * 4 + 1] = 0;
        state.debugFrameData.data[i * 4 + 2] = 0;
        state.debugFrameData.data[i * 4 + 3] = 0xFF;
    }
};

export default {
    init,
    bltText,
    bltPic,
    bltView,
    bltViewToPic,
    drawObject,
    clearView,
    clearTextRect,
    clearOldObjectView,
};
