import {AGI_RESOURCE_TYPE, LOGIC_ACTIONS, LOGIC_TESTS} from './constants';
import {readAgiResource} from './resources';
import {commands} from './interpreter';

const DECRYPTION_KEY = "Avis Durgan";

export default class LogicParser {
    /** @type ByteStream */
    data       = null;
    scanStart  = 0;
    no         = 0;
    messages   = [];
    entryPoint = 0;

    constructor(_no) {
        this.no = _no;
        this.load();
    }

    load() {
        this.data           = readAgiResource(AGI_RESOURCE_TYPE.LOGIC, this.no);
        const messageOffset = this.data.readUint16();
        this.data.position += messageOffset; // Jump to messages

        const pos                = this.data.position;
        this.messagesStartOffset = pos;

        const numMessages    = this.data.readUint8();
        const ptrMessagesEnd = this.data.readUint16();

        let decryptionIndex = 0;
        for (let i = 0; i < numMessages; i++) {
            let msgPtr = this.data.readUint16();
            if (msgPtr === 0) {
                continue;
            }
            let messagePosition = this.data.position;
            this.data.position  = pos + msgPtr + 1;
            let msg             = '';
            while (true) {
                let decrypted = String.fromCharCode(DECRYPTION_KEY[decryptionIndex++].charCodeAt(0) ^ this.data.readUint8());
                if (decryptionIndex >= DECRYPTION_KEY.length) {
                    decryptionIndex = 0;
                }

                if (decrypted === '\0') {
                    break;
                }

                msg += decrypted;
            }
            this.messages[i + 1] = msg;
            this.data.position   = messagePosition;
        }
        this.data.position = pos - messageOffset;
        this.scanStart     = this.entryPoint = this.data.position;
    }

    jumpRel(offset) {
        this.data.position += offset;
    }

    log(args) {
        console.log(this.no, args);
    }

    parseLogic() {
        this.data.position        = this.scanStart;
        let isInsideConditional   = false;
        let isNotExpression       = false;
        let isOrExpression        = false;
        let conditionalExpression = [];

        while (this.data.position <= this.messagesStartOffset) {
            /** @type number */
            const opCodeNr = this.data.readUint8();

            switch (opCodeNr) {
                case 0x00: // return
                    return;
                case 0x91:
                    // set.scan.start
                    this.scanStart = this.data.position;
                    break;
                case 0x92:
                    // reset.scan.start
                    this.scanStart = this.entryPoint;
                    break;
                case 0xFF: // if / endif
                    if (isInsideConditional) {
                        const expression = conditionalExpression.join(' && ');
                        const result     = eval(expression);
                        const elseOffset = this.data.readUint16();

                        if (!result) {
                            this.jumpRel(elseOffset);
                        }

                        conditionalExpression = [];
                        isInsideConditional   = false;
                    } else {
                        isInsideConditional = true;
                    }
                    break;
                case 0xFD: // not
                    isNotExpression = true;
                    break;

                case 0xFC: // or
                    if (isOrExpression) {
                        const orStart = conditionalExpression.lastIndexOf('OR') + 1;
                        const orBody  = conditionalExpression.slice(orStart).join(' || ');

                        conditionalExpression = conditionalExpression.slice(0, orStart - 1);
                        conditionalExpression.push(`(${orBody})`);
                        isOrExpression = false;

                    } else {
                        conditionalExpression.push('OR');
                        isOrExpression = true;
                    }
                    break;
                case 0xFE: // goto
                    const labelAddress = this.data.readInt16();
                    this.jumpRel(labelAddress);
                    break;
                default:
                    if (isInsideConditional) { // Use test commands
                        const funcName = LOGIC_TESTS[opCodeNr - 1] || 'UNKNOWN';
                        const testFunc = commands["agi_test_" + funcName];
                        if (testFunc === undefined) {
                            console.log(this.no, this.data.position);
                            throw `Test not implemented: ${funcName} [0x${opCodeNr.toString(16)}]`;
                        }

                        const testFuncArgs = [];
                        let argLen         = testFunc.length; // How many arguments for this testFunc

                        if (opCodeNr === 0x0E) { // said
                            argLen = this.data.readUint8();
                            for (let i = 0; i < argLen; i++) {
                                testFuncArgs.push(this.data.readUint16());
                            }
                        } else {
                            for (let i = 0; i < argLen; i++) {
                                testFuncArgs.push(this.data.readUint8());
                            }
                        }

                        if (isNotExpression) {
                            conditionalExpression.push(`!AGI.commands['agi_test_${funcName}'](${testFuncArgs.join(',')})`);
                            isNotExpression = false;
                        } else {
                            conditionalExpression.push(`AGI.commands['agi_test_${funcName}'](${testFuncArgs.join(',')})`);
                        }
                    } else { // Use AGI command statements
                        const funcName = LOGIC_ACTIONS[opCodeNr] || 'UNKNOWN';

                        let actionFunc = commands["agi_" + funcName];
                        if (actionFunc === undefined) {
                            console.log(this.no, this.data.position);
                            throw `Action not implemented: ${funcName} [0x${opCodeNr.toString(16)}]`;
                        }

                        const actionFuncArgs = [];
                        for (let i = 0; i < actionFunc.length; i++) {
                            actionFuncArgs.push(this.data.readUint8());
                        }

                        commands[`agi_${funcName}`].apply(null, actionFuncArgs);
                    }
                    break;
            }
        }
    }
}

