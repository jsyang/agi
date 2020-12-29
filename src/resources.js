import {ByteStream, downloadAllFiles} from './fs';
import {AGI_RESOURCE_TYPE} from './constants';

let logdirRecords  = [];
let picdirRecords  = [];
let viewdirRecords = [];
let snddirRecords  = [];
let volBuffers     = [];
let availableVols  = [];
let fontStream;

export const wordGroups = [];

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

// http://www.agidev.com/articles/agispec/agispecs-10.html#ss10.2
const getASCIIFromWordChar   = byte => byte ^ 0x7F;
const isWithinLowercaseASCII = v => (v >= 97 && v <= 122);

export function extractWords(/** @type ByteStream */byteStream) {
    byteStream.startPosition = byteStream.readUint16(false);// 26 x 2 bytes for each letter of the alphabet
    byteStream.position      = 0;

    let lastWord = '';
    while (true) {
        let currentWord           = '';
        // Process each word
        let charCountFromLastWord = byteStream.readUint8();

        while (true) {
            const byte  = byteStream.readUint8();
            const ascii = getASCIIFromWordChar(byte >= 128 ? byte - 128 : byte);

            if (isWithinLowercaseASCII(ascii)) {
                currentWord += String.fromCharCode(ascii);
            } else if (ascii === 32) {
                currentWord += ' ';
            } else if (ascii === 45) {
                currentWord += '-';
            } else {
                byteStream.position--;
                // End of word; next byte = word group number
                const wordGroupNumber       = byteStream.readUint16(false);
                currentWord                 = lastWord.substring(0, charCountFromLastWord) + currentWord;
                wordGroups[wordGroupNumber] = wordGroups[wordGroupNumber] || [];
                wordGroups[wordGroupNumber].push(currentWord);
                lastWord = currentWord;
                break;
            }

        }
        if (byteStream.end <= byteStream.startPosition + byteStream.position) return;
    }

}


export async function load(path = 'game/') {
    let downloadedBuffers;

    // Locations of each type of resource are
    downloadedBuffers = await downloadAllFiles(path, ["LOGDIR", "PICDIR", "VIEWDIR", "SNDDIR"]);

    parseDirfile(downloadedBuffers["LOGDIR"], logdirRecords);
    parseDirfile(downloadedBuffers["PICDIR"], picdirRecords);
    parseDirfile(downloadedBuffers["VIEWDIR"], viewdirRecords);
    parseDirfile(downloadedBuffers["SNDDIR"], snddirRecords);

    const volNames = [];
    for (let i = 0; i < availableVols.length; i++) {
        if (availableVols[i] === true) {
            volNames.push("VOL." + i);
        }
    }

    // Actual resources are held in volume files
    downloadedBuffers = await downloadAllFiles(path, volNames);
    for (let j = 0; j < volNames.length; j++) {
        volBuffers[j] = downloadedBuffers[volNames[j]];
    }

    // Word groups for the parser
    downloadedBuffers = await downloadAllFiles(path, ['words.tok']);
    extractWords(downloadedBuffers['words.tok']);

    // Font bitmap for text
    downloadedBuffers = await downloadAllFiles('', ["font.bin"]);
    fontStream        = downloadedBuffers["font.bin"];
}

export const getFontStream = () => fontStream;

export default {
    load,
    readAgiResource,
};
