import {unzipSync} from 'fflate';
import {ByteBuffer} from './bytebuffer';
import {AGI_RESOURCE_TYPE, DECRYPTION_KEY} from './constants';

let logdirRecords  = [];
let picdirRecords  = [];
let viewdirRecords = [];
let snddirRecords  = [];
let volBuffers     = [];
let availableVols  = [];
let fontStream;

export const inventoryObjects = [];
export const wordGroups       = [];

// todo: Handle AGI V3 files
// http://agi.sierrahelp.com/Documentation/Specifications/3-1-Files.html

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

    const volStream              = new ByteBuffer(volBuffers[record.volNo].buffer, record.volOffset);
    const signature              = volStream.readUint16();
    const volNo                  = volStream.readUint8();
    const resourceLength         = volStream.readUint16();
    let isCompressed             = false;
    let compressedResourceLength = 0;

    // todo: Handle AGIv3 game resources
    if (!isAGIv2Resource) {
        compressedResourceLength = volStream.readUint16();
        isCompressed             = resourceLength !== compressedResourceLength;
    }

    if (isCompressed) {
        // todo: decompress with LZW
        // https://en.wikipedia.org/wiki/Lempel%E2%80%93Ziv%E2%80%93Welch
        // // http://www.agidev.com/articles/agispec/agispecs-5.html#ss5.3
        const buf = volStream.buffer.slice(record.volOffset + 7, record.volOffset + 7 + compressedResourceLength);

        if (type === 0) {
            console.log(buf.join(','));
        }

        return new ByteBuffer(volStream.buffer, record.volOffset + 7, record.volOffset + 7 + compressedResourceLength);
    } else {
        return new ByteBuffer(volStream.buffer, record.volOffset + 5, record.volOffset + 5 + resourceLength);
    }

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

const IS_DIRFILE_V2 = /^(log|pic|snd|view)dir$/i;
const IS_DIRFILE    = /^((log|pic|snd|view)|[a-z0-9]+)dir$/i;
const IS_VOLFILE    = /^[a-z0-9]*vol\.[0-9]{1,2}$/i;
const IS_WORDSTOK   = /^words\.tok$/i;
const IS_OBJECT     = /^object$/i;
const IS_ICON       = /^[a-z0-9]+.ico$/i;

const getDecompressedFile = (name, uint8a) => ({
    name:       name.toLowerCase(),
    byteBuffer: new ByteBuffer(uint8a)
});

async function downloadFont(file = 'font.bin') {
    fontStream = await fetch(file)
        .then(res => res.arrayBuffer())
        .then(buffer => new ByteBuffer(new Uint8Array(buffer)));
}

let isAGIv2Resource;

export async function downloadZip(file) {
    const buffer = new Uint8Array(
        await fetch(file).then(res => res.arrayBuffer())
    );

    const unzipped = unzipSync(buffer);

    isAGIv2Resource = Object.keys(unzipped)
        .map(f => f.toLowerCase())
        .some(f => IS_DIRFILE_V2.test(f));

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


// todo
// ref: https://github.com/huguesv/AgiPlayer/blob/ced9361b910e6ad391c86380c6e17c73ea01064f/src/Woohoo.Agi.Interpreter/Resources/Serialization/InventoryDecoder.cs#L94
function getIsObjectFileEncrypted(byteBuffer) {
}

function extractInventoryObjects(byteBuffer) {
    const decryptedBuffer     = new Uint8Array(byteBuffer.buffer.length);
    const decryptedByteBuffer = new ByteBuffer(decryptedBuffer);


    let decryptionIndex = 0;
    while (!byteBuffer.hasReachedEnd()) {
        decryptedBuffer[byteBuffer.position] = DECRYPTION_KEY[decryptionIndex++].charCodeAt(0) ^ byteBuffer.readUint8();

        if (decryptionIndex >= DECRYPTION_KEY.length) {
            decryptionIndex = 0;
        }
    }

    const objNamesOffset     = decryptedByteBuffer.readUint16();
    const maxAnimatedObjects = decryptedByteBuffer.readUint8(); // ???

    while (decryptedByteBuffer.position <= objNamesOffset) {
        const nameOffset = decryptedByteBuffer.readUint16();
        const room       = decryptedByteBuffer.readUint8();

        let i    = 0;
        let name = '';
        while (true) {
            const char = String.fromCharCode(decryptedBuffer[nameOffset + i + 3]); // + 4 if padded (Amiga version)
            if (char === '\0') break;
            name += char;
            i++;
        }

        inventoryObjects.push({name, room});
    }
}

export async function load(gameZip = '/game/agi/sq2.zip') {
    await downloadFont();

    const gameFiles = await downloadZip(gameZip);

    if (gameFiles.iconFile) {
        setBufferAsFavicon(gameFiles.iconFile.byteBuffer.buffer);
    }

    if (isAGIv2Resource) {
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'logdir').byteBuffer, logdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'picdir').byteBuffer, picdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'viewdir').byteBuffer, viewdirRecords);
        parseDirfile(gameFiles.dirFiles.find(f => f.name === 'snddir').byteBuffer, snddirRecords);
    } else {
        let dirFileBuffer = gameFiles.dirFiles[0].byteBuffer;

        const logdirStart  = dirFileBuffer.readUint16();
        const picdirStart  = dirFileBuffer.readUint16();
        const viewdirStart = dirFileBuffer.readUint16();
        const snddirStart  = dirFileBuffer.readUint16();

        dirFileBuffer = dirFileBuffer.buffer;

        const logBB  = new ByteBuffer(dirFileBuffer.slice(logdirStart, picdirStart));
        const picBB  = new ByteBuffer(dirFileBuffer.slice(picdirStart, viewdirStart));
        const viewBB = new ByteBuffer(dirFileBuffer.slice(viewdirStart, snddirStart));
        const sndBB  = new ByteBuffer(dirFileBuffer.slice(snddirStart));

        parseDirfile(logBB, logdirRecords);
        parseDirfile(picBB, picdirRecords);
        parseDirfile(viewBB, viewdirRecords);
        parseDirfile(sndBB, snddirRecords);
    }

    volBuffers = [];

    gameFiles.volFiles.forEach(f => {
        const index       = parseFloat(f.name.split('.')[1]);
        volBuffers[index] = f.byteBuffer;
    });

    extractInventoryObjects(gameFiles.objectFile.byteBuffer);
    extractWords(gameFiles.wordsTokFile.byteBuffer);
}

export default {
    load,
    readAgiResource,
};
