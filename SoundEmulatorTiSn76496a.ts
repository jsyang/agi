namespace Agi {

    export enum NoiseShiftRate {
        NoiseHigh = 0x0,
        NoiseMedium = 0x1,
        NoiseLow = 0x2,
        NoiseBorrowed = 0x3
    }

    export enum NoiseFeedbackType {
        NoisePeriodic = 0x00,
        NoiseWhite = 0x01
    }

    export enum CommandMask {
        CommandBit = 0x80,
        Register = 0x70,
        Attenuation = 0x0F,
    }

    export enum ToneCommandMask  {
        LeastSignificant = 0x0F,
        MostSignificant = 0x3F,
    }

    export enum NoiseCommandMask  {
        Feedback = 0x04,
        ShiftRate = 0x03,
    }

    export const NOISE_FREQUENCY_DIVISOR = {
        [NoiseShiftRate.NoiseHigh]: 0x10,
        [NoiseShiftRate.NoiseMedium]: 0x20,
        [NoiseShiftRate.NoiseLow]: 0x40,
    };

    export const BORROWED_VOICE: number = 2;
    export const NOISE_VOICE: number = 3;
    export const COMPLETE_ATTENUATION = 0xF;

    const BASE_FREQUENCY: number = 111860;

    export interface Logger {
        (message: string): void,
    }

    export class SoundEmulatorTiSn76496a {

        noiseSourceNode: OscillatorNode;
        noiseGenerator: ScriptProcessorNode;
        noiseShiftRegister: number;
        noiseFeedbackType: NoiseFeedbackType;
        voiceNodes: OscillatorNode[] = [];
        gains: GainNode[] = [];
        lastInputBit: number;
        noiseOutputBit: number;

        constructor(private audioContext) {
            this.processNoiseSample = this.processNoiseSample.bind(this);
            this.noiseShiftRegister = 0x0000;
            this.lastInputBit = 0;
            this.noiseOutputBit = 0;

            // Create noise effect node
            this.noiseGenerator = this.audioContext.createScriptProcessor(4096);
            this.noiseGenerator.addEventListener('audioprocess', this.processNoiseSample);

            // Create 4 square wave tone voices (4th is for base noise frequency)
            for (
                var voice: number = 0, voiceNode: OscillatorNode, gain: GainNode;
                voice < 4;
                voice++
            ) {
                voiceNode = this.audioContext.createOscillator();
                voiceNode.type = 'square';
                voiceNode.start(0);
                this.voiceNodes.push(voiceNode);
                gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0, this.audioContext.currentTime);
                gain.connect(this.audioContext.destination);
                this.gains.push(gain);
                if (voice === NOISE_VOICE) {
                    this.noiseGenerator.connect(gain);
                } else {
                    this.voiceNodes[voice].connect(gain);
                }
            }
        }

        activate(): void {
            this.audioContext.resume();
        }

        deactivate(): void {
            this.audioContext.suspend();
        }

        updateNoiseSource(command: number, logger: Logger = undefined): void {
            logger && (((command & CommandMask.CommandBit) >> 7) !== 1) && logger(`Noise command ${command} not marked as command`);
            var register: number = (command & CommandMask.Register) >> 4;
            this.noiseFeedbackType = (command & NoiseCommandMask.Feedback) >> 2;
            var shiftRate: NoiseShiftRate = command & NoiseCommandMask.ShiftRate;

            this.noiseSourceNode && this.noiseSourceNode.disconnect(this.noiseGenerator);

            this.noiseSourceNode = <OscillatorNode>this.processRegister(register, false, true, logger);
            if (shiftRate === NoiseShiftRate.NoiseBorrowed) {
                this.noiseSourceNode = this.voiceNodes[BORROWED_VOICE];
            } else {
                this.setOscillatorFrequency(this.noiseSourceNode, NOISE_FREQUENCY_DIVISOR[shiftRate]);
            }
            this.noiseSourceNode.connect(this.noiseGenerator);
            this.noiseShiftRegister = this.noiseFeedbackType === NoiseFeedbackType.NoisePeriodic ? 0x4000 : 0x0000;
        }

        updateToneSource(command: number, logger: Logger = undefined): void {
            var completingByte = command & 0xFF;
            var commandByte = command >> 8;
            logger && (((commandByte & CommandMask.CommandBit) >> 7) !== 1 || ((completingByte & CommandMask.CommandBit) >> 7) !== 0) && logger(`Tone command ${command} not marked as command`);
            var register: number = (commandByte & CommandMask.Register) >> 4;
            var frequencyDivisor: number = ((completingByte & ToneCommandMask.MostSignificant) << 4) | (commandByte & ToneCommandMask.LeastSignificant);
            logger && (frequencyDivisor > 0 && frequencyDivisor < 6) && logger(`Inaudible tone (divisor=${frequencyDivisor}) given`);

            this.setOscillatorFrequency(<OscillatorNode>this.processRegister(register, false, false, logger), frequencyDivisor);
        }

        updateAttenuator(command: number, logger: Logger = undefined): void {
            logger && (((command & CommandMask.CommandBit) >> 7) !== 1) && logger(`Attenuator command ${command} not marked as command`);
            var register: number = (command & CommandMask.Register) >> 4;
            var attenuation: number = command & CommandMask.Attenuation;

            this.setGain(<GainNode>this.processRegister(register, true, false, logger), attenuation);
        }

        private processNoiseSample(event: AudioProcessingEvent): void {
            var input = event.inputBuffer.getChannelData(0);
            var output = event.outputBuffer.getChannelData(0);
            for (var i = 0; i < input.length; i++) {
                output[i] = this.addNoiseToSignal(input[i] < 0 ? 0 : 1);
            }
        }

        private addNoiseToSignal(inputBit: number): number {
            if (this.lastInputBit === 0 && inputBit === 1) {
                this.noiseOutputBit = this.noiseShiftRegister & 0x1;
                var shiftedBit = (this.noiseFeedbackType === NoiseFeedbackType.NoiseWhite
                    ? this.noiseOutputBit ^ ((~this.noiseShiftRegister & 0x2) >> 1)
                    : this.noiseOutputBit);
                this.noiseShiftRegister = (this.noiseShiftRegister >> 1) | (shiftedBit << 15);
            }
            this.lastInputBit = inputBit;
            return (inputBit & this.noiseOutputBit) * 2 - 1;
        }

        private setOscillatorFrequency(node: OscillatorNode, divisor: number): void {
            var frequency: number = divisor === 0 ? 0 : BASE_FREQUENCY / Math.max(divisor, 5.08);
            node.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        }

        private setGain(node: GainNode, attenuation: number): void {
            var gain: number = attenuation === COMPLETE_ATTENUATION ? 0 : Math.pow(10, (attenuation * -2) / 20);
            node.gain.setValueAtTime(gain, this.audioContext.currentTime);
        }

        private processRegister(register: number, isAttenuator: boolean = false, isNoise = false, logger: Logger = undefined): AudioNode {
            var registerType: number = register & 0x1;
            var registerVoice: number = register >> 1;
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
}