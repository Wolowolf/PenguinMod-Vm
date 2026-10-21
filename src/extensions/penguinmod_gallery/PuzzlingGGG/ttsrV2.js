/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's PuzzlingGGG/ttsrV2.js, moved into the VM as a
// built-in extension. The code is the gallery file unchanged except for `/* webpackIgnore: true */` in its import(), so the build leaves that import to the browser; it only runs inside a function that gives it
// the gallery's Scratch object (extension-support/desktop-gallery-extension.js).
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch) {
// name: Text To Speech
// id: pmTextToSpeech
// description: Offline text to speech with Pocket TTS and Supertonic 3 voices, voice cloning, speed and pitch; makes speech sounds too, also with Loudkit.
// license: MIT AND Apache-2.0
//
// Speech is made on this computer with Pocket TTS by Kyutai (https://huggingface.co/kyutai/pocket-tts,
// CC BY 4.0) in its ONNX export by KevinAHM (https://huggingface.co/KevinAHM/pocket-tts-onnx, CC BY 4.0),
// or with Supertonic 3 by Supertone Inc. (https://huggingface.co/Supertone/supertonic-3, OpenRAIL-M:
// its use restrictions apply to everyone who uses it, and its speech must be disclosed as
// machine-generated), run by onnxruntime-web (MIT). The Pocket TTS steps follow KevinAHM's web demo
// (https://huggingface.co/spaces/KevinAHM/pocket-tts-web, inference-worker.js, Apache-2.0,
// http://www.apache.org/licenses/LICENSE-2.0), rewritten for this extension: no streaming, own
// SentencePiece tokenizer, voices encoded from their clips, speed and pitch added. The Supertonic
// steps and text clean-up follow Supertone's web example (https://github.com/supertone-inc/supertonic,
// web/helper.js, MIT, Copyright (c) 2025 Supertone Inc.), rewritten with typed arrays.
// "Make a speech sound" can also use Loudkit (loudr-1-turbo or loudr-1 by loudreader, Apache-2.0,
// https://github.com/loudreader/loudkit), voices and clones, which the app runs with onnxruntime-node.
// The files come from the app (https://studio.penguinmod.com/__speech__/), which downloads each
// pack once; nothing is sent anywhere.
(function (Scratch) {
    "use strict";
    if (!Scratch.extensions.unsandboxed) throw new Error("Text To Speech must run unsandboxed");

    const vm = Scratch.vm;
    const runtime = vm.runtime;
    const ID = "pmTextToSpeech";
    const BASE = globalThis.pmSpeechBase || "https://studio.penguinmod.com/__speech__/";

    // Supertonic speaks all of these; Pocket TTS only POCKET_LANGUAGES (other languages: english).
    // Menu order: Pocket's 6, then the others, each group from the most to the least spoken (all speakers).
    const LANGUAGES = {
        english: "en", spanish: "es", french: "fr", portuguese: "pt", german: "de", italian: "it",
        hindi: "hi", arabic: "ar", russian: "ru", indonesian: "id", japanese: "ja", turkish: "tr", vietnamese: "vi",
        korean: "ko", polish: "pl", ukrainian: "uk", dutch: "nl", romanian: "ro", greek: "el", swedish: "sv",
        hungarian: "hu", czech: "cs", bulgarian: "bg", slovak: "sk", danish: "da", finnish: "fi", croatian: "hr",
        lithuanian: "lt", slovenian: "sl", latvian: "lv", estonian: "et",
    };
    const POCKET_LANGUAGES = ["english", "spanish", "french", "portuguese", "german", "italian"];
    // Supertonic's preset voices (part of the model, same licence)
    const SUPERTONIC_VOICES = {};
    for (let i = 1; i <= 5; i++) SUPERTONIC_VOICES[`supertonic female ${i}`] = `F${i}`;
    for (let i = 1; i <= 5; i++) SUPERTONIC_VOICES[`supertonic male ${i}`] = `M${i}`;
    const SUPERTONIC_CREDIT = { title: "Supertonic 3 (the speech is machine-generated)", by: "Supertone Inc.",
        url: "https://huggingface.co/Supertone/supertonic-3", license: "OpenRAIL-M",
        licenseUrl: "https://huggingface.co/Supertone/supertonic-3/blob/main/LICENSE", needsCredit: true };
    const CC_BY = { license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" };
    // Loudkit (loudr-1-turbo, Apache-2.0): only in "Make a speech sound", run by the app itself
    // (onnxruntime-node, POST __speech__/loudkit). Its voices and the language each one speaks.
    const LOUDKIT_VOICES = {
        clara: "en", emma: "en", henry: "en", joe: "en", kathleen: "en", lucy: "en", miles: "en", oliver: "en", oscar: "en",
        sophie: "en", carmen: "es", dave: "es", colette: "fr", henri: "fr", kerstin: "de", thorsten: "de", dante: "it",
        paola: "it", darkman: "pl", gosia: "pl", tugao: "pt", ines: "pt", nathalie: "nl", pim: "nl", nils: "sv", selma: "sv",
        freja: "da", soren: "da",
    };
    // Loudkit's two models (speech packs): faster loudr-1-turbo, slower but more natural loudr-1
    const LOUDKIT_MODELS = {
        "loudkit-turbo": { model: "loudr-1-turbo", shown: "faster (loudr-1-turbo, about 2.4 GB)" },
        "loudkit-natural": { model: "loudr-1", shown: "more natural, slower (loudr-1, about 2.6 GB)" },
    };
    const loudkitCredit = (pack) => ({ title: `Loudkit ${LOUDKIT_MODELS[pack].model} (the speech is machine-generated)`, by: "loudreader",
        url: `https://huggingface.co/loudreader/${LOUDKIT_MODELS[pack].model}`, license: "Apache-2.0",
        licenseUrl: "https://www.apache.org/licenses/LICENSE-2.0", needsCredit: true });
    // Loudkit voices made from CC BY 4.0 recordings (the others are CC0)
    const KYUTAI_VOICES = ["Kyutai tts-voices", "https://huggingface.co/kyutai/tts-voices"];
    const CML_TTS = ["CML-TTS", "https://huggingface.co/datasets/ylacombe/cml-tts"];
    const LOUDKIT_CC_BY = { colette: KYUTAI_VOICES, henri: KYUTAI_VOICES, carmen: CML_TTS, ines: CML_TTS,
        dante: ["Multilingual LibriSpeech (MLS)", "https://huggingface.co/datasets/facebook/multilingual_librispeech"] };
    const VCTK = (speaker) => Object.assign({ title: `VCTK speaker ${speaker}`, by: "CSTR, University of Edinburgh",
        url: "https://datashare.ed.ac.uk/handle/10283/3443", modified: true, needsCredit: true }, CC_BY);
    // Only voices that allow commercial use (CC BY 4.0 needs a credit, CC0 does not)
    const VOICES = {
        alba: Object.assign({ title: "Casual voice clip", by: "Alba MacKenna", url: "https://huggingface.co/kyutai/tts-voices",
            modified: true, needsCredit: true }, CC_BY),
        anna: VCTK("p228"), azelma: VCTK("p303"), bill_boerst: null, caro_davy: null, charles: VCTK("p254"),
        eponine: VCTK("p262"), eve: VCTK("p361"), fantine: VCTK("p244"), george: VCTK("p315"), jane: VCTK("p339"),
        javert: null, marius: null, mary: VCTK("p333"), michael: VCTK("p360"), paul: VCTK("p259"),
        peter_yearsley: null, stuart_bell: null, vera: VCTK("p229"),
    };
    const ENGINE_CREDITS = [
        Object.assign({ title: "Pocket TTS", by: "Kyutai", url: "https://huggingface.co/kyutai/pocket-tts", needsCredit: true }, CC_BY),
        Object.assign({ title: "Pocket TTS ONNX", by: "KevinAHM", url: "https://huggingface.co/KevinAHM/pocket-tts-onnx", needsCredit: true }, CC_BY),
    ];
    const SPEEDS = { "super slow": 50, slow: 75, normal: 100, fast: 125, "super fast": 150 };
    const PITCHES = { "super low": 70, low: 85, normal: 100, high: 115, "super high": 130 };
    const DEFAULTS = { voice: { name: "alba" }, language: "english", speed: 100, pitch: 100 };

    // ------------------------------------------------------------------------------------------
    // The worker: loads onnxruntime-web and one language at a time, makes speech (one request at
    // a time, in order)
    // ------------------------------------------------------------------------------------------
    function workerMain() {
        const MODEL_FILES = {
            encoder: "mimi_encoder_int8.onnx", text: "text_conditioner_int8.onnx", main: "flow_lm_main_int8.onnx",
            flow: "flow_lm_flow_int8.onnx", decoder: "mimi_decoder_int8.onnx",
        };
        const MAX_FRAMES = 500;
        const TEMPERATURE = 0.7;
        const GAP_SECONDS = 0.25;
        let ort = null;
        let base = "";
        let lang = null; // {name, meta, sessions, tokenizer, bos, voices: Map}
        const cache = new Map(); // "language|voice|text" -> Float32Array (most recent last)
        const cancelled = new Set();
        class Cancelled extends Error { }

        const tensor = (type, data, dims) => new ort.Tensor(type, data, dims);
        const filled = (entry) => {
            const size = entry.shape.reduce((a, b) => a * b, 1);
            if (entry.dtype === "int64") return new BigInt64Array(size);
            if (entry.dtype === "bool") return new Uint8Array(size).fill(entry.fill === "ones" ? 1 : 0);
            const data = new Float32Array(size);
            if (entry.fill === "nan") data.fill(NaN);
            else if (entry.fill === "ones") data.fill(1);
            return data;
        };
        const initState = (manifest) => Object.fromEntries(manifest.map((e) => [e.input_name, tensor(e.dtype, filled(e), e.shape)]));
        const takeState = (state, result, manifest) => {
            for (const e of manifest) state[e.input_name] = result[e.output_name];
        };
        const fetchBuffer = async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
            return res.arrayBuffer();
        };
        const parseNpy = (buffer) => {
            const view = new DataView(buffer);
            const major = view.getUint8(6);
            const headerLength = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
            const offset = major === 1 ? 10 : 12;
            const header = new TextDecoder().decode(new Uint8Array(buffer, offset, headerLength));
            const shape = header.match(/\(\s*([0-9,\s]+)\)/)[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number);
            return { data: new Float32Array(buffer.slice(offset + headerLength)), shape };
        };
        const parseWav = (buffer) => {
            const view = new DataView(buffer);
            let pos = 12;
            while (pos + 8 <= buffer.byteLength) {
                const id = String.fromCharCode(...new Uint8Array(buffer, pos, 4));
                const size = view.getUint32(pos + 4, true);
                if (id === "data") {
                    const samples = new Float32Array(Math.floor(size / 2));
                    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(pos + 8 + (i * 2), true) / 32768;
                    return samples;
                }
                pos += 8 + size + (size & 1);
            }
            throw new Error("voice clip without data");
        };

        // SentencePiece (unigram) tokenizer: reads tokenizer.model, Viterbi segmentation, byte fallback
        function makeTokenizer(buffer) {
            const bytes = new Uint8Array(buffer);
            let pos = 0;
            const varint = () => {
                let result = 0, shift = 0, b;
                do { b = bytes[pos++]; result += (b & 127) * Math.pow(2, shift); shift += 7; } while (b & 128);
                return result;
            };
            const fields = (end, onField) => {
                while (pos < end) {
                    const key = varint(), field = Math.floor(key / 8), type = key & 7;
                    if (type === 0) onField(field, varint());
                    else if (type === 2) { const length = varint(), start = pos; pos += length; onField(field, null, start, pos); }
                    else if (type === 5) { onField(field, new DataView(buffer, pos, 4).getFloat32(0, true)); pos += 4; }
                    else if (type === 1) pos += 8;
                    else throw new Error("bad tokenizer.model");
                }
            };
            const pieces = [];
            let addDummyPrefix = true;
            fields(bytes.length, (field, value, start, end) => {
                if (field === 1) {
                    const piece = { text: "", score: 0, type: 1 };
                    const back = pos;
                    pos = start;
                    fields(end, (f, v, s, e) => {
                        if (f === 1) piece.text = new TextDecoder().decode(bytes.subarray(s, e));
                        else if (f === 2) piece.score = v;
                        else if (f === 3) piece.type = v;
                    });
                    pos = back;
                    pieces.push(piece);
                } else if (field === 3) {
                    const back = pos;
                    pos = start;
                    fields(end, (f, v) => { if (f === 3) addDummyPrefix = !!v; });
                    pos = back;
                }
            });
            const vocab = new Map();
            const byteIds = new Array(256);
            let unkId = 0, minScore = 0, maxLength = 1;
            pieces.forEach((p, id) => {
                if (p.type === 1 || p.type === 4) {
                    vocab.set(p.text, id);
                    minScore = Math.min(minScore, p.score);
                    maxLength = Math.max(maxLength, Array.from(p.text).length);
                } else if (p.type === 2) unkId = id;
                else if (p.type === 6) byteIds[parseInt(p.text.slice(3, 5), 16)] = id;
            });
            const unkScore = minScore - 10;
            const encode = (text) => {
                const chars = Array.from((addDummyPrefix ? "▁" : "") + text.replace(/ /g, "▁"));
                const best = new Float64Array(chars.length + 1).fill(-Infinity);
                const from = new Int32Array(chars.length + 1);
                const ids = new Int32Array(chars.length + 1);
                best[0] = 0;
                for (let i = 0; i < chars.length; i++) {
                    if (best[i] === -Infinity) continue;
                    let piece = "";
                    for (let j = i; j < Math.min(chars.length, i + maxLength); j++) {
                        piece += chars[j];
                        const id = vocab.get(piece);
                        const score = id === undefined ? (j === i ? unkScore : null) : pieces[id].score;
                        if (score === null) continue;
                        if (best[i] + score > best[j + 1]) {
                            best[j + 1] = best[i] + score;
                            from[j + 1] = i;
                            ids[j + 1] = id === undefined ? -1 : id;
                        }
                    }
                }
                const result = [];
                for (let end = chars.length; end > 0; end = from[end]) {
                    if (ids[end] >= 0) { result.push([ids[end]]); continue; }
                    const encoded = new TextEncoder().encode(chars.slice(from[end], end).join(""));
                    result.push(Array.from(encoded, (b) => (byteIds[b] === undefined ? unkId : byteIds[b])));
                }
                return result.reverse().flat();
            };
            const decode = (list) => {
                const out = [];
                for (const id of list) {
                    const p = pieces[id];
                    if (p.type === 6) out.push(parseInt(p.text.slice(3, 5), 16));
                    else if (p.type === 1 || p.type === 4) out.push(...new TextEncoder().encode(p.text));
                }
                return new TextDecoder().decode(new Uint8Array(out)).replace(/▁/g, " ").trim();
            };
            return { encode, decode };
        }

        async function loadOrt() {
            if (!ort) {
                ort = await import(/* webpackIgnore: true */ base + "onnxruntime/ort.wasm.bundle.min.mjs");
                ort.env.wasm.wasmPaths = { wasm: base + "onnxruntime/ort-wasm-simd-threaded.wasm" };
                // Several threads need SharedArrayBuffer (the app and packaged Windows games turn it on)
                ort.env.wasm.numThreads = typeof SharedArrayBuffer !== "undefined" ? Math.min(navigator.hardwareConcurrency || 4, 4) : 1;
            }
        }

        async function loadLanguage(name) {
            if (lang && lang.name === name) return lang;
            await loadOrt();
            if (lang) await Promise.all(Object.values(lang.sessions).map((s) => s.release()));
            lang = null;
            const dir = `${base}pocket-${name}/`;
            const meta = JSON.parse(new TextDecoder().decode(await fetchBuffer(dir + "bundle.json")));
            const sessions = {};
            for (const [key, file] of Object.entries(MODEL_FILES)) {
                sessions[key] = await ort.InferenceSession.create(dir + file, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
            }
            const tokenizer = makeTokenizer(await fetchBuffer(dir + meta.tokenizer_file));
            const bos = meta.insert_bos_before_voice && meta.bos_before_voice_file ? parseNpy(await fetchBuffer(dir + meta.bos_before_voice_file)) : null;
            lang = { name, meta, sessions, tokenizer, bos, voices: new Map() };
            return lang;
        }

        // The language model's state after hearing the voice clip (24 kHz mono, at most 10 s)
        async function voiceState(l, key, audio) {
            if (l.voices.has(key)) return l.voices.get(key);
            if (!audio) audio = parseWav(await fetchBuffer(`${base}pocket-voices/${key}.wav`));
            const encoded = await l.sessions.encoder.run({ audio: tensor("float32", audio, [1, 1, audio.length]) });
            const emb = encoded[l.sessions.encoder.outputNames[0]];
            const frames = emb.dims[emb.dims.length - 2], width = emb.dims[emb.dims.length - 1];
            let data = new Float32Array(emb.data), count = frames;
            if (l.bos) {
                const joined = new Float32Array(l.bos.data.length + data.length);
                joined.set(l.bos.data, 0);
                joined.set(data, l.bos.data.length);
                data = joined;
                count += l.bos.shape[1];
            }
            const state = initState(l.meta.flow_lm_state_manifest);
            const result = await l.sessions.main.run(Object.assign({
                sequence: tensor("float32", new Float32Array(0), [1, 0, l.meta.latent_dim]),
                text_embeddings: tensor("float32", data, [1, count, width]),
            }, state));
            takeState(state, result, l.meta.flow_lm_state_manifest);
            l.voices.set(key, state);
            return state;
        }

        function prepareText(l, text) {
            let prompt = text.replace(/\s+/g, " ").trim();
            if (!prompt) return { chunks: [], afterEos: 1 };
            if (l.meta.remove_semicolons) prompt = prompt.replace(/;/g, ",");
            const words = prompt.split(" ").length;
            const afterEos = l.meta.model_recommended_frames_after_eos != null ? Number(l.meta.model_recommended_frames_after_eos) : (words <= 4 ? 3 : 1);
            prompt = prompt[0].toUpperCase() + prompt.slice(1);
            if (/[0-9A-Za-zÀ-ÿ]$/.test(prompt)) prompt += ".";
            if (l.meta.pad_with_spaces_for_short_inputs && words < 5) prompt = "        " + prompt;
            const max = Number(l.meta.max_token_per_chunk || 50);
            const chunks = [];
            let current = "";
            for (const sentence of (prompt.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [prompt]).map((s) => s.trim()).filter(Boolean)) {
                const ids = l.tokenizer.encode(sentence);
                if (ids.length > max) {
                    if (current) chunks.push(current);
                    current = "";
                    for (let i = 0; i < ids.length; i += max) {
                        const part = l.tokenizer.decode(ids.slice(i, i + max));
                        if (part) chunks.push(part);
                    }
                } else if (current && l.tokenizer.encode(`${current} ${sentence}`).length > max) {
                    chunks.push(current);
                    current = sentence;
                } else {
                    current = current ? `${current} ${sentence}` : sentence;
                }
            }
            if (current) chunks.push(current);
            return { chunks, afterEos };
        }

        async function generate(l, voice, text, id) {
            const { chunks, afterEos } = prepareText(l, text);
            const meta = l.meta, latentDim = meta.latent_dim;
            const parts = [];
            const emptySeq = tensor("float32", new Float32Array(0), [1, 0, latentDim]);
            const emptyText = tensor("float32", new Float32Array(0), [1, 0, meta.conditioning_dim]);
            const s = tensor("float32", new Float32Array([0]), [1, 1]);
            const t = tensor("float32", new Float32Array([1]), [1, 1]);
            for (let c = 0; c < chunks.length; c++) {
                const flowState = Object.assign({}, voice);
                const mimiState = initState(meta.mimi_state_manifest);
                const ids = l.tokenizer.encode(chunks[c]);
                let textEmb = (await l.sessions.text.run({ token_ids: tensor("int64", BigInt64Array.from(ids, (v) => BigInt(v)), [1, ids.length]) }))[l.sessions.text.outputNames[0]];
                if (textEmb.dims.length === 2) textEmb = tensor("float32", new Float32Array(textEmb.data), [1, textEmb.dims[0], textEmb.dims[1]]);
                takeState(flowState, await l.sessions.main.run(Object.assign({ sequence: emptySeq, text_embeddings: textEmb }, flowState)), meta.flow_lm_state_manifest);
                const latents = [];
                let latent = tensor("float32", new Float32Array(latentDim).fill(NaN), [1, 1, latentDim]);
                let eosStep = null;
                for (let step = 0; step < MAX_FRAMES; step++) {
                    if (cancelled.has(id)) throw new Cancelled();
                    const out = await l.sessions.main.run(Object.assign({ sequence: latent, text_embeddings: emptyText }, flowState));
                    if (eosStep === null && out.eos_logit.data[0] > -4) eosStep = step;
                    const x = new Float32Array(latentDim);
                    for (let i = 0; i < latentDim; i++) {
                        const u = 1 - Math.random(), v = Math.random();
                        x[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * Math.sqrt(TEMPERATURE);
                    }
                    const dir = (await l.sessions.flow.run({ c: out.conditioning, s, t, x: tensor("float32", x, [1, latentDim]) })).flow_dir.data;
                    for (let i = 0; i < latentDim; i++) x[i] += dir[i];
                    latents.push(x);
                    latent = tensor("float32", x, [1, 1, latentDim]);
                    takeState(flowState, out, meta.flow_lm_state_manifest);
                    if (eosStep !== null && step >= eosStep + afterEos) break;
                }
                for (let i = 0; i < latents.length; i += 12) {
                    const group = latents.slice(i, i + 12);
                    const joined = new Float32Array(group.length * latentDim);
                    group.forEach((g, k) => joined.set(g, k * latentDim));
                    const decoded = await l.sessions.decoder.run(Object.assign({ latent: tensor("float32", joined, [1, group.length, latentDim]) }, mimiState));
                    for (const e of meta.mimi_state_manifest) mimiState[e.input_name] = decoded[e.output_name];
                    parts.push(new Float32Array(decoded[l.sessions.decoder.outputNames[0]].data));
                }
                if (c < chunks.length - 1) parts.push(new Float32Array(Math.floor(GAP_SECONDS * meta.sample_rate)));
            }
            const audio = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
            let offset = 0;
            for (const p of parts) { audio.set(p, offset); offset += p.length; }
            return audio;
        }

        // Supertonic 3: one model for every language; duration predictor, text encoder, a few
        // denoising steps of the vector estimator, vocoder (44.1 kHz)
        const ST_STEPS = 8;
        let supertonic = null; // {cfg, indexer, sessions, voices: Map}
        async function loadSupertonic() {
            if (supertonic) return supertonic;
            await loadOrt();
            const dir = `${base}supertonic/`;
            const json = async (file) => JSON.parse(new TextDecoder().decode(await fetchBuffer(dir + file)));
            const cfg = await json("tts.json");
            const indexer = await json("unicode_indexer.json");
            const sessions = {};
            for (const key of ["duration_predictor", "text_encoder", "vector_estimator", "vocoder"]) {
                sessions[key] = await ort.InferenceSession.create(dir + key + ".onnx", { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
            }
            supertonic = { cfg, indexer, sessions, voices: new Map() };
            return supertonic;
        }
        async function supertonicVoice(st, name) {
            if (st.voices.has(name)) return st.voices.get(name);
            const style = JSON.parse(new TextDecoder().decode(await fetchBuffer(`${base}supertonic/${name}.json`)));
            const make = (entry) => tensor("float32", Float32Array.from(entry.data.flat(Infinity)), entry.dims);
            const voice = { ttl: make(style.style_ttl), dp: make(style.style_dp) };
            st.voices.set(name, voice);
            return voice;
        }
        function supertonicText(text, code) {
            text = text.normalize("NFKD")
                .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+/gu, "");
            const replacements = [["–", "-"], ["‑", "-"], ["—", "-"], ["_", " "], ["“", '"'], ["”", '"'], ["‘", "'"],
                ["’", "'"], ["´", "'"], ["`", "'"], ["[", " "], ["]", " "], ["|", " "], ["/", " "], ["#", " "], ["→", " "], ["←", " "],
                ["@", " at "], ["e.g.,", "for example, "], ["i.e.,", "that is, "]];
            for (const [from, to] of replacements) text = text.split(from).join(to);
            text = text.replace(/[♥☆♡©\\]/g, "").replace(/ ([,.!?;:'])/g, "$1").replace(/""+/g, '"').replace(/''+/g, "'")
                .replace(/\s+/g, " ").trim();
            if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text)) text += ".";
            return `<${code}>${text}</${code}>`;
        }
        function supertonicChunks(text, code) {
            const max = code === "ko" || code === "ja" ? 120 : 300;
            const chunks = [];
            for (const paragraph of text.trim().split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)) {
                let current = "";
                for (const sentence of paragraph.split(/(?<!Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sr\.|Jr\.|Ph\.D\.|etc\.|e\.g\.|i\.e\.|vs\.|Inc\.|Ltd\.|Co\.|Corp\.|St\.|Ave\.|Blvd\.)(?<!\b[A-Z]\.)(?<=[.!?])\s+/)) {
                    if (current.length + sentence.length + 1 <= max) current += (current ? " " : "") + sentence;
                    else {
                        if (current) chunks.push(current.trim());
                        current = sentence;
                    }
                }
                if (current) chunks.push(current.trim());
            }
            return chunks;
        }
        async function supertonicGenerate(st, voice, text, code, speed, id) {
            const rate = st.cfg.ae.sample_rate, chunkSize = st.cfg.ae.base_chunk_size * st.cfg.ttl.chunk_compress_factor;
            const latentDim = st.cfg.ttl.latent_dim * st.cfg.ttl.chunk_compress_factor;
            const parts = [];
            const chunks = supertonicChunks(text, code);
            for (let c = 0; c < chunks.length; c++) {
                const prepared = supertonicText(chunks[c], code);
                const ids = new BigInt64Array(prepared.length);
                for (let i = 0; i < prepared.length; i++) {
                    const point = prepared.codePointAt(i);
                    ids[i] = BigInt(point < st.indexer.length ? st.indexer[point] : -1);
                }
                const textIds = tensor("int64", ids, [1, ids.length]);
                const textMask = tensor("float32", new Float32Array(ids.length).fill(1), [1, 1, ids.length]);
                const s = st.sessions;
                const duration = (await s.duration_predictor.run({ text_ids: textIds, style_dp: voice.dp, text_mask: textMask })).duration.data[0] / speed;
                const textEmb = (await s.text_encoder.run({ text_ids: textIds, style_ttl: voice.ttl, text_mask: textMask })).text_emb;
                const wavLength = Math.floor(duration * rate);
                const latentLength = Math.max(1, Math.floor((wavLength + chunkSize - 1) / chunkSize));
                let xt = new Float32Array(latentDim * latentLength);
                for (let i = 0; i < xt.length; i++) {
                    const u = Math.max(0.0001, Math.random()), v = Math.random();
                    xt[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
                }
                const latentMask = tensor("float32", new Float32Array(latentLength).fill(1), [1, 1, latentLength]);
                const total = tensor("float32", new Float32Array([ST_STEPS]), [1]);
                for (let step = 0; step < ST_STEPS; step++) {
                    if (cancelled.has(id)) throw new Cancelled();
                    const out = await s.vector_estimator.run({
                        noisy_latent: tensor("float32", xt, [1, latentDim, latentLength]), text_emb: textEmb, style_ttl: voice.ttl,
                        latent_mask: latentMask, text_mask: textMask, current_step: tensor("float32", new Float32Array([step]), [1]), total_step: total,
                    });
                    xt = new Float32Array(out.denoised_latent.data);
                }
                if (cancelled.has(id)) throw new Cancelled();
                const wav = (await s.vocoder.run({ latent: tensor("float32", xt, [1, latentDim, latentLength]) })).wav_tts.data;
                parts.push(new Float32Array(wav.subarray(0, Math.min(wav.length, wavLength))));
                if (c < chunks.length - 1) parts.push(new Float32Array(Math.floor(0.3 * rate)));
            }
            const audio = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
            let offset = 0;
            for (const p of parts) { audio.set(p, offset); offset += p.length; }
            return audio;
        }

        // Speed and pitch: stretch the time (WSOLA), then resample by the pitch ratio
        function stretch(x, factor) {
            if (Math.abs(factor - 1) < 0.001 || x.length < 2048) return x;
            const N = 1024, hop = N / 2, analysisHop = hop / factor, tolerance = 256;
            const window = new Float32Array(N).map((_, i) => 0.5 - (0.5 * Math.cos((2 * Math.PI * i) / N)));
            const length = Math.ceil(x.length * factor);
            const out = new Float32Array(length + N), norm = new Float32Array(length + N);
            const at = (i) => (i >= 0 && i < x.length ? x[i] : 0);
            let previous = 0;
            for (let k = 0; k * hop < length; k++) {
                const nominal = Math.round(k * analysisHop);
                let best = nominal;
                if (k > 0) {
                    const natural = previous + hop;
                    let bestScore = -Infinity;
                    for (let d = -tolerance; d <= tolerance; d += 2) {
                        const start = nominal + d;
                        if (start < 0) continue;
                        let score = 0;
                        for (let i = 0; i < hop; i += 4) score += at(start + i) * at(natural + i);
                        if (score > bestScore) { bestScore = score; best = start; }
                    }
                }
                const outStart = k * hop;
                for (let i = 0; i < N; i++) {
                    out[outStart + i] += at(best + i) * window[i];
                    norm[outStart + i] += window[i];
                }
                previous = best;
            }
            for (let i = 0; i < length; i++) out[i] = norm[i] > 0.001 ? out[i] / norm[i] : 0;
            return out.subarray(0, length);
        }
        function resample(x, ratio) {
            if (Math.abs(ratio - 1) < 0.001) return x;
            const out = new Float32Array(Math.floor(x.length / ratio));
            for (let i = 0; i < out.length; i++) {
                const p = i * ratio, j = Math.floor(p), f = p - j;
                out[i] = (x[j] || 0) * (1 - f) + (x[j + 1] || 0) * f;
            }
            return out;
        }

        async function handle({ id, type, data }) {
            if (type === "init") {
                base = data.base;
                return {};
            }
            if (type === "speak") {
                const pitch = data.pitch / 100, speed = data.speed / 100;
                // Supertonic sets the speed itself (shorter durations); Pocket TTS gets it by time stretching
                const st = data.engine === "supertonic";
                const key = st ? `supertonic|${data.language}|${data.voiceKey}|${data.speed}|${data.text}` : `${data.language}|${data.voiceKey}|${data.text}`;
                let audio = cache.get(key);
                if (audio) cache.delete(key);
                else if (st) {
                    const model = await loadSupertonic();
                    audio = { samples: await supertonicGenerate(model, await supertonicVoice(model, data.voiceKey), data.text, data.language, 1.05 * speed, id),
                        rate: model.cfg.ae.sample_rate };
                } else {
                    const l = await loadLanguage(data.language);
                    audio = { samples: await generate(l, await voiceState(l, data.voiceKey, data.voiceAudio), data.text, id), rate: l.meta.sample_rate };
                }
                cache.set(key, audio);
                while (cache.size > 40) cache.delete(cache.keys().next().value);
                const result = new Float32Array(resample(stretch(audio.samples, st ? pitch : pitch / speed), pitch));
                return { result, sampleRate: audio.rate };
            }
            if (type === "pitch") { // Loudkit's speech (made by the app): only the pitch is changed here
                const pitch = data.pitch / 100;
                return { result: new Float32Array(resample(stretch(data.samples, pitch), pitch)) };
            }
            throw new Error(`unknown request ${type}`);
        }

        let queue = Promise.resolve();
        self.onmessage = (event) => {
            const message = event.data;
            if (message.type === "cancel") {
                cancelled.add(message.data.id);
                return;
            }
            queue = queue.then(async () => {
                try {
                    if (cancelled.has(message.id)) throw new Cancelled();
                    const reply = await handle(message);
                    self.postMessage(Object.assign({ id: message.id }, reply), reply.result ? [reply.result.buffer] : []);
                } catch (error) {
                    self.postMessage({ id: message.id, error: error instanceof Cancelled ? "cancelled" : String((error && error.message) || error) });
                } finally {
                    cancelled.delete(message.id);
                }
            });
        };
    }

    let worker = null;
    let nextId = 1;
    const pending = new Map();
    // Sends a request to the worker; returns its id (for "cancel") and a promise of the reply
    const call = (type, data, transfer) => {
        if (!worker) {
            const url = URL.createObjectURL(new Blob([`(${workerMain.toString()})()`], { type: "text/javascript" }));
            worker = new Worker(url, { type: "module" });
            worker.onmessage = (event) => {
                const job = pending.get(event.data.id);
                if (!job) return;
                pending.delete(event.data.id);
                if (event.data.error) job.reject(new Error(event.data.error));
                else job.resolve(event.data);
            };
            worker.postMessage({ id: 0, type: "init", data: { base: new URL(BASE, location.href).href } });
        }
        const id = nextId++;
        const promise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
        worker.postMessage({ id, type, data }, transfer || []);
        return { id, promise };
    };
    const cancel = (id) => {
        if (worker && id) worker.postMessage({ type: "cancel", data: { id } });
    };

    // The packs a request needs (packsFor); the app offers to download missing ones. A packaged
    // game sets pmSpeechBase: it has no installer, the packager put the files next to it.
    const packsFor = (request) => (request.engine === "supertonic" ? ["onnxruntime", "supertonic"]
        : ["onnxruntime", "pocket-voices", `pocket-${request.language}`]);
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
    // Per-sprite settings and playback through the sprite's own sound effects
    // ------------------------------------------------------------------------------------------
    const STATE = "pmTextToSpeech.state";
    const fresh = (from) => Object.assign({}, DEFAULTS, from, { job: 0, request: 0, speaking: false, playing: null });
    const stateOf = (target) => {
        let state = target.getCustomState(STATE);
        if (!state) {
            state = fresh();
            target.setCustomState(STATE, state);
        }
        return state;
    };
    runtime.on("targetWasCreated", (target, original) => {
        if (original) {
            const { voice, language, speed, pitch } = stateOf(original);
            target.setCustomState(STATE, fresh({ voice, language, speed, pitch }));
        }
    });

    const wav = (samples, rate) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const text = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
        text(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); text(8, "WAVEfmt ");
        view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
        view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        text(36, "data"); view.setUint32(40, samples.length * 2, true);
        for (let i = 0; i < samples.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
        return new Uint8Array(buffer);
    };

    // What the worker needs for a voice: the engine, its language code and voice
    let warnedLanguage = false;
    function requestFor(voice, language) {
        if (SUPERTONIC_VOICES[voice.name]) return { engine: "supertonic", language: LANGUAGES[language], voiceKey: SUPERTONIC_VOICES[voice.name] };
        if (!POCKET_LANGUAGES.includes(language)) {
            if (!warnedLanguage) console.warn(`Text To Speech: Pocket TTS voices don't speak ${language}, they speak english; Supertonic voices speak it.`);
            warnedLanguage = true;
            language = "english";
        }
        return { engine: "pocket", language };
    }

    const cloneAudio = new Map(); // sound asset id -> Float32Array (24 kHz mono, at most 10 s)
    async function voiceFor(target, state) {
        if (!state.voice.sound) return { voiceKey: state.voice.name };
        const sound = target.getSounds().find((s) => s.name === state.voice.sound);
        if (!sound || !sound.asset) return { voiceKey: DEFAULTS.voice.name };
        const key = `clone:${sound.asset.assetId}`;
        if (!cloneAudio.has(key)) {
            const decoded = await runtime.audioEngine.audioContext.decodeAudioData(sound.asset.data.slice().buffer);
            const seconds = Math.min(10, decoded.duration);
            const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(seconds * 24000)), 24000);
            const source = offline.createBufferSource();
            source.buffer = decoded;
            source.connect(offline.destination);
            source.start();
            cloneAudio.set(key, (await offline.startRendering()).getChannelData(0));
        }
        return { voiceKey: key, voiceAudio: new Float32Array(cloneAudio.get(key)) };
    }

    function stop(target) {
        const state = stateOf(target);
        state.job++;
        cancel(state.request);
        state.request = 0;
        state.speaking = false;
        if (state.playing) state.playing.stop();
        state.playing = null;
    }

    async function speak(target, text) {
        text = Scratch.Cast.toString(text).slice(0, 2000);
        stop(target);
        const state = stateOf(target);
        const job = state.job;
        if (!text.trim() || !runtime.audioEngine) return;
        state.speaking = true;
        try {
            const engine = requestFor(state.voice, state.language);
            if (!(await ensurePacks(packsFor(engine))) || state.job !== job) return;
            let result;
            try {
                const voice = engine.engine === "supertonic" ? {} : await voiceFor(target, state);
                if (state.job !== job) return;
                const request = call("speak", Object.assign({ text, speed: state.speed, pitch: state.pitch }, engine, voice),
                    voice.voiceAudio ? [voice.voiceAudio.buffer] : []);
                state.request = request.id;
                result = await request.promise;
            } catch (error) {
                if (error.message !== "cancelled") console.warn("Text To Speech:", error);
                return;
            }
            if (state.job !== job || !result.result.length) return;
            const player = await runtime.audioEngine.decodeSoundPlayer({ data: wav(result.result, result.sampleRate) });
            if (state.job !== job) return;
            const bank = target.sprite.soundBank;
            bank.addSoundPlayer(player);
            state.playing = player;
            try {
                await bank.playSound(target, player.id);
            } finally {
                if (state.playing === player) state.playing = null;
                const effects = bank.soundEffects.get(player.id);
                if (effects) effects.dispose();
                bank.soundEffects.delete(player.id);
                bank.playerTargets.delete(player.id);
                delete bank.soundPlayers[player.id];
            }
        } finally {
            if (state.job === job) {
                state.speaking = false;
                state.request = 0;
            }
        }
    }
    runtime.on("PROJECT_STOP_ALL", () => {
        for (const target of runtime.targets) {
            if (target.getCustomState(STATE)) stop(target);
        }
    });

    // ------------------------------------------------------------------------------------------
    // Credits: the engine and the CC BY voices the project's blocks use (the app's credit sprite)
    // ------------------------------------------------------------------------------------------
    const pocketVoiceCredit = (v) => Object.assign({}, VOICES[v], { title: `${VOICES[v].title} (voice ${v})` });
    const usedCredits = () => {
        let used = false, supertonicUsed = false;
        const voices = new Set(["alba"]); // the default voice
        for (const target of runtime.targets) {
            if (!target.isOriginal) continue;
            const blocks = target.blocks._blocks;
            for (const block of Object.values(blocks)) {
                if (!block.opcode || !block.opcode.startsWith(`${ID}_`)) continue;
                used = true;
                if (block.opcode !== `${ID}_setVoice`) continue;
                const input = block.inputs.VOICE && blocks[block.inputs.VOICE.block];
                const field = input && input.fields && input.fields.voices;
                if (field && VOICES[field.value] !== undefined) voices.add(field.value);
                else if (field && SUPERTONIC_VOICES[field.value]) supertonicUsed = true;
                else { // chosen by a reporter
                    Object.keys(VOICES).forEach((v) => voices.add(v));
                    supertonicUsed = true;
                }
            }
        }
        if (!used) return [];
        return ENGINE_CREDITS.concat(supertonicUsed ? [SUPERTONIC_CREDIT] : [],
            Array.from(voices).filter((v) => VOICES[v]).map(pocketVoiceCredit));
    };
    runtime.pmCreditProviders = (runtime.pmCreditProviders || []).filter((p) => p.id !== ID);
    const provider = () => usedCredits();
    provider.id = ID;
    runtime.pmCreditProviders.push(provider);
    let lastCredits = "";
    let creditTimer = null;
    const checkCredits = () => {
        creditTimer = null;
        const now = JSON.stringify(usedCredits());
        if (now !== lastCredits) {
            lastCredits = now;
            runtime.emit("PM_CREDITS_CHANGED");
        }
    };
    const scheduleCredits = () => { if (!creditTimer) creditTimer = setTimeout(checkCredits, 500); };
    runtime.on("PROJECT_CHANGED", scheduleCredits);
    runtime.on("PROJECT_LOADED", scheduleCredits);
    scheduleCredits();

    // ------------------------------------------------------------------------------------------
    // "Make a speech sound": makes speech once in the editor and adds it to the sprite as a sound
    // carrying its credits (the credit sprite lists them); the game then needs no speech files.
    // ------------------------------------------------------------------------------------------
    const soundCredit = (voice, target, model) => {
        if (SUPERTONIC_VOICES[voice.name]) return Object.assign({ v: 1 }, SUPERTONIC_CREDIT);
        if (voice.loudkit) {
            const source = LOUDKIT_CC_BY[voice.loudkit];
            return Object.assign({ v: 1 }, loudkitCredit(model), source ? { extra: [Object.assign({ title: `Loudkit voice "${voice.loudkit}" (voice profile made from a recording)`,
                by: source[0], url: source[1], modified: true, needsCredit: true }, CC_BY)] } : {});
        }
        const extra = voice.loudkitSound ? [] : [ENGINE_CREDITS[1]];
        if (voice.sound || voice.loudkitSound) {
            const sound = target.getSounds().find((s) => s.name === (voice.sound || voice.loudkitSound));
            if (sound && sound.pmCredit) extra.push(...[sound.pmCredit].concat(sound.pmCredit.extra || []).map((c) => Object.assign({}, c, { extra: undefined })));
        } else if (VOICES[voice.name]) {
            const credit = pocketVoiceCredit(voice.name);
            extra.push(Object.assign(credit, { title: `${credit.title}, clip resampled and cut` }));
        }
        return Object.assign({ v: 1 }, voice.loudkitSound ? loudkitCredit(model) : ENGINE_CREDITS[0], { extra });
    };
    let recorder = null;
    function openRecorder() {
        if (recorder) return;
        const target = vm.editingTarget || runtime.getTargetForStage();
        if (!target) return;
        const el = (tag, style, props) => Object.assign(document.createElement(tag), props || {}, style ? { style: style } : {});
        const field = "display:block;width:100%;box-sizing:border-box;margin:4px 0 10px;padding:6px;font:inherit;color:#333;background:white;border:1px solid #c4c4c4;border-radius:4px;";
        const button = "padding:8px 14px;font:inherit;font-weight:bold;border:none;border-radius:4px;cursor:pointer;color:white;background:#4c6ef5;margin-left:8px;";
        const overlay = el("div", "position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;font-family:Helvetica,Arial,sans-serif;font-size:14px;");
        const box = el("div", "background:white;color:#333;border-radius:8px;padding:18px 20px;width:440px;max-width:calc(100vw - 32px);max-height:calc(100vh - 32px);overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,0.35);");
        box.append(el("div", "font-size:18px;font-weight:bold;margin-bottom:10px;", { textContent: "Make a speech sound" }));
        const label = (text) => el("label", "font-weight:bold;", { textContent: text });
        const text = el("textarea", field + "height:80px;resize:vertical;", { value: "Hello!", maxLength: 2000 });
        const voice = el("select", field);
        const group = (name, entries) => {
            const g = el("optgroup", null, { label: name });
            for (const [value, shown] of entries) g.append(el("option", null, { value, textContent: shown }));
            voice.append(g);
        };
        group("Pocket TTS", Object.keys(VOICES).map((v) => [`voice:${v}`, v]));
        group("Supertonic 3", Object.keys(SUPERTONIC_VOICES).map((v) => [`voice:${v}`, v]));
        const languageName = (code) => Object.keys(LANGUAGES).find((l) => LANGUAGES[l] === code);
        group("Loudkit (only here, not in blocks; downloads its model once)", Object.keys(LOUDKIT_VOICES).map((v) => [`loudkit:${v}`, `${v} (${languageName(LOUDKIT_VOICES[v])})`]));
        const LOUDKIT_LANGUAGES = Object.keys(LANGUAGES).filter((l) => Object.values(LOUDKIT_VOICES).includes(LANGUAGES[l]));
        const sounds = target.getSounds().map((s) => s.name);
        if (sounds.length) group("Pocket TTS, clone of a sound of this sprite (only voices you have permission to use)", sounds.map((s) => [`sound:${s}`, `clone of ${s}`]));
        if (sounds.length) group("Loudkit, clone of a sound of this sprite (only voices you have permission to use; 5 to 10 s of clear speech; +0.5 GB once)",
            sounds.map((s) => [`loudkitsound:${s}`, `Loudkit clone of ${s}`]));
        const model = el("select", field);
        for (const [value, m] of Object.entries(LOUDKIT_MODELS)) model.append(el("option", null, { value, textContent: m.shown }));
        const modelLabel = label("Loudkit model");
        const language = el("select", field);
        const pick = (entries, value) => {
            const select = el("select", field);
            for (const v of entries) select.append(el("option", null, { value: v, textContent: v }));
            select.value = value;
            return select;
        };
        const speed = pick(Object.keys(SPEEDS), "normal"), pitch = pick(Object.keys(PITCHES), "normal");
        const name = el("input", field, { value: "speech", maxLength: 80 });
        const note = el("div", "font-size:12px;color:#666;margin-bottom:10px;");
        const status = el("div", "min-height:18px;margin-bottom:10px;color:#4c6ef5;");
        const chosenVoice = () => (voice.value.startsWith("sound:") ? { sound: voice.value.slice(6) }
            : voice.value.startsWith("loudkitsound:") ? { loudkitSound: voice.value.slice(13) }
            : voice.value.startsWith("loudkit:") ? { loudkit: voice.value.slice(8) } : { name: voice.value.slice(6) });
        const isLoudkit = (chosen) => !!(chosen.loudkit || chosen.loudkitSound);
        // A Loudkit voice starts in its own language when picked
        const fillLanguages = (picked) => {
            const chosen = chosenVoice();
            const st = !!SUPERTONIC_VOICES[chosen.name];
            const list = isLoudkit(chosen) ? LOUDKIT_LANGUAGES : st ? Object.keys(LANGUAGES) : POCKET_LANGUAGES;
            const keep = chosen.loudkit && picked ? languageName(LOUDKIT_VOICES[chosen.loudkit]) : language.value || "english";
            language.textContent = "";
            for (const l of list) language.append(el("option", null, { value: l, textContent: l }));
            language.value = list.includes(keep) ? keep : "english";
            modelLabel.style.display = model.style.display = isLoudkit(chosen) ? "" : "none";
            note.textContent = chosen.loudkitSound ? "Loudkit clone: use only voices you have permission to use. The credit says the speech is machine-generated and keeps the sound's own credits."
                : chosen.loudkit ? "Loudkit (Apache-2.0), runs on this computer: the credit says the speech is machine-generated. Other languages than the voice's own get its accent."
                : st ? "Supertonic 3 (OpenRAIL-M): the credit says the speech is machine-generated; keep that in your game's credits."
                : "Pocket TTS (CC BY 4.0): the sound's credits go into the credit sprite.";
        };
        voice.value = `voice:${stateOf(target).voice.name && (VOICES[stateOf(target).voice.name] !== undefined || SUPERTONIC_VOICES[stateOf(target).voice.name]) ? stateOf(target).voice.name : "alba"}`;
        voice.onchange = () => fillLanguages(true);
        fillLanguages();
        box.append(label("Text"), text, label("Voice"), voice, modelLabel, model, label("Language"), language);
        const row = el("div", "display:flex;gap:12px;");
        const half = (title, input) => { const d = el("div", "flex:1;"); d.append(label(title), input); return d; };
        row.append(half("Speed", speed), half("Pitch", pitch));
        box.append(row, label("Sound name"), name, note, status);
        const buttons = el("div", "text-align:right;");
        const close = el("button", button + "background:#868e96;", { textContent: "Close" });
        const preview = el("button", button, { textContent: "Preview" });
        const add = el("button", button, { textContent: "Add to sprite" });
        buttons.append(close, preview, add);
        box.append(buttons);
        overlay.append(box);
        document.body.append(overlay);
        text.focus();

        let request = 0, audio = null, last = null;
        const busy = (on) => { preview.disabled = add.disabled = on; preview.style.opacity = add.style.opacity = on ? "0.5" : "1"; };
        const make = async () => {
            const chosen = chosenVoice();
            const settings = { text: text.value.slice(0, 2000), voice: chosen, language: language.value,
                speed: SPEEDS[speed.value], pitch: PITCHES[pitch.value], model: isLoudkit(chosen) ? model.value : undefined };
            const key = JSON.stringify(settings);
            if (last && last.key === key) return last;
            if (!settings.text.trim()) throw new Error("Type some text first.");
            if (isLoudkit(chosen)) {
                status.textContent = "Getting the Loudkit files ready…";
                if (!(await ensurePacks(["loudkit-engine", settings.model].concat(chosen.loudkitSound ? ["loudkit-cloning"] : []))))
                    throw new Error("The Loudkit files are not downloaded.");
                status.textContent = "Making speech with Loudkit… (the first time loads the model, this can take a while)";
                let clone = null;
                if (chosen.loudkitSound) { // first 10 s of the sound at 24 kHz, as base64 float32
                    const v = await voiceFor(target, { voice: { sound: chosen.loudkitSound } });
                    if (!v.voiceAudio) throw new Error("That sound is gone.");
                    const bytes = new Uint8Array(v.voiceAudio.buffer);
                    let binary = "";
                    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
                    clone = { key: v.voiceKey, sampleRate: 24000, samples: btoa(binary) };
                }
                const res = await fetch(`${BASE}loudkit`, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: settings.text, model: settings.model, voice: chosen.loudkit || "", clone,
                        language: LANGUAGES[settings.language], speed: settings.speed / 100 }) });
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `error ${res.status}`);
                if (!recorder) throw new Error("cancelled");
                const sampleRate = Number(res.headers.get("X-Sample-Rate"));
                const samples = new Float32Array(await res.arrayBuffer());
                const job = call("pitch", { samples, pitch: settings.pitch }, [samples.buffer]);
                request = job.id;
                const shifted = await job.promise;
                request = 0;
                last = { key, settings, data: wav(shifted.result, sampleRate), seconds: shifted.result.length / sampleRate };
                return last;
            }
            const engine = requestFor(chosen, settings.language);
            status.textContent = "Getting the speech files ready…";
            if (!(await ensurePacks(packsFor(engine)))) throw new Error("The speech files are not downloaded.");
            status.textContent = "Making speech… (the first time loads the model, this can take a while)";
            const v = engine.engine === "supertonic" ? {} : await voiceFor(target, { voice: chosen });
            const job = call("speak", Object.assign({ text: settings.text, speed: settings.speed, pitch: settings.pitch }, engine, v),
                v.voiceAudio ? [v.voiceAudio.buffer] : []);
            request = job.id;
            const result = await job.promise;
            request = 0;
            last = { key, settings, data: wav(result.result, result.sampleRate), seconds: result.result.length / result.sampleRate };
            return last;
        };
        const run = (then) => async () => {
            busy(true);
            try {
                await then(await make());
            } catch (error) {
                if (recorder) status.textContent = error.message === "cancelled" ? "" : `Could not make the sound: ${error.message}`;
            } finally {
                if (recorder) busy(false);
            }
        };
        preview.onclick = run(async (made) => {
            if (audio) audio.pause();
            audio = new Audio(URL.createObjectURL(new Blob([made.data], { type: "audio/wav" })));
            audio.play();
            status.textContent = `Playing (${made.seconds.toFixed(1)} s).`;
        });
        add.onclick = run(async (made) => {
            const storage = runtime.storage;
            const asset = storage.createAsset(storage.AssetType.Sound, storage.DataFormat.WAV, made.data, null, true);
            const soundName = name.value.trim() || "speech";
            await vm.addSound({ name: soundName, dataFormat: storage.DataFormat.WAV, asset, md5: `${asset.assetId}.${storage.DataFormat.WAV}`,
                assetId: asset.assetId, pmCredit: soundCredit(made.settings.voice, target, made.settings.model) }, target.id);
            status.textContent = `Added "${soundName}" (${made.seconds.toFixed(1)} s) to ${target.isStage ? "the stage" : target.getName()}.`;
        });
        close.onclick = () => {
            cancel(request);
            if (audio) audio.pause();
            overlay.remove();
            recorder = null;
        };
        overlay.onkeydown = (event) => { if (event.key === "Escape") close.onclick(); };
        recorder = overlay;
    }

    // Editor only: a set voice block that gets a Pocket voice while its language menu holds a language
    // Pocket can't speak switches that menu to english (same undo step as the voice change)
    const hookedWorkspaces = new WeakSet();
    const hookWorkspaces = () => {
        const SB = globalThis.ScratchBlocks;
        const main = SB && SB.getMainWorkspace && SB.getMainWorkspace();
        if (!main) return;
        const flyout = main.getFlyout && main.getFlyout();
        for (const ws of [main, flyout && flyout.getWorkspace()]) {
            if (!ws || hookedWorkspaces.has(ws)) continue;
            hookedWorkspaces.add(ws);
            ws.addChangeListener((event) => {
                if (event.type !== SB.Events.CHANGE || event.element !== "field" || event.name !== "voices" || VOICES[event.newValue] === undefined) return;
                const menu = ws.getBlockById(event.blockId);
                const block = menu && menu.getParent();
                if (!block || block.type !== `${ID}_setVoice`) return;
                const input = block.getInput("LANGUAGE");
                const languageMenu = input && input.connection && input.connection.targetBlock();
                const field = languageMenu && languageMenu.isShadow() && languageMenu.getField("languages");
                if (!field || POCKET_LANGUAGES.includes(field.getValue())) return;
                // A menu choice has no event group: give the voice change one (it is already on the undo
                // stack) and put the language change in it, so one undo reverts both
                if (!event.group) event.group = SB.utils.genUid();
                const group = SB.Events.getGroup();
                SB.Events.setGroup(event.group);
                field.setValue("english");
                SB.Events.setGroup(group);
            });
        }
    };
    hookWorkspaces();
    runtime.on("PROJECT_LOADED", hookWorkspaces);

    const percent = (value, table) => {
        const named = table[Scratch.Cast.toString(value).toLowerCase().trim()];
        const number = named === undefined ? Scratch.Cast.toNumber(value) : named;
        return Math.max(25, Math.min(400, number || 100));
    };

    class TextToSpeech {
        getInfo() {
            return {
                id: ID,
                name: "Text To Speech",
                color1: "#5c7cfa",
                color2: "#4c6ef5",
                color3: "#3b5bdb",
                blocks: [
                    { opcode: "speak", blockType: Scratch.BlockType.COMMAND, text: "speak [TEXT]",
                        arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello!" } } },
                    { opcode: "speakAndWait", blockType: Scratch.BlockType.COMMAND, text: "speak [TEXT] and wait",
                        arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello!" } } },
                    { opcode: "stopSpeaking", blockType: Scratch.BlockType.COMMAND, text: "stop speaking" },
                    { opcode: "isSpeaking", blockType: Scratch.BlockType.BOOLEAN, text: "speaking?" },
                    "---",
                    { opcode: "setVoice", blockType: Scratch.BlockType.COMMAND, text: "set voice to [VOICE] language to [LANGUAGE]",
                        arguments: { VOICE: { type: Scratch.ArgumentType.STRING, menu: "voices", defaultValue: "alba" },
                            LANGUAGE: { type: Scratch.ArgumentType.STRING, menu: "languages", defaultValue: "english" } } },
                    { opcode: "setSpeed", blockType: Scratch.BlockType.COMMAND, text: "set speed to [SPEED]",
                        arguments: { SPEED: { type: Scratch.ArgumentType.STRING, menu: "speeds", defaultValue: "normal" } } },
                    { opcode: "setPitch", blockType: Scratch.BlockType.COMMAND, text: "set pitch to [PITCH]",
                        arguments: { PITCH: { type: Scratch.ArgumentType.STRING, menu: "pitches", defaultValue: "normal" } } },
                    "---",
                    { blockType: Scratch.BlockType.LABEL, text: "Clone only voices you have permission to use." },
                    { opcode: "setCloneVoice", blockType: Scratch.BlockType.COMMAND, text: "set voice to clone of sound [SOUND]",
                        arguments: { SOUND: { type: Scratch.ArgumentType.STRING, menu: "sounds" } } },
                    "---",
                    { blockType: Scratch.BlockType.BUTTON, func: "openRecorder", text: "Make a speech sound" },
                ],
                menus: {
                    voices: { acceptReporters: true, items: Object.keys(VOICES).concat(Object.keys(SUPERTONIC_VOICES)) },
                    languages: { acceptReporters: true, items: "languageMenu" },
                    speeds: { acceptReporters: true, items: Object.keys(SPEEDS) },
                    pitches: { acceptReporters: true, items: Object.keys(PITCHES) },
                    sounds: { acceptReporters: true, items: "soundMenu" },
                },
            };
        }

        openRecorder() {
            openRecorder();
        }

        // All 31 languages; with a Pocket voice in the same block, only Pocket's 6 can be picked (the others
        // are greyed out). blockArgs = the block's other menus (the editor's VM passes them).
        languageMenu(targetId, blockArgs) {
            const voice = blockArgs && blockArgs.VOICE;
            const pocket = typeof voice === "string" && VOICES[voice] !== undefined;
            return Object.keys(LANGUAGES).map((l) => ({ text: l, value: l, disabled: pocket && !POCKET_LANGUAGES.includes(l) }));
        }

        soundMenu() {
            const target = vm.editingTarget || runtime.getTargetForStage();
            const names = target ? target.getSounds().map((s) => s.name) : [];
            return names.length ? names : [""];
        }

        speak(args, util) {
            speak(util.target, args.TEXT);
        }

        speakAndWait(args, util) {
            return speak(util.target, args.TEXT);
        }

        stopSpeaking(args, util) {
            stop(util.target);
        }

        isSpeaking(args, util) {
            return stateOf(util.target).speaking;
        }

        // Changes only what differs: an unchanged voice or language keeps what was loaded for it
        setVoice(args, util) {
            const state = stateOf(util.target);
            const name = Scratch.Cast.toString(args.VOICE).toLowerCase().trim();
            const language = Scratch.Cast.toString(args.LANGUAGE).toLowerCase().trim();
            if ((VOICES[name] !== undefined || SUPERTONIC_VOICES[name]) && (state.voice.name !== name || state.voice.sound)) state.voice = { name };
            if (LANGUAGES[language] && state.language !== language) state.language = language;
        }

        setCloneVoice(args, util) {
            const sound = Scratch.Cast.toString(args.SOUND);
            if (util.target.getSounds().some((s) => s.name === sound)) stateOf(util.target).voice = { sound };
        }

        setSpeed(args, util) {
            stateOf(util.target).speed = percent(args.SPEED, SPEEDS);
        }

        setPitch(args, util) {
            stateOf(util.target).pitch = percent(args.PITCH, PITCHES);
        }
    }

    Scratch.extensions.register(new TextToSpeech());
})(Scratch);
});
