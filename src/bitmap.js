import {FastQueue} from './fastqueue';
import {GAMEOBJECT_PRIORITY} from './constants';

export const BITMAP_WIDTH  = 160;
export const BITMAP_HEIGHT = 168;

export class Bitmap {
    data = new Uint8Array(BITMAP_WIDTH * BITMAP_HEIGHT);

    clear(color) {
        this.data.fill(color);
    }
}

export const PIC_OPCODE = {
    PicSetColor: 0xF0,
    PicDisable:  0xF1,
    PriSetcolor: 0xF2,
    PriDisable:  0xF3,
    DrawYCorner: 0xF4,
    DrawXCorner: 0xF5,
    DrawAbs:     0xF6,
    DrawRel:     0xF7,
    DrawFill:    0xF8,
    SetPen:      0xF9,
    DrawPen:     0xFA,
    End:         0xFF,
}

const circles = [
    [
        "p"
    ],
    [
        "xp"
    ],
    [
        " x ",
        "xxx",
        "xpx",
        "xxx",
        " x "
    ],
    [
        " xx ",
        " xx ",
        "xxxx",
        "xxpx",
        "xxxx",
        " xx ",
        " xx "
    ],
    [
        "  x  ",
        " xxx ",
        "xxxxx",
        "xxxxx",
        "xxpxx",
        "xxxxx",
        "xxxxx",
        " xxx ",
        "  x  "
    ],
    [
        "  xx  ",
        " xxxx ",
        " xxxx ",
        " xxxx ",
        "xxxxxx",
        "xxxpxx",
        "xxxxxx",
        " xxxx ",
        " xxxx ",
        " xxxx ",
        "  xx  "
    ],
    [
        "  xxx  ",
        " xxxxx ",
        " xxxxx ",
        " xxxxx ",
        "xxxxxxx",
        "xxxxxxx",
        "xxxpxxx",
        "xxxxxxx",
        "xxxxxxx",
        " xxxxx ",
        " xxxxx ",
        " xxxxx ",
        "  xxx  "
    ],
    [
        "   xx   ",
        "  xxxx  ",
        " xxxxxx ",
        " xxxxxx ",
        " xxxxxx ",
        "xxxxxxxx",
        "xxxxxxxx",
        "xxxxpxxx",
        "xxxxxxxx",
        "xxxxxxxx",
        " xxxxxx ",
        " xxxxxx ",
        " xxxxxx ",
        "  xxxx  ",
        "   xx   "
    ]
];

// const rectangles = [
//     [
//         "p"
//     ],
//     [
//         "xx",
//         "xp",
//         "xx"
//     ],
//     [
//         "xxx",
//         "xxx",
//         "xpx",
//         "xxx",
//         "xxx"
//     ],
//     [
//         "xxxx",
//         "xxxx",
//         "xxxx",
//         "xxpx",
//         "xxxx",
//         "xxxx",
//         "xxxx"
//     ],
//     [
//         "xxxxx",
//         "xxxxx",
//         "xxxxx",
//         "xxxxx",
//         "xxpxx",
//         "xxxxx",
//         "xxxxx",
//         "xxxxx",
//         "xxxxx"
//     ],
//     [
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxpxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx",
//         "xxxxxx"
//     ],
//     [
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxpxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx",
//         "xxxxxxx"
//     ],
// ];

// Enqueue for flood fill
const addAdjCoordsToQueue = (visited, queue, x, y) => {
    let i;
    if (x > 0) {
        i = y * BITMAP_WIDTH + x - 1;
        if (!visited[i]) {
            visited[i] = 1;
            queue.enqueue(x - 1);
            queue.enqueue(y);
        }
    }
    if (x < BITMAP_WIDTH - 1) {
        i = y * BITMAP_WIDTH + x + 1;
        if (!visited[i]) {
            visited[i] = 1;
            queue.enqueue(x + 1);
            queue.enqueue(y);
        }
    }
    if (y > 0) {
        i = (y - 1) * BITMAP_WIDTH + x;
        if (!visited[i]) {
            visited[i] = 1;
            queue.enqueue(x);
            queue.enqueue(y - 1);
        }
    }
    if (y < BITMAP_HEIGHT - 1) {
        i = (y + 1) * BITMAP_WIDTH + x;
        if (!visited[i]) {
            visited[i] = 1;
            queue.enqueue(x);
            queue.enqueue(y + 1);
        }
    }
};


export class Pic {
    picEnabled      = false;
    priEnabled      = false;
    picColor        = 0;
    priColor        = 0;
    visible         = null;
    visiblePriority = null;
    priority        = null;

    constructor(stream) {
        this.stream  = stream;
        this.visited = new Uint8Array(BITMAP_WIDTH * BITMAP_HEIGHT);
    }

    setPixel(x, y, drawVis = true, drawPri = true) {
        // Out of bounds
        if (x < 0 || x >= BITMAP_WIDTH) return;
        if (y < 0 || y >= BITMAP_HEIGHT) return;

        const index = y * BITMAP_WIDTH + x;

        if (this.picEnabled && drawVis) {
            this.visible.data[index] = this.picColor;
        }

        if (this.priEnabled && drawPri) {
            if (this.priColor > GAMEOBJECT_PRIORITY.WATER) {
                this.visiblePriority.data[index] = this.priColor;
            } else {
                this.priority.data[index] = this.priColor;
            }
        }
    }

    round(aNumber, dirn) {
        if (dirn < 0) {
            if (aNumber - Math.floor(aNumber) <= 0.501) {
                return Math.floor(aNumber);
            } else {
                return Math.ceil(aNumber);
            }
        } else {
            if (aNumber - Math.floor(aNumber) < 0.499) {
                return Math.floor(aNumber);
            } else {
                return Math.ceil(aNumber);
            }
        }
    }

    drawLine(x1, y1, x2, y2) {
        let x, y;
        const height = y2 - y1;
        const width  = x2 - x1;
        let addX     = height === 0 ? height : width / Math.abs(height);
        let addY     = width === 0 ? width : height / Math.abs(width);

        if (Math.abs(width) > Math.abs(height)) {
            y    = y1;
            addX = width === 0 ? 0 : width / Math.abs(width);
            for (x = x1; x !== x2; x += addX) {
                this.setPixel(this.round(x, addX), this.round(y, addY));
                y += addY;
            }
            this.setPixel(x2, y2);
        } else {
            x    = x1;
            addY = height === 0 ? 0 : height / Math.abs(height);
            for (y = y1; y !== y2; y += addY) {
                this.setPixel(this.round(x, addX), this.round(y, addY));
                x += addX;
            }
            this.setPixel(x2, y2);
        }
    }

    opDrawXCorner() {
        let startX = this.stream.readUint8();
        let startY = this.stream.readUint8();
        this.setPixel(startX, startY);
        while (true) {
            const x2 = this.stream.readUint8();
            if (x2 >= 0xF0) {
                break;
            }
            this.drawLine(startX, startY, x2, startY);
            startX = x2;

            const y2 = this.stream.readUint8();
            if (y2 >= 0xF0) {
                break;
            }
            this.drawLine(startX, startY, startX, y2);
            startY = y2;
        }
        this.stream.position--;
    }

    opDrawYCorner() {
        let startX = this.stream.readUint8();
        let startY = this.stream.readUint8();
        this.setPixel(startX, startY);
        while (true) {
            const y2 = this.stream.readUint8();
            if (y2 >= 0xF0) {
                break;
            }
            this.drawLine(startX, startY, startX, y2);
            startY = y2;

            const x2 = this.stream.readUint8();
            if (x2 >= 0xF0) {
                break;
            }
            this.drawLine(startX, startY, x2, startY);
            startX = x2;
        }
        this.stream.position--;
    }

    opDrawAbs() {
        let startX = this.stream.readUint8();
        let startY = this.stream.readUint8();

        while (true) {
            const nextX = this.stream.readUint8();
            if (nextX >= 0xF0) {
                break;
            }
            const nextY = this.stream.readUint8();
            this.drawLine(startX, startY, nextX, nextY);
            startX = nextX;
            startY = nextY;
        }
        this.stream.position--;
    }

    opDrawRel() {
        let startX = this.stream.readUint8();
        let startY = this.stream.readUint8();

        while (true) {
            const val = this.stream.readUint8();
            if (val >= 0xF0) {
                break;
            }

            let xDisp = (val >>> 4) & 0x07;
            if ((val & 0x80) === 0x80) {
                xDisp = -xDisp;
            }

            let yDisp = val & 0x07;
            if ((val & 8) === 8) {
                yDisp = -yDisp;
            }

            const nextX = startX + xDisp;
            const nextY = startY + yDisp;
            this.drawLine(startX, startY, nextX, nextY);
            startX = nextX;
            startY = nextY;
        }
        this.stream.position--;
    }

    opFillFastQueue() {
        while (true) {
            const queuePic = new FastQueue();
            const queuePri = new FastQueue();

            const startX = this.stream.readUint8();
            if (startX >= 0xF0) {
                break;
            }

            const startY = this.stream.readUint8();

            let i;
            let x;
            let y;

            // Ensure this meets the spec exactly: http://agi.sierrahelp.com/Documentation/Specifications/5-1-PICTURE.html
            /*
            0xF8 : FILL
            Function: Flood fill from the locations given. Arguments are given in groups of two bytes which
            give the coordinates of the location to start the fill at. If picture drawing is enabled then it
            flood fills from that location on the picture screen to all pixels locations that it can reach
            which are white in colour. The boundary is given by any pixels which are not white.

            If priority drawing is enabled, and picture drawing is not enabled, then it flood fills from that
            location on the priority screen to all pixels that it can reach which are red in colour. The boundary
            in this case is given by any pixels which are not red.

            If both picture drawing and priority drawing are enabled, then a flood fill naturally enough takes
            place on both screens. In this case there is a difference in the way the fill takes place in the
            priority screen. The difference is that it not only looks for its own boundary, but also stops if
            it reaches a boundary that exists in the picture screen but does not necessarily exist in the priority
            screen.
             */
            if (this.picEnabled && !this.priEnabled) {
                queuePic.enqueue(startX);
                queuePic.enqueue(startY);

                i = startY * BITMAP_WIDTH + startX;

                this.visited.fill(0);

                while (!queuePic.isEmpty()) {
                    x = queuePic.dequeue();
                    y = queuePic.dequeue();
                    i = y * BITMAP_WIDTH + x;

                    this.visited[i] = 1;

                    if (this.visible.data[i] === 0x0F) {
                        this.setPixel(x, y, true, false);
                        addAdjCoordsToQueue(this.visited, queuePic, x, y);
                    }
                }
            } else if (!this.picEnabled && this.priEnabled) {
                queuePri.enqueue(startX);
                queuePri.enqueue(startY);

                i = startY * BITMAP_WIDTH + startX;

                const startingPriorityVis = this.visiblePriority.data[i];
                const startingPriority    = this.priority.data[i];
                const startingColor       = this.visible.data[i];

                this.visited.fill(0);

                while (!queuePri.isEmpty()) {
                    let shouldDraw = false;
                    x              = queuePri.dequeue();
                    y              = queuePri.dequeue();
                    i              = y * BITMAP_WIDTH + x;

                    this.visited[i] = 1;

                    if (
                        (this.visiblePriority.data[i] === startingPriorityVis && this.priority.data[i] === startingPriority)
                    ) {
                        shouldDraw = true;
                    }

                    // Enqueue if all ok
                    if (shouldDraw) {
                        this.setPixel(x, y, false, true);
                        addAdjCoordsToQueue(this.visited, queuePri, x, y);
                    }
                }
            } else if (this.picEnabled && this.priEnabled) {
                queuePic.enqueue(startX);
                queuePic.enqueue(startY);

                i = startY * BITMAP_WIDTH + startX;

                this.visited.fill(0);

                while (!queuePic.isEmpty()) {
                    x = queuePic.dequeue();
                    y = queuePic.dequeue();
                    i = y * BITMAP_WIDTH + x;

                    this.visited[i] = 1;

                    if (this.visible.data[i] === 0x0F &&
                        this.visiblePriority.data[i] === 0x04 && this.priority.data[i] === 0x04
                    ) {
                        this.setPixel(x, y, true, true);
                        addAdjCoordsToQueue(this.visited, queuePic, x, y);
                    }
                }
            }
        }
        this.stream.position--;
    }

    penSize      = 0;
    penSplatter  = false;
    penRectangle = true;

    opSetPen() {
        const value       = this.stream.readUint8();
        this.penSplatter  = (value & 0x20) === 0x20;
        this.penRectangle = (value & 0x10) === 0x10;
        this.penSize      = value & 0x07;
    }

    drawPenRect(penX, penY) {
        const w      = this.penSize + 1;
        const left   = penX - Math.ceil(w / 2);
        const right  = penX + Math.floor(w / 2);
        const top    = penY - w;
        const bottom = penY + w;
        for (let x = left; x <= right; x++) {
            for (let y = top; y <= bottom; y++) {
                this.setPixel(x, y);
            }
        }
    }

    drawPenCircle(penX, penY) {
        if (this.penSize === 1) {
            // Special case (only 1 pixel) added
            this.setPixel(penX, penY);
            this.setPixel(penX - 1, penY);

            return;
        }

        const pattern = circles[this.penSize];
        const w       = this.penSize;
        const left    = penX - Math.ceil(w / 2);
        const right   = penX + Math.floor(w / 2);
        const top     = penY - w;
        const bottom  = penY + w;

        for (let y = top, yi = 0; y <= bottom; y++, yi++) {
            for (let x = left, xi = 0; x <= right; x++, xi++) {
                if (pattern[yi][xi] !== ' ') {
                    this.setPixel(x, y);
                }
            }
        }
    }

    drawPenSplat(x, y, texture) {
        // todo?
    }

    opDrawPen() {
        while (true) {
            const firstArg = this.stream.readUint8();
            if (firstArg >= 0xF0)
                break;
            if (this.penSplatter) {
                const texNumber = firstArg;
                const x         = this.stream.readUint8();
                const y         = this.stream.readUint8();
                this.drawPenSplat(x, y, texNumber);
            } else {
                const x = firstArg;
                const y = this.stream.readUint8();
                if (this.penSize === 0) {
                    this.setPixel(x, y);
                } else if (this.penRectangle) {
                    this.drawPenRect(x, y);
                } else {
                    this.drawPenCircle(x, y);
                }
            }
        }
        this.stream.position--;
    }

    draw(visualBuffer, visualPriorityBuffer, priorityBuffer) {
        this.stream.position = 0;
        this.visible         = visualBuffer;
        this.visiblePriority = visualPriorityBuffer;
        this.priority        = priorityBuffer;

        let processing = true;
        while (processing) {
            const opCode = this.stream.readUint8();

            if (opCode < 0xF0) break; // invalid opcode

            switch (opCode) {
                case PIC_OPCODE.PicSetColor:
                    this.picEnabled = true;
                    this.picColor   = this.stream.readUint8();
                    break;
                case PIC_OPCODE.PicDisable:
                    this.picEnabled = false;
                    break;
                case PIC_OPCODE.PriSetcolor:
                    this.priEnabled = true;
                    this.priColor   = this.stream.readUint8();
                    break;
                case PIC_OPCODE.PriDisable:
                    this.priEnabled = false;
                    break;
                case PIC_OPCODE.DrawYCorner:
                    this.opDrawYCorner();
                    break;
                case PIC_OPCODE.DrawXCorner:
                    this.opDrawXCorner();
                    break;
                case PIC_OPCODE.DrawAbs:
                    this.opDrawAbs();
                    break;
                case PIC_OPCODE.DrawRel:
                    this.opDrawRel();
                    break;
                case PIC_OPCODE.DrawFill:
                    this.opFillFastQueue();
                    break;
                case PIC_OPCODE.SetPen:
                    this.opSetPen();
                    break;
                case PIC_OPCODE.DrawPen:
                    this.opDrawPen();
                    break;
                case PIC_OPCODE.End:
                    processing = false;
                    break;
            }
        }
    }
}
