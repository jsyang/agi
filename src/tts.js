const DEFAULT_OPTIONS = {
    name:  'Google UK English Male',
    rate:  1.2,
    pitch: 0,
    index: 0,
};

let selected = {};

const availableVoices = [];

let isNativeTTSSupported = true;

function init() {
    if (!window.speechSynthesis) {
        isNativeTTSSupported = false;
        alert('Native text-to-speech functionality not available!');
        return;
    }

    selected = JSON.parse(
        localStorage.getItem('tts') || '{}'
    ) || {};

    selected.name  = selected.name || DEFAULT_OPTIONS.name;
    selected.rate  = selected.rate || DEFAULT_OPTIONS.rate;
    selected.pitch = selected.pitch || DEFAULT_OPTIONS.pitch;

    speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices().forEach(v =>
            availableVoices.push(v)
        );

        selectVoiceByName(selected.name);
    };
}

function selectVoiceByName(n) {
    if (!isNativeTTSSupported) return;

    if (!n) return;

    const reNameTest      = new RegExp(n, 'i');
    const foundVoiceIndex = availableVoices.findIndex(v => reNameTest.test(v.name));
    const foundVoice      = availableVoices[foundVoiceIndex];

    if (!foundVoice) return;

    selected.name  = foundVoice.name;
    selected.index = foundVoiceIndex;

    localStorage.setItem('tts', JSON.stringify(selected));
}

const stop = () => speechSynthesis.cancel();

function say(t) {
    if (!isNativeTTSSupported) return;

    const utterance  = new SpeechSynthesisUtterance(t);
    utterance.voice  = availableVoices[selected.index];
    utterance.rate   = selected.rate;
    utterance.pitch  = selected.pitch;
    utterance.volume = 1;

    stop();
    speechSynthesis.speak(utterance);
}

const getVoices = () => availableVoices.map(v => v.name);

export default {
    init,
    getVoices,
    selectVoiceByName,
    say,
    stop,
}
