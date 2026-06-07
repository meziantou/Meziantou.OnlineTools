let session;
let resultUrl;

export function isSupported() {
    return !!(navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder);
}

export async function start(includeSystemAudio, includeMicrophone, dotNetReference) {
    if (session) {
        throw new Error("A screen recording is already in progress.");
    }

    revokeResultUrl();

    if (!isSupported()) {
        throw new Error("Screen recording is not supported by this browser.");
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: includeSystemAudio,
        systemAudio: includeSystemAudio ? "include" : "exclude",
    });

    let microphoneStream;
    let audioContext;

    try {
        if (includeMicrophone) {
            microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        const outputStream = new MediaStream(displayStream.getVideoTracks());
        const audioTracks = [
            ...displayStream.getAudioTracks(),
            ...(microphoneStream?.getAudioTracks() ?? []),
        ];

        if (audioTracks.length === 1) {
            outputStream.addTrack(audioTracks[0]);
        } else if (audioTracks.length > 1) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContext();
            const destination = audioContext.createMediaStreamDestination();

            for (const track of audioTracks) {
                const source = audioContext.createMediaStreamSource(new MediaStream([track]));
                source.connect(destination);
            }

            outputStream.addTrack(destination.stream.getAudioTracks()[0]);
            await audioContext.resume();
        }

        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(outputStream, mimeType ? { mimeType } : undefined);
        const chunks = [];

        recorder.ondataavailable = event => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        session = {
            displayStream,
            microphoneStream,
            outputStream,
            audioContext,
            recorder,
            chunks,
            dotNetReference,
            stopping: false,
        };

        const videoTrack = displayStream.getVideoTracks()[0];
        videoTrack.onended = () => stopAndNotify();
        recorder.start(1000);
    } catch (error) {
        displayStream.getTracks().forEach(track => track.stop());
        microphoneStream?.getTracks().forEach(track => track.stop());
        await audioContext?.close();
        throw error;
    }
}

export async function stop() {
    if (!session) {
        throw new Error("No screen recording is in progress.");
    }

    return await finishRecording(session);
}

export async function dispose() {
    if (session) {
        const currentSession = session;
        session = undefined;
        currentSession.stopping = true;
        clearEndHandler(currentSession);
        currentSession.recorder.ondataavailable = null;
        currentSession.recorder.onstop = null;
        if (currentSession.recorder.state !== "inactive") {
            currentSession.recorder.stop();
        }

        stopTracks(currentSession);
        await currentSession.audioContext?.close();
    }

    revokeResultUrl();
}

export function download(url, fileName) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
}

async function stopAndNotify() {
    if (!session || session.stopping) {
        return;
    }

    const currentSession = session;

    try {
        const result = await finishRecording(currentSession);
        await currentSession.dotNetReference.invokeMethodAsync("OnRecordingStopped", result);
    } catch (error) {
        await currentSession.dotNetReference.invokeMethodAsync("OnRecordingFailed", getErrorMessage(error));
    }
}

async function finishRecording(currentSession) {
    if (currentSession.stopping) {
        throw new Error("The screen recording is already stopping.");
    }

    currentSession.stopping = true;
    clearEndHandler(currentSession);

    const blob = await new Promise((resolve, reject) => {
        currentSession.recorder.onerror = event => reject(event.error);
        currentSession.recorder.onstop = () => {
            const type = currentSession.recorder.mimeType || currentSession.chunks[0]?.type || "video/webm";
            resolve(new Blob(currentSession.chunks, { type }));
        };
        currentSession.recorder.stop();
    });

    stopTracks(currentSession);
    await currentSession.audioContext?.close();

    if (session === currentSession) {
        session = undefined;
    }

    const extension = blob.type.includes("mp4") ? "mp4" : "webm";
    resultUrl = URL.createObjectURL(blob);

    return {
        url: resultUrl,
        fileName: createFileName("screen-recording", extension),
        mimeType: blob.type,
    };
}

function stopTracks(currentSession) {
    currentSession.outputStream.getTracks().forEach(track => track.stop());
    currentSession.displayStream.getTracks().forEach(track => track.stop());
    currentSession.microphoneStream?.getTracks().forEach(track => track.stop());
}

function clearEndHandler(currentSession) {
    const videoTrack = currentSession.displayStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.onended = null;
    }
}

function getSupportedMimeType() {
    const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
    ];

    return mimeTypes.find(mimeType => MediaRecorder.isTypeSupported(mimeType));
}

function getErrorMessage(error) {
    return error?.message ?? error?.toString() ?? "The recording could not be completed.";
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
