export class ByteStream {
    constructor(buffer, startPosition = 0, end = 0) {
        this.buffer = buffer;

        if (end === 0) {
            this.end = this.buffer.byteLength;
        } else {
            this.end = end;
        }

        this.startPosition = startPosition;
        this.length        = this.end - this.startPosition;
        this.position      = 0;
    }

    readUint8() {
        return this.buffer[this.startPosition + this.position++];
    }

    readUint16(isLittleEndian = true) {
        const b1 = this.buffer[this.startPosition + this.position++];
        const b2 = this.buffer[this.startPosition + this.position++];

        if (isLittleEndian) {
            return (b2 << 8) + b1;
        }

        return (b1 << 8) + b2;
    }

    readInt16(isLittleEndian = true) {
        const b1 = this.buffer[this.startPosition + this.position++];
        const b2 = this.buffer[this.startPosition + this.position++];

        if (isLittleEndian) {
            return ((((b2 << 8) | b1) << 16) >> 16);
        }

        return ((((b1 << 8) | b2) << 16) >> 16);
    }
}

export async function downloadAllFiles(path, files) {
    const buffers = {};

    await Promise.all(files.map(file =>
        fetch(path + file)
            .then(res => res.arrayBuffer())
            .then(buffer => {
                buffers[file] = new ByteStream(new Uint8Array(buffer));
            }))
    );

    return buffers;
}
