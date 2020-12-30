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

const circles    = [
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
const rectangles = [
    [
        "p"
    ],
    [
        "xx",
        "xp",
        "xx"
    ],
    [
        "xxx",
        "xxx",
        "xpx",
        "xxx",
        "xxx"
    ],
    [
        "xxxx",
        "xxxx",
        "xxxx",
        "xxpx",
        "xxxx",
        "xxxx",
        "xxxx"
    ],
    [
        "xxxxx",
        "xxxxx",
        "xxxxx",
        "xxxxx",
        "xxpxx",
        "xxxxx",
        "xxxxx",
        "xxxxx",
        "xxxxx"
    ],
    [
        "xxxxxx",
        "xxxxxx",
        "xxxxxx",
        "xxxxxx",
        "xxxxxx",
        "xxxpxx",
        "xxxxxx",
        "xxxxxx",
        "xxxxxx",
        "xxxxxx",
        "xxxxxx"
    ],
    [
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxpxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx",
        "xxxxxxx"
    ],
];

export class Pic {
    picEnabled = false;
    priEnabled = false;
    picColor   = 0;
    priColor   = 0;
    visible    = null;
    priority   = null;

    constructor(stream) {
        this.stream = stream;
    }

    setPixel(x, y, drawVis = true, drawPri = true) {
        const index = y * BITMAP_WIDTH + x;

        // Out of bounds
        if (index < 0 || index >= BITMAP_HEIGHT * BITMAP_HEIGHT) return;

        if (this.picEnabled && drawVis) {
            this.visible.data[index] = this.picColor;
        }

        if (this.priEnabled && drawPri) {
            if (this.priority.data[index] !== GAMEOBJECT_PRIORITY.TOP) {
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
            const queue  = new FastQueue();
            const startX = this.stream.readUint8();
            if (startX >= 0xF0) {
                break;
            }

            const startY = this.stream.readUint8();
            queue.enqueue(startX);
            queue.enqueue(startY);

            // Visible
            let pos;
            let x;
            let y;
            while (!queue.isEmpty()) {
                x = queue.dequeue();
                y = queue.dequeue();
                if (this.picEnabled) {
                    if (this.visible.data[y * BITMAP_WIDTH + x] !== 0x0F) {
                        continue;
                    }
                    this.setPixel(x, y, true, false);
                }
                if (this.priEnabled) {
                    if (this.priority.data[y * BITMAP_WIDTH + x] !== 0x04) {
                        continue;
                    }
                    this.setPixel(x, y, false, true);
                }
                if (x > 0) {
                    queue.enqueue(x - 1);
                    queue.enqueue(y);
                }
                if (x < BITMAP_WIDTH - 1) {
                    queue.enqueue(x + 1);
                    queue.enqueue(y);
                }
                if (y > 0) {
                    queue.enqueue(x);
                    queue.enqueue(y - 1);
                }
                if (y < BITMAP_HEIGHT - 1) {
                    queue.enqueue(x);
                    queue.enqueue(y + 1);
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

    draw(visualBuffer, priorityBuffer) {
        this.stream.position = 0;
        this.visible         = visualBuffer;
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
