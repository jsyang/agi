import {ByteBuffer} from './bytebuffer';
import {AGI_RESOURCE_TYPE} from './constants';
import {unzipSync} from 'fflate';

let logdirRecords  = [];
let picdirRecords  = [];
let viewdirRecords = [];
let snddirRecords  = [];
let volBuffers     = [];
let availableVols  = [];
let fontStream;

export const wordGroups = [];

// todo: handle zip file "PACKS" for all the games / demos


// todo: Handle AGI V3 files
// http://agi.sierrahelp.com/Documentation/Specifications/3-1-Files.html
/*
http://www.agidev.com/articles/agispec/agispecs-5.html#ss5.2

In the case of version 3 of the AGI interpreter, the LOGDIR, PICDIR, VIEWDIR, and SNDDIR are concatenated together in that order with an eight byte header giving the starting offset of each directory.

Header

Byte	0	1	2	3	4	5	6	7
 	L	L	P	P	V	V	S	S
L = offset of LOGDIR
P = offset of PICDIR
V = offset of VIEWDIR
S = offset of SNDDIR

Each offset is two bytes in length where the first byte is the low byte and the second byte is the high byte as is the case in the whole AGI system. For example, the first two bytes will always be 0x0800 since the header is a fixed size of eight bytes.

The format of each of the individual directory sections then follows as above for AGI v2.
 */


function parseDirfile(buffer, records, isAGIv3 = false) {
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
    const volStream      = new ByteBuffer(volBuffers[record.volNo].buffer, record.volOffset);
    const signature      = volStream.readUint16();
    const volNo          = volStream.readUint8();
    const resourceLength = volStream.readUint16();

    return new ByteBuffer(volStream.buffer, record.volOffset + 5, record.volOffset + 5 + resourceLength);
}

// http://www.agidev.com/articles/agispec/agispecs-10.html#ss10.2
const getASCIIFromWordChar   = byte => byte ^ 0x7F;
const isWithinLowercaseASCII = v => (v >= 97 && v <= 122);

function extractWords(/** @type ByteBuffer */byteBuffer) {
    byteBuffer.startPosition = byteBuffer.readUint16(false);// 26 x 2 bytes for each letter of the alphabet
    byteBuffer.position      = 0;

    let lastWord = '';
    while (true) {
        let currentWord           = '';
        // Process each word
        let charCountFromLastWord = byteBuffer.readUint8();

        while (true) {
            const byte  = byteBuffer.readUint8();
            const ascii = getASCIIFromWordChar(byte >= 128 ? byte - 128 : byte);

            if (isWithinLowercaseASCII(ascii)) {
                currentWord += String.fromCharCode(ascii);
            } else if (ascii === 32) {
                currentWord += ' ';
            } else if (ascii === 45) {
                currentWord += '-';
            } else {
                byteBuffer.position--;
                // End of word; next byte = word group number
                const wordGroupNumber       = byteBuffer.readUint16(false);
                currentWord                 = lastWord.substring(0, charCountFromLastWord) + currentWord;
                wordGroups[wordGroupNumber] = wordGroups[wordGroupNumber] || [];
                wordGroups[wordGroupNumber].push(currentWord);
                lastWord = currentWord;
                break;
            }

        }
        if (byteBuffer.hasReachedEnd()) return;
    }
}

export const getFontStream = () => fontStream;

const IS_DIRFILE  = /^((log|pic|snd|view)|[a-z0-9]+)dir$/i;
const IS_VOLFILE  = /^vol\.[0-9]$/i;
const IS_WORDSTOK = /^words\.tok$/i;
const IS_OBJECT   = /^object$/i;
const IS_ICON     = /^[a-z0-9]+.ico$/i;

const getDecompressedFile = (name, uint8a) => ({
    name:       name.toLowerCase(),
    byteBuffer: new ByteBuffer(uint8a)
});

async function downloadFont(file = 'font.bin') {
    fontStream = await fetch(file)
        .then(res => res.arrayBuffer())
        .then(buffer => new ByteBuffer(new Uint8Array(buffer)));
}

export async function downloadZip(file) {
    const buffer = new Uint8Array(
        await fetch(file).then(res => res.arrayBuffer())
    );

    const unzipped = unzipSync(buffer);

    const isAGIv2Resource = unzipped['logdir'] || unzipped['picdir'] || unzipped['snddir'] || unzipped['viewdir'];

    const dirFiles = [];
    const volFiles = [];
    let wordsTokFile;
    let objectFile;
    let iconFile;

    Object.keys(unzipped).forEach(name => {
        const uint8array = unzipped[name];

        if (IS_DIRFILE.test(name)) {
            dirFiles.push(getDecompressedFile(name, uint8array));
        } else if (IS_VOLFILE.test(name)) {
            volFiles.push(getDecompressedFile(name, uint8array));
        } else if (IS_WORDSTOK.test(name)) {
            wordsTokFile = getDecompressedFile(name, uint8array);
        } else if (IS_OBJECT.test(name)) {
            objectFile = getDecompressedFile(name, uint8array);
        } else if (IS_ICON.test(name)) {
            iconFile = getDecompressedFile(name, uint8array);
        }
    });

    return {
        isAGIv2Resource,
        dirFiles,
        volFiles,
        wordsTokFile,
        objectFile,
        iconFile,
    };
}

function setBufferAsFavicon(buffer) {
    const blob = new Blob([buffer]);

    const reader = new FileReader();

    reader.onload = e => {
        const base64 = e.target.result.split('base64,')[1];

        document.getElementById('favicon').href = 'data:image/vnd.microsoft.icon;base64,' + base64;
    };

    reader.readAsDataURL(blob);
}

export async function load(gameZip = '/game/agi/sq2.zip') {
    await downloadFont();

    const gameFiles = await downloadZip(gameZip);

    if (gameFiles.iconFile) {
        setBufferAsFavicon(gameFiles.iconFile.byteBuffer.buffer);
    }

    if (gameFiles.isAGIv2Resource) {
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'logdir').byteBuffer, logdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'picdir').byteBuffer, picdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'viewdir').byteBuffer, viewdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'snddir').byteBuffer, snddirRecords);
    } else {
        throw 'AGI v3 directory files are not yet supported!';
    }

    volBuffers = [];

    gameFiles.volFiles.forEach(f => {
        const index       = parseFloat(f.name.split('.')[1]);
        volBuffers[index] = f.byteBuffer;
    });

    extractWords(gameFiles.wordsTokFile.byteBuffer);
}

export default {
    load,
    readAgiResource,
};
