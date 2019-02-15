namespace Agi {

    const VOICE_END: number = 0xFFFF;
    const TICK_MILLISECONDS: number = 16;

    export class Sound {
        soundEmulator: SoundEmulatorTiSn76496a;
        onFinished: () => void;
        voicesData: Fs.ByteStream[] = [];
        nextNoteHandle: number[] = [];

        constructor(stream: Fs.ByteStream) {
            var prevOffset = stream.startPosition + stream.readUint16();
            for (var i = 0; i < 3; i++) {
                var offset = stream.startPosition + stream.readUint16();
                this.voicesData.push(new Fs.ByteStream(stream.buffer, prevOffset, offset));
                prevOffset = offset;
            }
            this.voicesData.push(new Fs.ByteStream(stream.buffer, prevOffset, stream.startPosition + stream.length));
        }

        play(soundEmulator: SoundEmulatorTiSn76496a, onFinished: () => void): void {
            this.onFinished = onFinished;
            this.soundEmulator = soundEmulator;
            for (var i = 0; i < 4; i++) {
                this.voicesData[i].position = 0;
                this.processNote(i);
            }
            this.soundEmulator.activate();
        }

        stop() {
            this.soundEmulator.deactivate();
            for (var i = 0; i < 4; i++) {
                this.silenceVoice(i);
            }
            this.onFinished && this.onFinished();
        }

        private processNote(voiceIndex: number): void {
            var voiceData: Fs.ByteStream = this.voicesData[voiceIndex];
            var duration: number = voiceData.readUint16();
            if (duration === VOICE_END) {
                this.silenceVoice(voiceIndex);
                console.debug(`Voice ${voiceIndex} finished`);
                var allVoicesFinished = true;
                for (var i = 0; i < 4; i++) {
                    var voiceFinished = this.voicesData[i].position === this.voicesData[i].length;
                    allVoicesFinished = allVoicesFinished && voiceFinished;
                }
                allVoicesFinished && this.stop();
            } else {
                var getLogger: (number) => Logger =
                        position => message => console.debug(`${message} in ${voiceIndex === NOISE_VOICE ? 'noise' : `tone`} voice ${voiceIndex} at ${position}`);
                if (voiceIndex === NOISE_VOICE) {
                    (voiceData.readUint8() !== 0) && getLogger(voiceData.position - 1)(`Non-empty padding byte`);
                    this.soundEmulator.updateNoiseSource(voiceData.readUint8(), getLogger(voiceData.position - 1));
                } else {
                    this.soundEmulator.updateToneSource(voiceData.readUint16(), getLogger(voiceData.position - 2));
                }
                this.soundEmulator.updateAttenuator(voiceData.readUint8(), getLogger(voiceData.position - 1));
                this.nextNoteHandle[voiceIndex] = setTimeout(() => {
                    this.processNote(voiceIndex);
                }, duration * TICK_MILLISECONDS);
            }
        }

        silenceVoice(voiceIndex: number) {
            var register = (voiceIndex << 1) | 0x01;
            this.soundEmulator.updateAttenuator(CommandMask.CommandBit | (register << 4) | COMPLETE_ATTENUATION);
            this.nextNoteHandle[voiceIndex] && clearTimeout(this.nextNoteHandle[voiceIndex]);
        }
    }
}
