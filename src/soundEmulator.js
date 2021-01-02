const NoiseShiftRate = {
    NoiseHigh:     0x0,
    NoiseMedium:   0x1,
    NoiseLow:      0x2,
    NoiseBorrowed: 0x3
}

const NoiseFeedbackType = {
    NoisePeriodic: 0x00,
    NoiseWhite:    0x01
}

export const CommandMask = {
    CommandBit:  0x80,
    Register:    0x70,
    Attenuation: 0x0F,
}

const ToneCommandMask = {
    LeastSignificant: 0x0F,
    MostSignificant:  0x3F,
}

const NoiseCommandMask = {
    Feedback:  0x04,
    ShiftRate: 0x03,
}

const NOISE_FREQUENCY_DIVISOR = {
    [NoiseShiftRate.NoiseHigh]:   0x10,
    [NoiseShiftRate.NoiseMedium]: 0x20,
    [NoiseShiftRate.NoiseLow]:    0x40,
};

const BORROWED_VOICE              = 2;
export const NOISE_VOICE          = 3;
export const COMPLETE_ATTENUATION = 0xF;

const BASE_FREQUENCY = 111860;
const MASTER_GAIN    = 0.03;

export default class SoundEmulatorTiSn76496a {
    noiseSourceNode;
    noiseGenerator;
    noiseShiftRegister;
    noiseFeedbackType;
    voiceNodes   = [];
    gains        = [];
    masterGain   = null;
    lastInputBit;
    noiseOutputBit;
    muted        = false;
    audioContext = null;

    constructor(_audioContext) {
        this.audioContext = _audioContext;

        this.processNoiseSample = this.processNoiseSample.bind(this);
        this.noiseShiftRegister = 0x0000;
        this.lastInputBit       = 0;
        this.noiseOutputBit     = 0;
        this.masterGain         = this.audioContext.createGain();
        this.masterGain.gain.setValueAtTime(MASTER_GAIN, this.audioContext.currentTime);
        this.masterGain.connect(this.audioContext.destination);

        // Create noise effect node
        this.noiseGenerator = this.audioContext.createScriptProcessor(4096);
        this.noiseGenerator.addEventListener('audioprocess', this.processNoiseSample);

        // Create 4 square wave tone voices (4th is for base noise frequency)
        for (
            let voice = 0, voiceNode, gain;
            voice < 4;
            voice++
        ) {
            voiceNode      = this.audioContext.createOscillator();
            voiceNode.type = 'square';
            voiceNode.start(0);
            this.voiceNodes.push(voiceNode);
            gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.connect(this.masterGain);
            this.gains.push(gain);
            if (voice === NOISE_VOICE) {
                this.noiseGenerator.connect(gain);
            } else {
                this.voiceNodes[voice].connect(gain);
            }
        }
    }

    activate() {
        this.audioContext.resume();
    }

    deactivate() {
        this.audioContext.suspend();
    }

    updateNoiseSource(command, logger = undefined) {
        logger && (((command & CommandMask.CommandBit) >> 7) !== 1) && logger(`Noise command ${command} not marked as command`);
        const register         = (command & CommandMask.Register) >> 4;
        this.noiseFeedbackType = (command & NoiseCommandMask.Feedback) >> 2;
        const shiftRate        = command & NoiseCommandMask.ShiftRate;

        this.noiseSourceNode && this.noiseSourceNode.disconnect(this.noiseGenerator);

        this.noiseSourceNode = this.processRegister(register, false, true, logger);
        if (shiftRate === NoiseShiftRate.NoiseBorrowed) {
            this.noiseSourceNode = this.voiceNodes[BORROWED_VOICE];
        } else {
            this.setOscillatorFrequency(this.noiseSourceNode, NOISE_FREQUENCY_DIVISOR[shiftRate]);
        }
        this.noiseSourceNode.connect(this.noiseGenerator);
        this.noiseShiftRegister = this.noiseFeedbackType === NoiseFeedbackType.NoisePeriodic ? 0x4000 : 0x0000;
    }

    updateToneSource(command, logger = undefined) {
        const completingByte = command & 0xFF;
        const commandByte    = command >> 8;
        logger && (((commandByte & CommandMask.CommandBit) >> 7) !== 1 || ((completingByte & CommandMask.CommandBit) >> 7) !== 0) && logger(`Tone command ${command} not marked as command`);
        const register         = (commandByte & CommandMask.Register) >> 4;
        const frequencyDivisor = ((completingByte & ToneCommandMask.MostSignificant) << 4) | (commandByte & ToneCommandMask.LeastSignificant);
        logger && (frequencyDivisor > 0 && frequencyDivisor < 6) && logger(`Inaudible tone (divisor=${frequencyDivisor}) given`);

        this.setOscillatorFrequency(this.processRegister(register, false, false, logger), frequencyDivisor);
    }

    updateAttenuator(command, logger = undefined) {
        logger && (((command & CommandMask.CommandBit) >> 7) !== 1) && logger(`Attenuator command ${command} not marked as command`);
        const register    = (command & CommandMask.Register) >> 4;
        const attenuation = command & CommandMask.Attenuation;

        this.setGain(this.processRegister(register, true, false, logger), attenuation);
    }

    processNoiseSample(event) {
        const input  = event.inputBuffer.getChannelData(0);
        const output = event.outputBuffer.getChannelData(0);
        for (let i = 0; i < input.length; i++) {
            output[i] = this.addNoiseToSignal(input[i] < 0 ? 0 : 1);
        }
    }

    addNoiseToSignal(inputBit) {
        if (this.lastInputBit === 0 && inputBit === 1) {
            this.noiseOutputBit     = this.noiseShiftRegister & 0x1;
            const shiftedBit        = (this.noiseFeedbackType === NoiseFeedbackType.NoiseWhite
                ? this.noiseOutputBit ^ ((~this.noiseShiftRegister & 0x2) >> 1)
                : this.noiseOutputBit);
            this.noiseShiftRegister = (this.noiseShiftRegister >> 1) | (shiftedBit << 15);
        }
        this.lastInputBit = inputBit;
        return (inputBit & this.noiseOutputBit) * 2 - 1;
    }

    setOscillatorFrequency(node, divisor) {
        const frequency = divisor === 0 ? 0 : BASE_FREQUENCY / Math.max(divisor, 5.08);
        node.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    }

    setGain(node, attenuation) {
        const gain = attenuation === COMPLETE_ATTENUATION ? 0 : Math.pow(10, (attenuation * -2) / 20);
        node.gain.setValueAtTime(gain, this.audioContext.currentTime);
    }

    processRegister(register, isAttenuator = false, isNoise = false, logger = undefined) {
        const registerType  = register & 0x1;
        const registerVoice = register >> 1;
        if (logger) {
            if (registerType !== 1 && isAttenuator) {
                logger(`Source register ${register} given when attenuator was expected`);
            } else if (!isAttenuator) {
                if (registerType === 1) {
                    logger(`Attenuator register ${register} given when source was expected`);
                } else if (registerVoice !== NOISE_VOICE && isNoise) {
                    logger(`Tone register ${register} given when noise register expected`);
                } else if (registerVoice === NOISE_VOICE && !isNoise) {
                    logger(`Noise register ${register} given when tone register expected`);
                }
            }
        }
        return (isAttenuator ? this.gains : this.voiceNodes)[registerVoice];
    }
}
