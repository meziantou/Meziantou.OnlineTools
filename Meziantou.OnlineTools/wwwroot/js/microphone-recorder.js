let session;
let resultUrl;

export function isSupported() {
    return !!(navigator.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext));
}

export async function start() {
    if (session) {
        throw new Error("A microphone recording is already in progress.");
    }

    revokeResultUrl();

    if (!isSupported()) {
        throw new Error("Microphone recording is not supported by this browser.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentOutput = audioContext.createGain();
    const chunks = [];

    silentOutput.gain.value = 0;
    processor.onaudioprocess = event => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    source.connect(processor);
    processor.connect(silentOutput);
    silentOutput.connect(audioContext.destination);
    await audioContext.resume();

    session = { stream, audioContext, source, processor, silentOutput, chunks };
}

export async function stop() {
    if (!session) {
        throw new Error("No microphone recording is in progress.");
    }

    const currentSession = session;
    session = undefined;

    currentSession.processor.onaudioprocess = null;
    currentSession.source.disconnect();
    currentSession.processor.disconnect();
    currentSession.silentOutput.disconnect();
    currentSession.stream.getTracks().forEach(track => track.stop());
    await currentSession.audioContext.close();

    const blob = encodeWav(currentSession.chunks, currentSession.audioContext.sampleRate);
    resultUrl = URL.createObjectURL(blob);

    return {
        url: resultUrl,
        fileName: createFileName("microphone-recording", "wav"),
        mimeType: blob.type,
    };
}

export async function dispose() {
    if (session) {
        const currentSession = session;
        session = undefined;

        currentSession.processor.onaudioprocess = null;
        currentSession.source.disconnect();
        currentSession.processor.disconnect();
        currentSession.silentOutput.disconnect();
        currentSession.stream.getTracks().forEach(track => track.stop());
        await currentSession.audioContext.close();
    }

    revokeResultUrl();
}

export function download(url, fileName) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

function encodeWav(chunks, sampleRate) {
    const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const buffer = new ArrayBuffer(44 + sampleCount * 2);
    const view = new DataView(buffer);

    writeText(view, 0, "RIFF");
    view.setUint32(4, 36 + sampleCount * 2, true);
    writeText(view, 8, "WAVE");
    writeText(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeText(view, 36, "data");
    view.setUint32(40, sampleCount * 2, true);

    let offset = 44;
    for (const chunk of chunks) {
        for (const sample of chunk) {
            const clampedSample = Math.max(-1, Math.min(1, sample));
            view.setInt16(offset, clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: "audio/wav" });
}

function writeText(view, offset, text) {
    for (let index = 0; index < text.length; index++) {
        view.setUint8(offset + index, text.charCodeAt(index));
    }
}

function revokeResultUrl() {
    if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
        resultUrl = undefined;
    }
}

function createFileName(prefix, extension) {
    return `${prefix}-${new Date().toISOString().replaceAll(":", "-")}.${extension}`;
}
