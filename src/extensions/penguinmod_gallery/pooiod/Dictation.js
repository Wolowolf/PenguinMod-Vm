/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's pooiod/Dictation.js, moved into
// the VM as a built-in extension. Section 111 rewrote it for offline speech recognition (same id and blocks);
// section 113 added other languages (Whisper) and the set language block, section 114 live text and the "When I hear" hat,
// section 115 the set accuracy block (Parakeet).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// name: Dictation
// id: pooiod7Dictation
// description: Offline speech to text in 40 languages with Moonshine (English) and Whisper, or Parakeet for high accuracy in 24 European languages; blocks from Dictation v1.3 by pooiod7.
//
// High accuracy: Parakeet TDT 0.6B v3 by NVIDIA (https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3, CC BY 4.0) in its
// ONNX export and int8 quantization by istupakov (https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx, CC BY 4.0;
// greedy TDT decoding as in istupakov's onnx-asr, MIT, rewritten here).
// license: MIT
//
// Speech is recognized on this computer with Moonshine Base (English) by Useful Sensors, Inc. (dba
// Moonshine AI, https://github.com/moonshine-ai/moonshine, MIT) in its ONNX export by onnx-community
// (https://huggingface.co/onnx-community/moonshine-base-ONNX), other languages with Whisper small by OpenAI
// (https://github.com/openai/whisper, MIT) in its ONNX export by onnx-community
// (https://huggingface.co/onnx-community/whisper-small; log-mel features computed here as Whisper's feature
// extractor does); Silero VAD (https://github.com/snakers4/silero-vad,
// MIT) hears when speech starts and ends. All run in onnxruntime-web (MIT) in a worker. The microphone is
// on only while a block listens. The files come from the app (https://studio.penguinmod.com/__speech__/),
// which downloads them once; nothing is sent anywhere.
(function (Scratch) {
    "use strict";
    if (!Scratch.extensions.unsandboxed) throw new Error("Dictation must run unsandboxed");

    const vm = Scratch.vm;
    const runtime = vm.runtime;
    const ID = "pooiod7Dictation";
    const BASE = globalThis.pmSpeechBase || "https://studio.penguinmod.com/__speech__/";
    // English: Moonshine; the others: Whisper (its language codes). Menu order: from the most to the
    // least spoken (all speakers).
    const LANGUAGES = {
        english: "en", chinese: "zh", hindi: "hi", spanish: "es", french: "fr", arabic: "ar", bengali: "bn",
        portuguese: "pt", russian: "ru", urdu: "ur", indonesian: "id", german: "de", japanese: "ja", turkish: "tr",
        vietnamese: "vi", korean: "ko", tamil: "ta", persian: "fa", italian: "it", thai: "th", malay: "ms",
        polish: "pl", ukrainian: "uk", dutch: "nl", romanian: "ro", greek: "el", hungarian: "hu", czech: "cs",
        swedish: "sv", hebrew: "he", bulgarian: "bg", catalan: "ca", danish: "da", finnish: "fi", slovak: "sk",
        croatian: "hr", lithuanian: "lt", slovenian: "sl", latvian: "lv", estonian: "et",
    };
    // High accuracy: Parakeet for the languages it knows (all of these speak in the same model; the
    // language is not forced); the others keep Moonshine or Whisper
    const PARAKEET_LANGUAGES = ["en", "es", "fr", "de", "bg", "hr", "cs", "da", "nl", "et", "fi", "el", "hu", "it", "lv", "lt",
        "pl", "pt", "ro", "sk", "sl", "sv", "ru", "uk"];
    const engineFor = (language, accuracy) => (accuracy === "high" && PARAKEET_LANGUAGES.indexOf(LANGUAGES[language]) >= 0 ? "parakeet"
        : language === "english" ? "moonshine" : "whisper");
    const ENGINE_PACKS = { moonshine: "moonshine-english", whisper: "whisper-small", parakeet: "parakeet-v3" };
    const packsFor = (engine) => ["onnxruntime", "silero-vad", ENGINE_PACKS[engine]];
    const MIT = { license: "MIT", needsCredit: true };
    const CREDITS = [
        Object.assign({ title: "Moonshine (speech recognition)", by: "Moonshine AI", url: "https://github.com/moonshine-ai/moonshine",
            licenseUrl: "https://github.com/moonshine-ai/moonshine/blob/main/LICENSE" }, MIT),
        Object.assign({ title: "Silero VAD", by: "Silero Team", url: "https://github.com/snakers4/silero-vad",
            licenseUrl: "https://github.com/snakers4/silero-vad/blob/master/LICENSE" }, MIT),
    ];
    const CC_BY = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/", needsCredit: true };
    const PARAKEET_CREDITS = [
        Object.assign({ title: "Parakeet TDT 0.6B v3 (speech recognition)", by: "NVIDIA", url: "https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3" }, CC_BY),
        Object.assign({ title: "Parakeet TDT 0.6B v3 ONNX", by: "istupakov", url: "https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx" }, CC_BY),
    ];
    const WHISPER_CREDIT = Object.assign({ title: "Whisper (speech recognition)", by: "OpenAI", url: "https://github.com/openai/whisper",
        licenseUrl: "https://github.com/openai/whisper/blob/main/LICENSE" }, MIT);

    // ------------------------------------------------------------------------------------------
    // The worker: hears speech in the microphone frames (Silero VAD) and turns it into text
    // (Moonshine for English, Whisper for the others), one listening at a time
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
        // Live text: the speech so far is recognized again after this many new frames (0.5 s with
        // Moonshine, 1 s with Whisper and Parakeet, which are slower), when no recognition is running
        const PARTIAL_FRAMES = { moonshine: 16, whisper: 32, parakeet: 32 };
        let base = "";
        let ort = null;
        let vad = null;
        let moonshine = null;
        let whisper = null;
        let parakeet = null;
        let job = null;
        // onnxruntime runs one model at a time: voice detection and recognition take turns
        let gate = Promise.resolve();
        const exclusive = (fn) => {
            const result = gate.then(fn);
            gate = result.catch(() => {});
            return result;
        };

        const create = (url) => ort.InferenceSession.create(url, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
        const fetchJson = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(url.split("/").pop() + ": " + res.status);
            return res.json();
        };
        async function loadVad() {
            if (!ort) {
                ort = await import(/* webpackIgnore: true */ base + "onnxruntime/ort.wasm.bundle.min.mjs");
                ort.env.wasm.wasmPaths = { wasm: base + "onnxruntime/ort-wasm-simd-threaded.wasm" };
                ort.env.wasm.numThreads = typeof SharedArrayBuffer !== "undefined" ? Math.min(navigator.hardwareConcurrency || 4, 4) : 1;
            }
            if (!vad) vad = await create(base + "silero-vad/silero_vad.onnx");
        }
        // Each engine is loaded once, when a listening first needs it (kept as a promise)
        function loadMoonshine() {
            if (!moonshine) {
                moonshine = (async () => {
                    await loadVad();
                    const dir = base + "moonshine-english/";
                    const tokenizer = await fetchJson(dir + "tokenizer.json");
                    const vocab = [];
                    for (const piece of Object.keys(tokenizer.model.vocab)) vocab[tokenizer.model.vocab[piece]] = piece;
                    for (const added of tokenizer.added_tokens) vocab[added.id] = added.content;
                    return { encoder: await create(dir + "encoder_model_quantized.onnx"), decoder: await create(dir + "decoder_model_merged_quantized.onnx"), vocab };
                })();
                moonshine.catch(() => { moonshine = null; });
            }
            return moonshine;
        }
        function loadWhisper() {
            if (!whisper) {
                whisper = (async () => {
                    await loadVad();
                    const dir = base + "whisper-small/";
                    const config = await fetchJson(dir + "config.json");
                    const generation = await fetchJson(dir + "generation_config.json");
                    const tokenizer = await fetchJson(dir + "tokenizer.json");
                    const vocab = [];
                    for (const piece of Object.keys(tokenizer.model.vocab)) vocab[tokenizer.model.vocab[piece]] = piece;
                    // GPT-2's byte-level alphabet: each byte is stored as one printable character
                    const byteOf = {};
                    const bytes = [];
                    for (let b = 33; b <= 126; b++) bytes.push(b);
                    for (let b = 161; b <= 172; b++) bytes.push(b);
                    for (let b = 174; b <= 255; b++) bytes.push(b);
                    const chars = bytes.slice();
                    let extra = 0;
                    for (let b = 0; b < 256; b++) if (bytes.indexOf(b) < 0) { bytes.push(b); chars.push(256 + extra++); }
                    bytes.forEach((b, i) => { byteOf[String.fromCharCode(chars[i])] = b; });
                    return {
                        encoder: await create(dir + "encoder_model_quantized.onnx"),
                        decoder: await create(dir + "decoder_model_merged_quantized.onnx"),
                        config, generation, vocab, byteOf, suppress: new Set(generation.suppress_tokens),
                        mel: makeMel(config.num_mel_bins),
                    };
                })();
                whisper.catch(() => { whisper = null; });
            }
            return whisper;
        }

        // Whisper's log-mel features (its feature extractor: 30 s, n_fft 400, hop 160, Slaney mel filters
        // up to 8 kHz, log10, at most 8 below the maximum, (x + 4) / 4); frames of padding stay at log10(1e-10)
        function makeMel(bins) {
            const N = 400, FREQS = 201;
            const hzToMel = (f) => (f < 1000 ? 3 * f / 200 : 15 + Math.log(f / 1000) * 27 / Math.log(6.4));
            const melToHz = (m) => (m < 15 ? 200 * m / 3 : 1000 * Math.exp((m - 15) * Math.log(6.4) / 27));
            const top = hzToMel(8000);
            const points = [];
            for (let i = 0; i < bins + 2; i++) points.push(melToHz(top * i / (bins + 1)));
            const filters = new Float32Array(bins * FREQS);
            for (let m = 0; m < bins; m++) {
                const norm = 2 / (points[m + 2] - points[m]);
                for (let k = 0; k < FREQS; k++) {
                    const hz = k * 8000 / (FREQS - 1);
                    const down = (hz - points[m]) / (points[m + 1] - points[m]);
                    const up = (points[m + 2] - hz) / (points[m + 2] - points[m + 1]);
                    filters[m * FREQS + k] = Math.max(0, Math.min(down, up)) * norm;
                }
            }
            const hann = new Float32Array(N);
            for (let n = 0; n < N; n++) hann[n] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N);
            const cos = new Float32Array(FREQS * N);
            const sin = new Float32Array(FREQS * N);
            for (let k = 0; k < FREQS; k++) {
                for (let n = 0; n < N; n++) {
                    cos[k * N + n] = Math.cos(2 * Math.PI * k * n / N);
                    sin[k * N + n] = Math.sin(2 * Math.PI * k * n / N);
                }
            }
            return { bins, filters, hann, cos, sin };
        }
        function logMel(audio, mel) {
            const N = 400, HOP = 160, FRAMES = 3000, FREQS = 201, TOTAL = 480000;
            const length = Math.min(audio.length, TOTAL);
            const out = new Float32Array(mel.bins * FRAMES).fill(-10);
            const frame = new Float32Array(N);
            const power = new Float32Array(FREQS);
            const used = Math.min(FRAMES, Math.ceil((length + N / 2) / HOP) + 1);
            let max = used < FRAMES ? -10 : -Infinity;
            for (let t = 0; t < used; t++) {
                for (let n = 0; n < N; n++) {
                    let j = t * HOP + n - N / 2; // centred frames, reflected at the edges
                    if (j < 0) j = -j;
                    if (j >= TOTAL) j = 2 * (TOTAL - 1) - j;
                    frame[n] = (j < length ? audio[j] : 0) * mel.hann[n];
                }
                for (let k = 0; k < FREQS; k++) {
                    let re = 0, im = 0;
                    const o = k * N;
                    for (let n = 0; n < N; n++) {
                        re += frame[n] * mel.cos[o + n];
                        im -= frame[n] * mel.sin[o + n];
                    }
                    power[k] = re * re + im * im;
                }
                for (let m = 0; m < mel.bins; m++) {
                    let sum = 0;
                    const o = m * FREQS;
                    for (let k = 0; k < FREQS; k++) sum += mel.filters[o + k] * power[k];
                    const value = Math.log10(Math.max(sum, 1e-10));
                    out[m * FRAMES + t] = value;
                    if (value > max) max = value;
                }
            }
            for (let i = 0; i < out.length; i++) out[i] = (Math.max(out[i], max - 8) + 4) / 4;
            return out;
        }

        // Greedy decoding with the merged decoder's cache; prompt = the first input_ids
        async function decode(decoder, hidden, layers, heads, headSize, prompt, maxTokens, pick) {
            const empty = new ort.Tensor("float32", new Float32Array(0), [1, heads, 0, headSize]);
            let past = {};
            for (let l = 0; l < layers; l++) {
                for (const part of ["decoder", "encoder"]) for (const kv of ["key", "value"]) past[`past_key_values.${l}.${part}.${kv}`] = empty;
            }
            const ids = [];
            let input = prompt;
            for (let step = 0; step < maxTokens; step++) {
                const out = await decoder.run(Object.assign({
                    input_ids: new ort.Tensor("int64", BigInt64Array.from(input.map((id) => BigInt(id))), [1, input.length]),
                    encoder_hidden_states: hidden,
                    use_cache_branch: new ort.Tensor("bool", [step > 0], [1]),
                }, past));
                const size = out.logits.dims[2];
                const best = pick(out.logits.data, (input.length - 1) * size, size, step);
                if (best < 0) break; // end of text
                ids.push(best);
                input = [best];
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
            return ids;
        }

        // Whisper: the language and "transcribe" are forced; special and suppressed tokens are never picked
        async function transcribeWhisper(audio, language) {
            const w = await loadWhisper();
            const { config, generation } = w;
            const languageId = generation.lang_to_id[`<|${language}|>`];
            if (languageId === undefined) throw new Error("Whisper has no language " + language);
            const features = logMel(audio, w.mel);
            const hidden = (await w.encoder.run({ input_features: new ort.Tensor("float32", features, [1, w.mel.bins, 3000]) })).last_hidden_state;
            const heads = config.decoder_attention_heads;
            const end = generation.eos_token_id;
            const ids = await decode(w.decoder, hidden, config.decoder_layers, heads, config.d_model / heads,
                [generation.decoder_start_token_id, languageId, generation.task_to_id.transcribe, generation.no_timestamps_token_id],
                Math.min(440, Math.ceil(audio.length / RATE * 7) + 10), (logits, offset, size, step) => {
                    let best = -1;
                    for (let i = 0; i < size; i++) {
                        if (i > end || w.suppress.has(i) || (step === 0 && generation.begin_suppress_tokens.indexOf(i) >= 0)) continue;
                        if (best < 0 || logits[offset + i] > logits[offset + best]) best = i;
                    }
                    return best === end ? -1 : best;
                });
            const bytes = [];
            for (const id of ids) for (const ch of w.vocab[id] || "") if (w.byteOf[ch] !== undefined) bytes.push(w.byteOf[ch]);
            return new TextDecoder().decode(new Uint8Array(bytes)).trim();
        }

        function loadParakeet() {
            if (!parakeet) {
                parakeet = (async () => {
                    await loadVad();
                    const dir = base + "parakeet-v3/";
                    const res = await fetch(dir + "vocab.txt");
                    if (!res.ok) throw new Error("vocab.txt: " + res.status);
                    const vocab = []; // lines "<piece> <id>"
                    for (const line of (await res.text()).split("\n")) {
                        const space = line.lastIndexOf(" ");
                        if (space > 0) vocab[Number(line.slice(space + 1))] = line.slice(0, space);
                    }
                    return {
                        features: await create(dir + "nemo128.onnx"),
                        encoder: await create(dir + "encoder-model.int8.onnx"),
                        decoder: await create(dir + "decoder_joint-model.int8.onnx"),
                        vocab, blank: vocab.indexOf("<blk>"),
                    };
                })();
                parakeet.catch(() => { parakeet = null; });
            }
            return parakeet;
        }

        // Parakeet (TDT): its own features and the encoder once, then the decoder-joint for one encoder
        // frame at a time: the best token (or blank) and how many frames to move on (0-4); after a
        // token its state moves on; at most 10 tokens per frame
        async function transcribeParakeet(audio) {
            const p = await loadParakeet();
            const features = await p.features.run({
                waveforms: new ort.Tensor("float32", audio, [1, audio.length]),
                waveforms_lens: new ort.Tensor("int64", BigInt64Array.from([BigInt(audio.length)]), [1]),
            });
            const encoded = await p.encoder.run({ audio_signal: features.features, length: features.features_lens });
            const size = encoded.outputs.dims[1];
            const stride = encoded.outputs.dims[2];
            const frames = Number(encoded.encoded_lengths.data[0]);
            const data = encoded.outputs.data;
            const vocabSize = p.vocab.length;
            const frame = new Float32Array(size);
            let states1 = new ort.Tensor("float32", new Float32Array(2 * 640), [2, 1, 640]);
            let states2 = new ort.Tensor("float32", new Float32Array(2 * 640), [2, 1, 640]);
            const tokens = [];
            let t = 0;
            let emitted = 0;
            while (t < frames) {
                for (let d = 0; d < size; d++) frame[d] = data[d * stride + t];
                const out = await p.decoder.run({
                    encoder_outputs: new ort.Tensor("float32", frame, [1, size, 1]),
                    targets: new ort.Tensor("int32", Int32Array.from([tokens.length ? tokens[tokens.length - 1] : p.blank]), [1, 1]),
                    target_length: new ort.Tensor("int32", Int32Array.from([1]), [1]),
                    input_states_1: states1,
                    input_states_2: states2,
                });
                const logits = out.outputs.data;
                let token = 0;
                for (let i = 1; i < vocabSize; i++) if (logits[i] > logits[token]) token = i;
                let skip = 0;
                for (let i = 1; i < logits.length - vocabSize; i++) if (logits[vocabSize + i] > logits[vocabSize + skip]) skip = i;
                if (token !== p.blank) {
                    states1 = out.output_states_1;
                    states2 = out.output_states_2;
                    tokens.push(token);
                    emitted++;
                }
                if (skip > 0) {
                    t += skip;
                    emitted = 0;
                } else if (token === p.blank || emitted >= 10) {
                    t++;
                    emitted = 0;
                }
            }
            return tokens.map((id) => p.vocab[id] || "").join("").replace(/▁/g, " ").trim();
        }

        // Moonshine: encoder once, then the decoder one token at a time (greedy, with its cache)
        async function transcribe(audio, job) {
            if (job.engine === "whisper") return transcribeWhisper(audio, job.language);
            if (job.engine === "parakeet") return transcribeParakeet(audio);
            const { encoder, decoder, vocab } = await loadMoonshine();
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
            exclusive(() => transcribe(audio, done)).then((result) => reply(done.id, { type: "done", text: result }),
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
                    const out = await exclusive(() => vad.run({ input: new ort.Tensor("float32", input, [1, 64 + FRAME]), state: current.state, sr: current.sr }));
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
                    current.partialAt = current.speech.length;
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
            const every = PARTIAL_FRAMES[current.engine];
            // only while the player talks: one in the quiet at the end would delay the final text
            if (current.quiet === 0 && current.voiced >= MIN_SPEECH && !current.partialBusy && current.speech.length - current.partialAt >= every) {
                current.partialBusy = true;
                current.partialAt = current.speech.length;
                const audio = new Float32Array(current.speech.length * FRAME);
                current.speech.forEach((f, i) => audio.set(f, i * FRAME));
                exclusive(() => (job === current ? transcribe(audio, current) : null)).then((text) => {
                    if (job === current && text) reply(current.id, { type: "partial", text });
                }, () => {}).then(() => { current.partialBusy = false; });
            }
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
                job = { id: message.id, language: message.language, engine: message.engine, ready: false, busy: false, queued: new Float32Array(0), read: 0, context: new Float32Array(64),
                    state: null, sr: null, frames: 0, preRoll: [], speech: null, voiced: 0, quiet: 0, partialAt: 0, partialBusy: false };
                const current = job;
                ({ moonshine: loadMoonshine, whisper: loadWhisper, parakeet: loadParakeet })[current.engine]().catch(() => {}); // reported when transcribing
                loadVad().then(() => {
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
    const packRequests = new Map();
    const ensurePacks = (packs) => {
        if (globalThis.pmSpeechBase) return Promise.resolve(true);
        const key = packs.join(",");
        if (!packRequests.has(key)) {
            packRequests.set(key, fetch(`${BASE}install?packs=${key}`).then(async (res) => {
                if (res.status === 404) return true;
                const result = await res.json();
                if (!result.ok) packRequests.delete(key); // asked again next time
                return !!result.ok;
            }).catch(() => { packRequests.delete(key); return false; }));
        }
        return packRequests.get(key);
    };

    // ------------------------------------------------------------------------------------------
    // Listening: one at a time, in the language set last; blocks that ask while it listens get the same text
    // ------------------------------------------------------------------------------------------
    let language = "english";
    let accuracy = "normal";
    runtime.on("PROJECT_LOADED", () => {
        language = "english";
        accuracy = "normal";
    });
    let listening = null;
    // What the current (or last) listening heard so far, and the "When I hear" hats that fired for it
    let heard = "";
    let fired = new Set();
    const hear = (text) => {
        heard = text;
        runtime.startHats(`${ID}_whenIHear`);
    };
    let allowed = typeof scaffolding !== "undefined"; // a packaged game does not ask
    const listen = () => {
        if (listening) return listening.promise;
        const job = { id: nextId++, language, engine: engineFor(language, accuracy), stream: null, context: null, stopped: false };
        listening = job;
        heard = "";
        fired = new Set();
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
                if (!allowed || !(await ensurePacks(packsFor(job.engine))) || job.stopped) return end("");
                handlers.set(job.id, (message) => {
                    if (message.type === "heard") closeMic();
                    else if (message.type === "partial") hear(message.text);
                    else if (message.type === "done") {
                        hear(message.text);
                        end(message.text);
                    }
                    else if (message.type === "error") {
                        console.warn("Dictation:", message.error);
                        end("");
                    }
                });
                getWorker().postMessage({ type: "start", id: job.id, language: LANGUAGES[job.language], engine: job.engine });
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

    // Credits for the credit sprite while a project uses these blocks; Whisper's when a set language
    // block picks another language than english or a reporter does, Parakeet's when a set accuracy
    // block picks high or a reporter does
    const usedCredits = () => {
        let used = false;
        let whisperUsed = false;
        let parakeetUsed = false;
        for (const target of runtime.targets) {
            if (!target.isOriginal) continue;
            const blocks = target.blocks._blocks;
            const menuValue = (block, inputName, fieldName) => {
                const input = block.inputs[inputName];
                const menu = input && input.block === input.shadow && blocks[input.block];
                const field = menu && menu.fields && menu.fields[fieldName];
                return field ? field.value : null; // null: a reporter
            };
            for (const block of Object.values(blocks)) {
                if (!block.opcode || !block.opcode.startsWith(`${ID}_`)) continue;
                used = true;
                if (block.opcode === `${ID}_setLanguage` && menuValue(block, "LANGUAGE", "languages") !== "english") whisperUsed = true;
                if (block.opcode === `${ID}_setAccuracy` && menuValue(block, "ACCURACY", "accuracies") !== "normal") parakeetUsed = true;
            }
        }
        return used ? CREDITS.concat(whisperUsed ? [WHISPER_CREDIT] : [], parakeetUsed ? PARAKEET_CREDITS : []) : [];
    };
    runtime.pmCreditProviders = (runtime.pmCreditProviders || []).filter((p) => p.id !== ID);
    const provider = () => usedCredits();
    provider.id = ID;
    runtime.pmCreditProviders.push(provider);
    let lastUsed = null;
    let creditTimer = null;
    const scheduleCredits = () => {
        if (creditTimer) return;
        creditTimer = setTimeout(() => {
            creditTimer = null;
            const used = JSON.stringify(usedCredits());
            if (used !== lastUsed) {
                lastUsed = used;
                runtime.emit("PM_CREDITS_CHANGED");
            }
        }, 500);
    };
    runtime.on("PROJECT_CHANGED", scheduleCredits);
    runtime.on("PROJECT_LOADED", scheduleCredits);
    scheduleCredits();

    // "When I hear": letters and digits only, lower case; whole words, or anywhere in the text for
    // phrases in scripts written without spaces (Chinese, Japanese, Thai)
    const normalize = (text) => Scratch.Cast.toString(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u;
    const contains = (text, phrase) => (NO_SPACES.test(phrase) ? text.replace(/ /g, "").includes(phrase.replace(/ /g, ""))
        : ` ${text} `.includes(` ${phrase} `));

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
                    {
                        opcode: "speechSoFar",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "Speech so far",
                    },
                    {
                        opcode: "whenIHear",
                        blockType: Scratch.BlockType.HAT,
                        text: "When I hear [PHRASE]",
                        isEdgeActivated: false,
                        arguments: {
                            PHRASE: { type: Scratch.ArgumentType.STRING, defaultValue: "hello" },
                        },
                    },
                    {
                        opcode: "setLanguage",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set dictation language to [LANGUAGE]",
                        arguments: {
                            LANGUAGE: { type: Scratch.ArgumentType.STRING, menu: "languages", defaultValue: "english" },
                        },
                    },
                    {
                        opcode: "setAccuracy",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set dictation accuracy to [ACCURACY]",
                        arguments: {
                            ACCURACY: { type: Scratch.ArgumentType.STRING, menu: "accuracies", defaultValue: "high" },
                        },
                    },
                ],
                menus: {
                    languages: { acceptReporters: true, items: Object.keys(LANGUAGES) },
                    accuracies: { acceptReporters: true, items: ["normal", "high"] },
                },
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

        // The live text while listening (updated while the player talks), then the recognized speech
        speechSoFar() {
            return heard;
        }

        // Runs once per listening and script when the text heard so far contains the phrase
        whenIHear(args, util) {
            const phrase = normalize(args.PHRASE);
            if (!phrase || !contains(normalize(heard), phrase)) return false;
            const key = `${util.target.id}|${util.thread ? util.thread.topBlock : ""}|${phrase}`;
            if (fired.has(key)) return false;
            fired.add(key);
            return true;
        }

        // A language name from the menu, or its Whisper code (e.g. "de"); anything else is ignored
        setLanguage(args) {
            const value = Scratch.Cast.toString(args.LANGUAGE).toLowerCase().trim();
            const name = LANGUAGES[value] ? value : Object.keys(LANGUAGES).find((n) => LANGUAGES[n] === value);
            if (name) language = name;
        }

        // "high": Parakeet for the 24 European languages it knows (a larger download); "normal": Moonshine
        // and Whisper; anything else is ignored
        setAccuracy(args) {
            const value = Scratch.Cast.toString(args.ACCURACY).toLowerCase().trim();
            if (value === "normal" || value === "high") accuracy = value;
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
