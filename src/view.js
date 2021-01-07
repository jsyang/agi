/*
"Cel"
{
    width:              uint
    height:             uint
    transparentColor:   uint
    mirrored:           boolean
    mirroredLoop:       int
    pixelData:          Uint8Array
}

"Loop"
{
    cels:               Cel[]
}
*/

export class View {
    loops = [];

    constructor(data) {
        const unk1              = data.readUint8();
        const unk2              = data.readUint8();
        const numLoops          = data.readUint8();
        const descriptionOffset = data.readUint16();
        for (let i = 0; i < numLoops; i++) {
            // Loop header
            const loop          = {cels: []};
            const loopOffset    = data.readUint16();
            const streamPosLoop = data.position;
            data.position       = loopOffset;
            const numCels       = data.readUint8();
            for (let j = 0; j < numCels; j++) {
                const celOffset           = data.readUint16();
                const streamPosCel        = data.position;
                data.position             = loopOffset + celOffset;
                // Cel header
                const celWidth            = data.readUint8();
                const celHeight           = data.readUint8();
                const celMirrorTrans      = data.readUint8();
                let celMirrored           = (celMirrorTrans & 0x80) === 0x80;
                const celMirrorLoop       = (celMirrorTrans >>> 4) & 7;
                const celTransparentColor = celMirrorTrans & 0x0F;
                if (celMirrorLoop === i) {
                    celMirrored = false;
                }

                const cel = {
                    width:            celWidth,
                    height:           celHeight,
                    transparentColor: celTransparentColor,
                    mirrored:         celMirrored,
                    mirroredLoop:     celMirrorLoop,
                };

                if (!celMirrored) {
                    cel.pixelData = new Uint8Array(cel.width * cel.height);
                    for (let k = 0; k < cel.pixelData.length; k++) {
                        cel.pixelData[k] = celTransparentColor;
                    }
                    let celY = 0;
                    let celX = 0;
                    while (true) {
                        const chunkData = data.readUint8();
                        if (chunkData === 0) {
                            celX = 0;
                            celY++;
                            if (celY >= celHeight) {
                                break;
                            }
                        }

                        const color     = chunkData >>> 4;
                        const numPixels = chunkData & 0x0F;
                        for (let x = 0; x < numPixels; x++) {
                            cel.pixelData[celY * celWidth + celX + x] = color;
                        }
                        celX += numPixels;
                    }
                }
                loop.cels[j]  = cel;
                data.position = streamPosCel;
            }
            this.loops[i] = loop;
            data.position = streamPosLoop;
        }
        data.position = descriptionOffset;
        while (true) {
            const chr = data.readUint8();
            if (chr === 0) {
                break;
            }
            this.description += String.fromCharCode(chr);
        }
    }
}
