/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's pooiod/Dictation.js, moved into
// the VM as a built-in extension. Section 111 rewrote it for offline speech recognition (same id and blocks).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// name: Dictation
// id: pooiod7Dictation
// description: Offline speech to text (English) with Moonshine; blocks from Dictation v1.3 by pooiod7.
// license: MIT
//
// Speech is recognized on this computer with Moonshine Base (English) by Useful Sensors, Inc. (dba
// Moonshine AI, https://github.com/moonshine-ai/moonshine, MIT) in its ONNX export by onnx-community
// (https://huggingface.co/onnx-community/moonshine-base-ONNX); Silero VAD (https://github.com/snakers4/silero-vad,
// MIT) hears when speech starts and ends. Both run in onnxruntime-web (MIT) in a worker. The microphone is
// on only while a block listens. The files come from the app (https://studio.penguinmod.com/__speech__/),
// which downloads them once; nothing is sent anywhere.
(function (Scratch) {
    "use strict";
    if (!Scratch.extensions.unsandboxed) throw new Error("Dictation must run unsandboxed");

    const vm = Scratch.vm;
    const runtime = vm.runtime;
    const ID = "pooiod7Dictation";
    const BASE = globalThis.pmSpeechBase || "https://studio.penguinmod.com/__speech__/";
    const PACKS = ["onnxruntime", "silero-vad", "moonshine-english"];
    const MIT = { license: "MIT", needsCredit: true };
    const CREDITS = [
        Object.assign({ title: "Moonshine (speech recognition)", by: "Moonshine AI", url: "https://github.com/moonshine-ai/moonshine",
            licenseUrl: "https://github.com/moonshine-ai/moonshine/blob/main/LICENSE" }, MIT),
        Object.assign({ title: "Silero VAD", by: "Silero Team", url: "https://github.com/snakers4/silero-vad",
            licenseUrl: "https://github.com/snakers4/silero-vad/blob/master/LICENSE" }, MIT),
    ];

    // ------------------------------------------------------------------------------------------
    // The worker: hears speech in the microphone frames (Silero VAD) and turns it into text
    // (Moonshine), one listening at a time
    // ------------------------------------------------------------------------------------------
    function workerMain() {
        const RATE = 16000;
        const FRAME = 512; // 32 ms, the size Silero VAD takes at 16 kHz
        const SPEECH = 0.5; // a frame with at least this speech probability is speech,
        const QUIET = 0.35; // one below this is quiet
        const PRE_ROLL = 10; // frames kept from before speech starts (0.32 s)
        const END_QUIET = 32; // listening ends after 1 s of quiet following speech,
        const MAX_SPEECH = 20 * RATE / FRAME; // after 20 s of speech,
        const NO_SPEECH = 8 * RATE / FRAME; // or after 8 s without speech (text "")
        const MIN_SPEECH = 8; // speech frames needed (0.26 s); shorter sounds are ignored
        let base = "";
        let ort = null;
        let vad = null;
        let asr = null;
        let job = null;

        const create = (url) => ort.InferenceSession.create(url, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
        async function load() {
            if (!ort) {
                ort = await import(/* webpackIgnore: true */ base + "onnxruntime/ort.wasm.bundle.min.mjs");
                ort.env.wasm.wasmPaths = { wasm: base + "onnxruntime/ort-wasm-simd-threaded.wasm" };
                ort.env.wasm.numThreads = typeof SharedArrayBuffer !== "undefined" ? Math.min(navigator.hardwareConcurrency || 4, 4) : 1;
            }
            if (!vad) vad = await create(base + "silero-vad/silero_vad.onnx");
            if (!asr) {
                const dir = base + "moonshine-english/";
                const res = await fetch(dir + "tokenizer.json");
                if (!res.ok) throw new Error("tokenizer.json: " + res.status);
                const tokenizer = await res.json();
                const vocab = [];
                for (const piece of Object.keys(tokenizer.model.vocab)) vocab[tokenizer.model.vocab[piece]] = piece;
                for (const added of tokenizer.added_tokens) vocab[added.id] = added.content;
                asr = { encoder: await create(dir + "encoder_model_quantized.onnx"), decoder: await create(dir + "decoder_model_merged_quantized.onnx"), vocab };
            }
        }

        // Moonshine: encoder once, then the decoder one token at a time (greedy, with its cache)
        async function transcribe(audio) {
            const { encoder, decoder, vocab } = asr;
            const hidden = (await encoder.run({ input_values: new ort.Tensor("float32", audio, [1, audio.length]) })).last_hidden_state;
            const layers = 8;
            const empty = new ort.Tensor("float32", new Float32Array(0), [1, 8, 0, 52]);
            let past = {};
            for (let l = 0; l < layers; l++) {
                for (const part of ["decoder", "encoder"]) for (const kv of ["key", "value"]) past[`past_key_values.${l}.${part}.${kv}`] = empty;
            }
            const ids = [];
            let last = 1; // <s>
            const maxTokens = Math.ceil(audio.length / RATE * 6.5) + 4;
            for (let step = 0; step < maxTokens; step++) {
                const out = await decoder.run(Object.assign({
                    input_ids: new ort.Tensor("int64", BigInt64Array.from([BigInt(last)]), [1, 1]),
                    encoder_hidden_states: hidden,
                    use_cache_branch: new ort.Tensor("bool", [step > 0], [1]),
                }, past));
                const logits = out.logits.data;
                let best = 0;
                for (let i = 1; i < logits.length; i++) if (logits[i] > logits[best]) best = i;
                if (best === 2) break; // </s>
                ids.push(best);
                last = best;
                const next = {};
                for (let l = 0; l < layers; l++) {
                    for (const kv of ["key", "value"]) {
                        next[`past_key_values.${l}.decoder.${kv}`] = out[`present.${l}.decoder.${kv}`];
                        // the encoder part is computed in the first step only
                        next[`past_key_values.${l}.encoder.${kv}`] = step === 0 ? out[`present.${l}.encoder.${kv}`] : past[`past_key_values.${l}.encoder.${kv}`];
                    }
                }
                past = next;
            }
            const bytes = [];
            const encoderText = new TextEncoder();
            for (const id of ids) {
                const piece = vocab[id] || "";
                const byte = /^<0x([0-9A-Fa-f]{2})>$/.exec(piece);
                if (byte) bytes.push(parseInt(byte[1], 16));
                else if (!/^<.*>$/.test(piece)) bytes.push.apply(bytes, encoderText.encode(piece.replace(/▁/g, " ")));
            }
            return new TextDecoder().decode(new Uint8Array(bytes)).trim();
        }

        const reply = (id, data) => self.postMessage(Object.assign({ id }, data));
        function finish(audio) {
            const done = job;
            job = null;
            reply(done.id, { type: "heard" }); // the microphone can stop
            if (!audio) return reply(done.id, { type: "done", text: "" });
            transcribe(audio).then((result) => reply(done.id, { type: "done", text: result }),
                (error) => reply(done.id, { type: "error", error: String((error && error.message) || error) }));
        }

        // Runs the voice detector over the frames received so far, in order
        async function pump() {
            if (!job || job.busy || !job.ready) return;
            job.busy = true;
            const current = job;
            try {
                while (job === current && current.queued.length - current.read >= FRAME) {
                    const frame = current.queued.slice(current.read, current.read + FRAME);
                    current.read += FRAME;
                    const input = new Float32Array(64 + FRAME);
                    input.set(current.context);
                    input.set(frame, 64);
                    current.context = frame.slice(FRAME - 64);
                    const out = await vad.run({ input: new ort.Tensor("float32", input, [1, 64 + FRAME]), state: current.state, sr: current.sr });
                    current.state = out.stateN;
                    if (job !== current) break;
                    step(current, frame, out.output.data[0]);
                }
                if (job === current && current.read > RATE) { // drop what has been read
                    current.queued = current.queued.slice(current.read);
                    current.read = 0;
                }
            } catch (error) {
                if (job === current) {
                    job = null;
                    reply(current.id, { type: "heard" });
                    reply(current.id, { type: "error", error: String((error && error.message) || error) });
                }
            } finally {
                current.busy = false;
            }
        }
        function step(current, frame, probability) {
            current.frames++;
            if (!current.speech) {
                current.preRoll.push(frame);
                if (current.preRoll.length > PRE_ROLL) current.preRoll.shift();
                if (probability >= SPEECH) {
                    current.speech = current.preRoll.slice();
                    current.preRoll = [];
                    current.voiced = 1;
                    current.quiet = 0;
                } else if (current.frames >= NO_SPEECH) {
                    finish(null);
                }
                return;
            }
            current.speech.push(frame);
            if (probability >= SPEECH) current.voiced++;
            current.quiet = probability < QUIET ? current.quiet + 1 : 0;
            if (current.quiet >= END_QUIET || current.speech.length >= MAX_SPEECH) {
                if (current.voiced < MIN_SPEECH) { // a click or a cough: keep listening
                    current.speech = null;
                    if (current.frames >= NO_SPEECH) finish(null);
                    return;
                }
                const audio = new Float32Array(current.speech.length * FRAME);
                current.speech.forEach((f, i) => audio.set(f, i * FRAME));
                finish(audio);
            }
        }

        self.onmessage = (event) => {
            const message = event.data;
            if (message.type === "init") {
                base = message.data.base;
            } else if (message.type === "start") {
                job = { id: message.id, ready: false, busy: false, queued: new Float32Array(0), read: 0, context: new Float32Array(64),
                    state: null, sr: null, frames: 0, preRoll: [], speech: null, voiced: 0, quiet: 0 };
                const current = job;
                load().then(() => {
                    if (job !== current) return;
                    current.state = new ort.Tensor("float32", new Float32Array(2 * 128), [2, 1, 128]);
                    current.sr = new ort.Tensor("int64", BigInt64Array.from([BigInt(RATE)]), []);
                    current.ready = true;
                    reply(current.id, { type: "listening" });
                    pump();
                }, (error) => {
                    if (job !== current) return;
                    job = null;
                    reply(current.id, { type: "heard" });
                    reply(current.id, { type: "error", error: String((error && error.message) || error) });
                });
            } else if (message.type === "audio") {
                if (!job || job.id !== message.id) return;
                const joined = new Float32Array(job.queued.length + message.samples.length);
                joined.set(job.queued);
                joined.set(message.samples, job.queued.length);
                job.queued = joined;
                pump();
            } else if (message.type === "stop") {
                if (job && job.id === message.id) job = null;
            }
        };
    }

    // Copies the microphone (16 kHz, mono) to the main thread in blocks of 2048 samples
    const TAP = `registerProcessor("pm-dictation-tap", class extends AudioWorkletProcessor {
        constructor() { super(); this.buffer = new Float32Array(2048); this.filled = 0; }
        process(inputs) {
            const input = inputs[0] && inputs[0][0];
            if (!input) return true;
            for (let i = 0; i < input.length; i++) {
                this.buffer[this.filled++] = input[i];
                if (this.filled === this.buffer.length) {
                    this.port.postMessage(this.buffer, [this.buffer.buffer]);
                    this.buffer = new Float32Array(2048);
                    this.filled = 0;
                }
            }
            return true;
        }
    });`;

    let worker = null;
    let nextId = 1;
    const handlers = new Map();
    const getWorker = () => {
        if (!worker) {
            const url = URL.createObjectURL(new Blob([`(${workerMain.toString()})()`], { type: "text/javascript" }));
            worker = new Worker(url, { type: "module" });
            worker.onmessage = (event) => {
                const handler = handlers.get(event.data.id);
                if (handler) handler(event.data);
            };
            worker.postMessage({ type: "init", data: { base: new URL(BASE, location.href).href } });
        }
        return worker;
    };

    // The packs dictation needs; the app offers to download missing ones. A packaged game sets
    // pmSpeechBase: it has no installer, the packager put the files next to it.
    let packRequest = null;
    const ensurePacks = () => {
        if (globalThis.pmSpeechBase) return Promise.resolve(true);
        if (!packRequest) {
            packRequest = fetch(`${BASE}install?packs=${PACKS.join(",")}`).then(async (res) => {
                if (res.status === 404) return true;
                const result = await res.json();
                if (!result.ok) packRequest = null; // asked again next time
                return !!result.ok;
            }).catch(() => { packRequest = null; return false; });
        }
        return packRequest;
    };

    // ------------------------------------------------------------------------------------------
    // Listening: one at a time; blocks that ask while it listens get the same text
    // ------------------------------------------------------------------------------------------
    let listening = null;
    let allowed = typeof scaffolding !== "undefined"; // a packaged game does not ask
    const listen = () => {
        if (listening) return listening.promise;
        const job = { id: nextId++, stream: null, context: null, stopped: false };
        listening = job;
        const closeMic = () => {
            if (job.stream) job.stream.getTracks().forEach((track) => track.stop());
            if (job.context) job.context.close().catch(() => {});
            job.stream = null;
            job.context = null;
        };
        job.promise = new Promise((resolve) => {
            const end = (text) => {
                handlers.delete(job.id);
                closeMic();
                if (listening === job) listening = null;
                resolve(text);
            };
            job.stop = () => {
                job.stopped = true;
                if (worker) worker.postMessage({ type: "stop", id: job.id });
                end("");
            };
            (async () => {
                if (!allowed) allowed = window.confirm("This project wants to use your microphone to turn speech into text.\nThe speech is recognized on this computer and not sent anywhere. Allow?");
                if (!allowed || !(await ensurePacks()) || job.stopped) return end("");
                handlers.set(job.id, (message) => {
                    if (message.type === "heard") closeMic();
                    else if (message.type === "done") end(message.text);
                    else if (message.type === "error") {
                        console.warn("Dictation:", message.error);
                        end("");
                    }
                });
                getWorker().postMessage({ type: "start", id: job.id });
                job.stream = await navigator.mediaDevices.getUserMedia({
                    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                });
                if (job.stopped || !handlers.has(job.id)) return closeMic();
                job.context = new AudioContext({ sampleRate: 16000 });
                await job.context.audioWorklet.addModule(URL.createObjectURL(new Blob([TAP], { type: "text/javascript" })));
                if (!job.context) return;
                const tap = new AudioWorkletNode(job.context, "pm-dictation-tap");
                tap.port.onmessage = (event) => worker.postMessage({ type: "audio", id: job.id, samples: event.data }, [event.data.buffer]);
                job.context.createMediaStreamSource(job.stream).connect(tap);
                tap.connect(job.context.destination); // writes nothing; keeps the tap running
            })().catch((error) => {
                console.warn("Dictation:", error);
                if (!job.stopped) job.stop();
            });
        });
        return job.promise;
    };
    runtime.on("PROJECT_STOP_ALL", () => { if (listening) listening.stop(); });

    // Credits for the credit sprite while a project uses these blocks
    const usesBlocks = () => runtime.targets.some((target) => target.isOriginal &&
        Object.values(target.blocks._blocks).some((block) => block.opcode && block.opcode.startsWith(`${ID}_`)));
    runtime.pmCreditProviders = (runtime.pmCreditProviders || []).filter((p) => p.id !== ID);
    const provider = () => (usesBlocks() ? CREDITS : []);
    provider.id = ID;
    runtime.pmCreditProviders.push(provider);
    let lastUsed = null;
    let creditTimer = null;
    const scheduleCredits = () => {
        if (creditTimer) return;
        creditTimer = setTimeout(() => {
            creditTimer = null;
            const used = usesBlocks();
            if (used !== lastUsed) {
                lastUsed = used;
                runtime.emit("PM_CREDITS_CHANGED");
            }
        }, 500);
    };
    runtime.on("PROJECT_CHANGED", scheduleCredits);
    runtime.on("PROJECT_LOADED", scheduleCredits);
    scheduleCredits();

    class pooiod7Dictation {
        constructor() {
            this.recognizedSpeech = "";
        }

        getInfo() {
            return {
                id: ID,
                name: "Dictation",
                color1: "#b969cf",
                color2: "#9253a3",
                blocks: [
                    {
                        opcode: "canUse",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "Can use dictation",
                    },
                    {
                        opcode: "WaitAndrecognizeSpeech",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "Recognize speech and wait",
                    },
                    {
                        opcode: "getRecognizedSpeech",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Last recognized speech",
                    },
                    {
                        opcode: "GetSpeech",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Wait for recognized speech",
                        disableMonitor: true,
                    },
                ],
            };
        }

        canUse() {
            return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof AudioWorkletNode !== "undefined");
        }

        WaitAndrecognizeSpeech() {
            return this.recognize().then(() => {});
        }

        getRecognizedSpeech() {
            return this.recognizedSpeech;
        }

        GetSpeech() {
            return this.recognize();
        }

        recognize() {
            this.recognizedSpeech = "";
            return listen().then((text) => {
                this.recognizedSpeech = text;
                return text;
            });
        }
    }
    Scratch.extensions.register(new pooiod7Dictation());
})(Scratch);
});
