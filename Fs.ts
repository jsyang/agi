﻿namespace Fs {
    export class ByteStream {
        position: number = 0;
        length: number = 0;
        constructor(public buffer: Uint8Array, public startPosition: number = 0, private end: number = 0) {
            if (end == 0)
                this.end = this.buffer.byteLength;
            this.length = this.end - this.startPosition;
        }

        readUint8(): number {
            return this.buffer[this.startPosition + this.position++];
        }

        readUint16(littleEndian: boolean = true): number {
            var b1: number = this.buffer[this.startPosition + this.position++];
            var b2: number = this.buffer[this.startPosition + this.position++];
            if (littleEndian) {
                return (b2 << 8) + b1;
            }
            return (b1 << 8) + b2;
        }

        readInt16(littleEndian: boolean = true): number {
            var b1: number = this.buffer[this.startPosition + this.position++];
            var b2: number = this.buffer[this.startPosition + this.position++];
            if (littleEndian) {
                return ((((b2 << 8) | b1) << 16) >> 16);
            }
            return ((((b1 << 8) | b2) << 16) >> 16);
        }
    }

    export interface IByteStreamDict {
        [index: string]: Fs.ByteStream;
    }

    export function downloadAllFiles(path: string, files: string[], done: (buffers: IByteStreamDict) => void) {
        var buffers: IByteStreamDict = {};
        var leftToDownload: number = files.length;

        function getBinary(url: string, success: (data: ArrayBuffer) => void): void {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = () => {
                if (xhr.readyState == 4) {
                    if (xhr.response === null) {
                        throw "Fatal error downloading '" + url + "'";
                    } else {
                        // console.log("Successfully downloaded '" + url + "'");
                        success(xhr.response);
                    }
                }
            };
            xhr.send();
        }

        function handleFile(num: number) {
            getBinary(path + files[num], (buffer: ArrayBuffer) => {
                buffers[files[num]] = new ByteStream(new Uint8Array(buffer));
                leftToDownload--;
                if (leftToDownload === 0) {
                    done(buffers);
                }
            });
        }

        for (var i = 0; i < files.length; i++) {
            handleFile(i);
        }
    }
}
