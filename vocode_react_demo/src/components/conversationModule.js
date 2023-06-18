import React from "react";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const extendable_media_recorder_1 = require("extendable-media-recorder");
const extendable_media_recorder_wav_encoder_1 = require("extendable-media-recorder-wav-encoder");
const utils_1 = require("vocode/dist/utils");
const react_device_detect_1 = require("react-device-detect");
const buffer_1 = require("buffer");
const VOCODE_API_URL = "api.vocode.dev";
const DEFAULT_CHUNK_SIZE = 2048;
export const useConversation = (config) => {
    const [audioContext, setAudioContext] = React.useState();
    const [audioAnalyser, setAudioAnalyser] = React.useState();
    const [audioQueue, setAudioQueue] = React.useState([]);
    const [processing, setProcessing] = React.useState(false);
    const [recorder, setRecorder] = React.useState();
    const [socket, setSocket] = React.useState();
    const [status, setStatus] = React.useState("idle");
    const [error, setError] = React.useState();
    const [transcripts, setTranscripts] = React.useState([]);
    // get audio context and metadata about user audio
    React.useEffect(() => {
        const audioContext = new AudioContext();
        setAudioContext(audioContext);
        const audioAnalyser = audioContext.createAnalyser();
        setAudioAnalyser(audioAnalyser);
    }, []);
    // once the conversation is connected, stream the microphone audio into the socket
    React.useEffect(() => {
        if (!recorder || !socket)
            return;
        if (status === "connected") {
            recorder.addEventListener("dataavailable", ({ data }) => {
                (0, utils_1.blobToBase64)(data).then((base64Encoded) => {
                    if (!base64Encoded)
                        return;
                    const audioMessage = {
                        type: "websocket_audio",
                        data: base64Encoded,
                    };
                    socket.readyState === WebSocket.OPEN &&
                        socket.send((0, utils_1.stringify)(audioMessage));
                });
            });
        }
    }, [recorder, socket, status]);
    // accept wav audio from webpage
    React.useEffect(() => {
        const registerWav = () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, extendable_media_recorder_1.register)(yield (0, extendable_media_recorder_wav_encoder_1.connect)());
        });
        registerWav().catch(console.error);
    }, []);
    // play audio that is queued
    React.useEffect(() => {
        const playArrayBuffer = (arrayBuffer) => {
            audioContext &&
                audioAnalyser &&
                audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                    const source = audioContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(audioContext.destination);
                    source.connect(audioAnalyser);
                    source.start(0);
                    source.onended = () => {
                        setProcessing(false);
                    };
                });
        };
        if (!processing && audioQueue.length > 0) {
            setProcessing(true);
            const audio = audioQueue.shift();
            audio &&
                fetch(URL.createObjectURL(new Blob([audio])))
                    .then((response) => response.arrayBuffer())
                    .then(playArrayBuffer);
        }
    }, [audioQueue, processing]);
    const stopConversation = (error) => {
        setAudioQueue([]);
        if (error) {
            setError(error);
            setStatus("error");
        }
        else {
            setStatus("idle");
        }
        if (!recorder || !socket)
            return;
        recorder.stop();
        const stopMessage = {
            type: "websocket_stop",
        };
        socket.send((0, utils_1.stringify)(stopMessage));
        socket.close();
    };
    const getBackendUrl = () => __awaiter(void 0, void 0, void 0, function* () {
        if ("backendUrl" in config) {
            return config.backendUrl;
        }
        else if ("vocodeConfig" in config) {
            const baseUrl = config.vocodeConfig.baseUrl || VOCODE_API_URL;
            const resp = yield fetch(`https://${baseUrl}/auth/token`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.vocodeConfig.apiKey}`,
                },
            });
            const data = yield resp.json();
            const token = data.token;
            return `wss://${baseUrl}/conversation?key=${token}`;
        }
        else {
            throw new Error("Invalid config");
        }
    });
    const getStartMessage = (config, inputAudioMetadata, outputAudioMetadata, selfHostedConversationConfig) => {
        let transcriberConfig = Object.assign(config.transcriberConfig, inputAudioMetadata);
        if (react_device_detect_1.isSafari && transcriberConfig.type === "transcriber_deepgram") {
            transcriberConfig.downsampling = 2;
        }
        return {
            type: "websocket_audio_config_start",
            transcriberConfig: Object.assign(config.transcriberConfig, inputAudioMetadata),
            agentConfig: config.agentConfig,
            synthesizerConfig: Object.assign(config.synthesizerConfig, outputAudioMetadata),
            conversationId: config.vocodeConfig.conversationId,
            subscribeTranscript: selfHostedConversationConfig.subscribeTranscript,
            inputAudioConfig: {
                samplingRate: inputAudioMetadata.samplingRate,
                audioEncoding: inputAudioMetadata.audioEncoding,
                chunkSize: selfHostedConversationConfig.chunkSize || DEFAULT_CHUNK_SIZE,
                downsampling: selfHostedConversationConfig.downsampling,
            },
            outputAudioConfig: {
                samplingRate: outputAudioMetadata.samplingRate,
                audioEncoding: outputAudioMetadata.audioEncoding,
            },
        };
    };
    const getAudioConfigStartMessage = (inputAudioMetadata, outputAudioMetadata, chunkSize, downsampling, conversationId, subscribeTranscript) => ({
        type: "websocket_audio_config_start",
        inputAudioConfig: {
            samplingRate: inputAudioMetadata.samplingRate,
            audioEncoding: inputAudioMetadata.audioEncoding,
            chunkSize: chunkSize || DEFAULT_CHUNK_SIZE,
            downsampling,
        },
        outputAudioConfig: {
            samplingRate: outputAudioMetadata.samplingRate,
            audioEncoding: outputAudioMetadata.audioEncoding,
        },
        conversationId,
        subscribeTranscript,
    });
    const startConversation = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!audioContext || !audioAnalyser)
            return;
        setStatus("connecting");
        if (!react_device_detect_1.isSafari && !react_device_detect_1.isChrome) {
            stopConversation(new Error("Unsupported browser"));
            return;
        }
        if (audioContext.state === "suspended") {
            audioContext.resume();
        }
        const backendUrl = yield getBackendUrl();
        setError(undefined);
        const socket = new WebSocket(backendUrl);
        let error;
        socket.onerror = (event) => {
            console.error(event);
            error = new Error("See console for error details");
        };
        socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "websocket_audio") {
                setAudioQueue((prev) => [...prev, buffer_1.Buffer.from(message.data, "base64")]);
            }
            else if (message.type === "websocket_ready") {
                setStatus("connected");
            }
            else if (message.type == "websocket_transcript") {
                setTranscripts((prev) => {
                    let last = prev.pop();
                    if (last && last.sender === message.sender) {
                        prev.push({
                            sender: message.sender,
                            text: last.text + " " + message.text
                        });
                    }
                    else {
                        if (last) {
                            prev.push(last);
                        }
                        prev.push({
                            sender: message.sender,
                            text: message.text
                        });
                    }
                    return prev;
                });
            }
        };
        socket.onclose = () => {
            stopConversation(error);
        };
        setSocket(socket);
        // wait for socket to be ready
        yield new Promise((resolve) => {
            const interval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 100);
        });
        let audioStream;
        try {
            const trackConstraints = {
                echoCancellation: true,
            };
            if (config.audioDeviceConfig.inputDeviceId) {
                console.log("Using input device", config.audioDeviceConfig.inputDeviceId);
                trackConstraints.deviceId = config.audioDeviceConfig.inputDeviceId;
            }
            audioStream = yield navigator.mediaDevices.getUserMedia({
                video: false,
                audio: trackConstraints,
            });
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "NotAllowedError") {
                alert("Allowlist this site at chrome://settings/content/microphone to talk to the bot.");
                error = new Error("Microphone access denied");
            }
            console.error(error);
            stopConversation(error);
            return;
        }
        const micSettings = audioStream.getAudioTracks()[0].getSettings();
        console.log(micSettings);
        const inputAudioMetadata = {
            samplingRate: micSettings.sampleRate || audioContext.sampleRate,
            audioEncoding: "linear16",
        };
        console.log("Input audio metadata", inputAudioMetadata);
        const outputAudioMetadata = {
            samplingRate: config.audioDeviceConfig.outputSamplingRate || audioContext.sampleRate,
            audioEncoding: "linear16",
        };
        console.log("Output audio metadata", inputAudioMetadata);
        let startMessage;
        if ([
            "transcriberConfig",
            "agentConfig",
            "synthesizerConfig",
            "vocodeConfig",
        ].every((key) => key in config)) {
            const selfHostedConversationConfig = config;
            startMessage = getStartMessage(config, inputAudioMetadata, outputAudioMetadata, selfHostedConversationConfig);
        }
        else {
            const selfHostedConversationConfig = config;
            startMessage = getAudioConfigStartMessage(inputAudioMetadata, outputAudioMetadata, selfHostedConversationConfig.chunkSize, selfHostedConversationConfig.downsampling, selfHostedConversationConfig.conversationId, selfHostedConversationConfig.subscribeTranscript);
        }
        socket.send((0, utils_1.stringify)(startMessage));
        console.log("Access to microphone granted");
        console.log(startMessage);
        let recorderToUse = recorder;
        if (recorderToUse && recorderToUse.state === "paused") {
            recorderToUse.resume();
        }
        else if (!recorderToUse) {
            recorderToUse = new extendable_media_recorder_1.MediaRecorder(audioStream, {
                mimeType: "audio/wav",
            });
            setRecorder(recorderToUse);
        }
        let timeSlice;
        if ("transcriberConfig" in startMessage) {
            timeSlice = Math.round((1000 * startMessage.transcriberConfig.chunkSize) /
                startMessage.transcriberConfig.samplingRate);
        }
        else if ("timeSlice" in config) {
            timeSlice = config.timeSlice;
        }
        else {
            timeSlice = 10;
        }
        if (recorderToUse.state === "recording") {
            // When the recorder is in the recording state, see:
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/state
            // which is not expected to call `start()` according to:
            // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/start.
            return;
        }
        recorderToUse.start(timeSlice);
    });
    return {
        status,
        start: startConversation,
        stop: stopConversation,
        error,
        analyserNode: audioAnalyser,
        transcripts,
    };
};
