namespace Agi {

    const VOICE_END: number = 0xFFFF;

    export class Sound {
        soundEmulator: SoundEmulatorTiSn76496a;
        onFinished: () => void;
        voicesData: Fs.ByteStream[] = [];

        constructor(stream: Fs.ByteStream) {
            var prevOffset = stream.readUint16();
            for (var i = 0; i < 3; i++) {
                var offset = stream.readUint16();
                this.voicesData.push(new Fs.ByteStream(stream.buffer, prevOffset, offset));
                prevOffset = offset;
            }
            this.voicesData.push(new Fs.ByteStream(stream.buffer, prevOffset, stream.length));
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
            this.onFinished && this.onFinished();
        }

        private processNote(voiceIndex: number): void {
            var voiceData: Fs.ByteStream = this.voicesData[voiceIndex];
            var duration: number = voiceData.readUint16();
            if (duration === VOICE_END) {
                var register = (voiceIndex << 1) | 0x01;
                this.soundEmulator.updateAttenuator(CommandMask.CommandBit | (register << 4) | COMPLETE_ATTENUATION);
                var allVoicesFinished = true;
                for (var i = 0; i < 4; i++) {
                    var voiceFinished = this.voicesData[i].position === this.voicesData[i].length;
                    voiceFinished && console.debug(`Voice ${i} finished`);
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
                setTimeout(() => {
                    this.processNote(voiceIndex);
                }, duration);
            }
        }
    }
}
