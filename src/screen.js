import {getFontStream} from './resources';
import {BITMAP_HEIGHT, BITMAP_WIDTH} from './bitmap';
import {GAMEOBJECT_PRIORITY, palette} from './constants';

let interpreterState;
let fontStream;

const sRegex = /\%s(\d+)/; // "%s123" string regex

export function bltText(row = 0, col = 0, text = '', colorNo = 0) {
    let regexResult;
    while ((regexResult = sRegex.exec(text)) !== null) {
        text = text.slice(0, regexResult.index) + interpreterState.strings[parseInt(regexResult[1])] + text.slice(regexResult.index + regexResult.length + 1);
    }

    for (let i = 0; i < text.length; i++) {
        const chr = text[i].charCodeAt(0);
        if (chr === 10) {
            row++;
            col = 0;
            continue;
        }
        fontStream.position = chr * 8;

        const data = interpreterState.frameData.data;
        for (let y = 0; y < 8; y++) {
            let colData = fontStream.readUint8();
            for (let x = 0; x < 8; x++) {
                let color = palette[colorNo];
                if ((colData & 0x80) === 0x80) {
                    color = 0xFF;
                }

                const index         = (row * 8 + y) * 320 + (col * 8 + x);
                data[index * 4 + 0] = color;
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
    const {data}        = interpreterState.frameData;
    const {data: _data} = interpreterState.debugFrameData;
    for (let k = 0; k < BITMAP_HEIGHT * BITMAP_WIDTH; k++) {
        let rgb;
        interpreterState.framePriorityData.data[k] = interpreterState.visualPriorityBuffer.data[k];

        rgb             = palette[interpreterState.visualBuffer.data[k]];
        data[k * 8]     = (rgb >>> 16) & 0xFF;
        data[k * 8 + 1] = (rgb >>> 8) & 0xFF;
        data[k * 8 + 2] = rgb & 0xFF;
        data[k * 8 + 3] = 255;
        data[k * 8 + 4] = (rgb >>> 16) & 0xFF;
        data[k * 8 + 5] = (rgb >>> 8) & 0xFF;
        data[k * 8 + 6] = rgb & 0xFF;
        data[k * 8 + 7] = 255;

        rgb              = palette[interpreterState.visualPriorityBuffer.data[k]];
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
    const view   = interpreterState.loadedViews[viewNo];
    let cel      = view.loops[loopNo].cels[celNo];
    const mirror = cel.mirrored;
    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
    }

    const {data} = interpreterState.frameData;
    for (let cy = 0; cy < cel.height; cy++) {
        if (cy + y >= 200) {
            break;
        }

        for (let cx = 0; cx < cel.width; cx++) {
            if (cx + x >= 160) {
                break;
            }

            const idx                   = (cy + y + 1 - cel.height) * 160 + (cx + x);
            const existingFramePriority = interpreterState.framePriorityData.data[idx]
            if (priority < existingFramePriority) {
                continue;
            }

            let ccx = cx;
            if (mirror) {
                ccx = cel.width - cx - 1;
            }

            let color;
            color = cel.pixelData[cy * cel.width + ccx];
            if (color === cel.transparentColor) {
                continue;
            }

            color = interpreterState.visualBuffer.data[idx];

            interpreterState.framePriorityData.data[idx] = interpreterState.visualPriorityBuffer.data[idx];

            const rgb         = palette[color];
            data[idx * 8 + 0] = (rgb >>> 16) & 0xFF;
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
    const view   = interpreterState.loadedViews[viewNo];
    let cel      = view.loops[loopNo].cels[celNo];
    const mirror = cel.mirrored;
    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
    }

    const {data} = interpreterState.frameData;
    for (let cy = 0; cy < cel.height; cy++) {
        if (cy + y - cel.height >= 200) {
            break;
        }

        for (let cx = 0; cx < cel.width; cx++) {
            if (cx + x >= 160) {
                break;
            }

            const idx                   = (cy + y + 1 - cel.height) * 160 + (cx + x);
            const existingFramePriority = interpreterState.framePriorityData.data[idx];
            if (priority < existingFramePriority) {
                continue;
            }

            let ccx = cx;
            if (mirror) {
                ccx = cel.width - cx - 1;
            }

            const color = cel.pixelData[cy * cel.width + ccx];
            if (color === cel.transparentColor) {
                continue;
            }

            interpreterState.framePriorityData.data[idx] = priority;

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
    const view   = interpreterState.loadedViews[viewNo];
    let cel      = view.loops[loopNo].cels[celNo];
    const mirror = cel.mirrored;
    if (cel.mirrored) {
        cel = view.loops[cel.mirroredLoop].cels[celNo];
    }

    const {data}        = interpreterState.visualBuffer;
    const {data: _data} = interpreterState.frameData;

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
                    interpreterState.priorityBuffer.data[idx] = margin;
                }
            }

            interpreterState.visualPriorityBuffer.data[idx] = priority;
            interpreterState.framePriorityData.data[idx]    = priority;

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

export const init = _interpreterState => {
    interpreterState = _interpreterState;
    fontStream       = getFontStream();

    for (let i = 320 * 200; i-- > 0;) {
        interpreterState.frameData.data[i * 4]     = 0;
        interpreterState.frameData.data[i * 4 + 1] = 0;
        interpreterState.frameData.data[i * 4 + 2] = 0;
        interpreterState.frameData.data[i * 4 + 3] = 0xFF;

        interpreterState.debugFrameData.data[i * 4]     = 0;
        interpreterState.debugFrameData.data[i * 4 + 1] = 0;
        interpreterState.debugFrameData.data[i * 4 + 2] = 0;
        interpreterState.debugFrameData.data[i * 4 + 3] = 0xFF;
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
    clearOldObjectView,
};
