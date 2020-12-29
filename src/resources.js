import {ByteStream, downloadAllFiles} from './fs';
import {AGI_RESOURCE_TYPE} from './constants';

let logdirRecords  = [];
let picdirRecords  = [];
let viewdirRecords = [];
let snddirRecords  = [];
let volBuffers     = [];
let availableVols  = [];
let fontStream;

function parseDirfile(buffer, records) {
    const length = buffer.length / 3;
    for (let i = 0; i < length; i++) {
        const val       = (buffer.readUint8() << 16) + (buffer.readUint8() << 8) + buffer.readUint8();
        const volNo     = val >>> 20;
        const volOffset = val & 0xFFFFF;

        if (val >>> 16 === 0xFF) {
            continue;
        }

        records[i] = {volNo: volNo, volOffset: volOffset};
        if (availableVols[volNo] === undefined) {
            availableVols[volNo] = true;
        }
    }
}

export function readAgiResource(type, num) {
    let record;
    switch (type) {
        case AGI_RESOURCE_TYPE.LOGIC:
            record = logdirRecords[num];
            break;
        case AGI_RESOURCE_TYPE.PIC:
            record = picdirRecords[num];
            break;
        case AGI_RESOURCE_TYPE.VIEW:
            record = viewdirRecords[num];
            break;
        case AGI_RESOURCE_TYPE.SOUND:
            record = snddirRecords[num];
            break;
        default:
            throw "Undefined resource type: " + type;
    }
    const volStream      = new ByteStream(volBuffers[record.volNo].buffer, record.volOffset);
    const signature      = volStream.readUint16();
    const volNo          = volStream.readUint8();
    const resourceLength = volStream.readUint16();

    return new ByteStream(volStream.buffer, record.volOffset + 5, record.volOffset + 5 + resourceLength);
}

export async function load(path = 'game/') {
    const buffers = await downloadAllFiles(path, ["LOGDIR", "PICDIR", "VIEWDIR", "SNDDIR"]);

    parseDirfile(buffers["LOGDIR"], logdirRecords);
    parseDirfile(buffers["PICDIR"], picdirRecords);
    parseDirfile(buffers["VIEWDIR"], viewdirRecords);
    parseDirfile(buffers["SNDDIR"], snddirRecords);

    const volNames = [];
    for (let i = 0; i < availableVols.length; i++) {
        if (availableVols[i] === true) {
            volNames.push("VOL." + i);
        }
    }

    const volBufs = await downloadAllFiles(path, volNames);
    for (let j = 0; j < volNames.length; j++) {
        volBuffers[j] = volBufs[volNames[j]];
    }

    const fontBuf = await downloadAllFiles("", ["font.bin"]);
    fontStream    = fontBuf["font.bin"];
}

export const getFontStream = () => fontStream;

export default {
    load,
    readAgiResource,
};
