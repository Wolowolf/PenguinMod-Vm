const log = require('../util/log');

/**
 * Desktop fork (section 162): a project's sounds are decoded (turned from their compressed file into raw audio) the
 * first time they are needed instead of all while the project opens. A sound that is not decoded yet gets its id at
 * once; what the sound bank is asked to do with it before then (play, stop, fade-out setting) is recorded in order and
 * done on the decoded sound, so it ends the same as before. The sounds a target's blocks name are decoded in the
 * background right after the project opens, one at a time, so they are usually ready when first played.
 * Extensions that read decoded audio themselves (EAGER_EXTENSIONS) switch back to decoding every sound at once.
 */

// read sound players' buffers directly: Sound Expanded, Tune Shark V3
const EAGER_EXTENSIONS = new Set(['lmsSoundExpanded', 'SPtuneShark3']);
const ALL_TARGETS = '*';

let lastId = 0;

// a stop before the sound was decoded: the plays waiting for it end now, as a playing sound would have stopped
const cancelPlays = entry => {
    entry.playing = false;
    entry.ops = entry.ops.filter(op => {
        if (op.resolve) op.resolve();
        return !op.resolve;
    });
};

// the bank's own methods keep working for decoded sounds; sounds still waiting for decoding are handled here
const patchBank = (bank, lazy) => {
    if (bank.pmPending) return;
    bank.pmPending = new Map();
    // Desktop fork (section 165): the decoded sounds that can go back to waiting, with their compressed file
    bank.pmDecoded = new Map();
    const {playSound, stop, stopAllSounds, dispose} = bank;
    bank.playSound = function (target, soundId, seconds) {
        const entry = this.pmPending.get(soundId);
        if (!entry) {
            const decoded = this.pmDecoded.get(soundId);
            if (decoded) decoded.lastUsed = Date.now();
            return playSound.call(this, target, soundId, seconds);
        }
        entry.playing = true;
        entry.lastTarget = target;
        const finished = new Promise(resolve => {
            const op = {resolve};
            op.run = player => {
                if (player) playSound.call(this, target, soundId, seconds).then(resolve);
                else resolve();
            };
            entry.ops.push(op);
        });
        lazy.ensure(this, soundId);
        return finished;
    };
    bank.stop = function (target, soundId) {
        const entry = this.pmPending.get(soundId);
        if (!entry) return stop.call(this, target, soundId);
        if (entry.playing && entry.lastTarget === target) cancelPlays(entry);
    };
    bank.stopAllSounds = function (target = ALL_TARGETS) {
        stopAllSounds.call(this, target);
        for (const entry of this.pmPending.values()) {
            if (entry.playing && (target === ALL_TARGETS || entry.lastTarget === target)) cancelPlays(entry);
        }
    };
    bank.dispose = function () {
        for (const entry of this.pmPending.values()) cancelPlays(entry);
        this.pmPending.clear();
        this.pmDecoded.clear();
        return dispose.call(this);
    };
};

// every field value in a target's blocks (sound menus, extension menus, typed text)
const fieldValues = blocks => {
    const values = new Set();
    for (const id in blocks._blocks) {
        const fields = blocks._blocks[id].fields;
        for (const name in fields) values.add(String(fields[name].value));
    }
    return values;
};

class LazySounds {
    constructor (runtime) {
        this.runtime = runtime;
        /** True once an extension that reads decoded audio was loaded: from then on every sound is decoded at once. */
        this.eager = false;
        this._warmQueue = [];
        this._warming = false;
        runtime.on('EXTENSION_ADDED', info => {
            if (!this.eager && info && EAGER_EXTENSIONS.has(info.id)) {
                this.eager = true;
                this.prepareAll();
            }
        });
    }

    /**
     * Give a sound its id without decoding it.
     * @param {object} sound - the sound
     * @param {Uint8Array} data - its compressed file
     * @param {?SoundBank} soundBank - the bank it belongs to
     * @returns {boolean} false when it must be decoded now instead
     */
    register (sound, data, soundBank) {
        if (this.eager || !soundBank) return false;
        patchBank(soundBank, this);
        const soundId = `pmsound-${++lastId}`;
        soundBank.pmPending.set(soundId, {
            sound, data, soundBank, soundId, ops: [], playing: false, lastTarget: null, promise: null
        });
        sound.soundId = soundId;
        return true;
    }

    /**
     * @param {?SoundBank} soundBank - a sound bank
     * @param {string} soundId - a sound's id
     * @returns {?object} the sound's record while it is not decoded yet
     */
    pending (soundBank, soundId) {
        return (soundBank && soundBank.pmPending && soundBank.pmPending.get(soundId)) || null;
    }

    /**
     * Decode a sound now.
     * @param {?SoundBank} soundBank - its bank
     * @param {string} soundId - its id
     * @returns {?Promise} resolves once it is decoded; null when it already is
     */
    ensure (soundBank, soundId) {
        const entry = this.pending(soundBank, soundId);
        if (!entry) return null;
        if (!entry.promise) entry.promise = this._decode(entry);
        return entry.promise;
    }

    _decode (entry) {
        const {sound, data, soundBank, soundId} = entry;
        return this.runtime.audioEngine.decodeSoundPlayer(Object.assign({}, sound, {data}))
            .then(player => player, e => {
                log.warn(`Failed to decode sound: ${sound.md5} with error: ${e}`);
                return null;
            })
            .then(player => {
                if (soundBank.pmPending.get(soundId) !== entry) {
                    // the bank was disposed meanwhile
                    if (player) player.dispose();
                    return;
                }
                soundBank.pmPending.delete(soundId);
                if (player) {
                    player.id = soundId;
                    // as the old loading did (load-sound.js): the audio engine resamples, so rate and length come
                    // from the decoded audio
                    sound.rate = player.buffer.sampleRate;
                    sound.sampleCount = player.buffer.length;
                    soundBank.addSoundPlayer(player);
                    entry.lastUsed = Date.now();
                    soundBank.pmDecoded.set(soundId, entry);
                }
                for (const op of entry.ops) op.run(player);
            });
    }

    /**
     * Desktop fork (section 165): the decoded sounds that could be freed. A playing sound counts as used just now.
     * @param {number} now - the time
     * @returns {Array.<{bytes: number, lastUsed: number, free: Function}>} those sounds
     */
    freeable (now) {
        const items = [];
        if (this.eager) return items;
        for (const bank of this._banksOf()) {
            for (const entry of bank.pmDecoded.values()) {
                const player = bank.soundPlayers[entry.soundId];
                if (!player) continue;
                if (player.isPlaying) entry.lastUsed = now;
                const {length, numberOfChannels} = player.buffer;
                items.push({
                    bytes: length * numberOfChannels * 4,
                    lastUsed: entry.lastUsed,
                    free: () => this._free(entry)
                });
            }
        }
        return items;
    }

    /**
     * @returns {number} about how many bytes the decoded sounds that could be freed use
     */
    decodedBytes () {
        return this.freeable(Date.now()).reduce((sum, item) => sum + item.bytes, 0);
    }

    // back to waiting with the same id; its fade-out setting comes back when it is decoded again
    _free (entry) {
        const {sound, data, soundBank, soundId} = entry;
        const player = soundBank.soundPlayers[soundId];
        const {stopFadeDecay} = player;
        const {duration} = player.buffer;
        soundBank.pmDecoded.delete(soundId);
        soundBank.playerTargets.delete(soundId);
        delete soundBank.soundPlayers[soundId];
        player.dispose();
        const effects = soundBank.soundEffects.get(soundId);
        if (effects) {
            effects.dispose();
            soundBank.soundEffects.delete(soundId);
        }
        soundBank.pmPending.set(soundId, {
            sound, data, soundBank, soundId, playing: false, lastTarget: null, promise: null, duration,
            ops: [{run: decoded => {
                if (decoded) decoded.stopFadeDecay = stopFadeDecay;
            }}]
        });
    }

    /**
     * Desktop fork (section 165): this sound's audio no longer comes from its file (edited): it stays decoded.
     * @param {?SoundBank} soundBank - its bank
     * @param {string} soundId - its id
     */
    keepDecoded (soundBank, soundId) {
        if (soundBank && soundBank.pmDecoded) soundBank.pmDecoded.delete(soundId);
    }

    // the sound banks of these targets and the project's (the engine never disposes an old project's banks, so
    // they are not listed anywhere else)
    _banksOf (targets = []) {
        const banks = new Set();
        for (const target of targets.concat(this.runtime.targets)) {
            const bank = target.sprite && target.sprite.soundBank;
            if (bank && bank.pmPending) banks.add(bank);
        }
        return banks;
    }

    /**
     * Decode every sound of the project, and of these targets, that is not decoded yet.
     * @param {Array.<Target>} [targets] - targets about to be added
     * @returns {Promise} resolves once all are
     */
    prepareAll (targets) {
        const promises = [];
        for (const bank of this._banksOf(targets)) {
            for (const soundId of bank.pmPending.keys()) promises.push(this.ensure(bank, soundId));
        }
        return Promise.all(promises);
    }

    /**
     * The editor wants a sound's audio: decode it and update the editor's targets when it is ready.
     * @param {?SoundBank} soundBank - its bank
     * @param {string} soundId - its id
     * @returns {boolean} true while it is not decoded yet
     */
    request (soundBank, soundId) {
        const promise = this.ensure(soundBank, soundId);
        if (!promise) return false;
        const entry = this.pending(soundBank, soundId);
        if (!entry.requested) {
            entry.requested = true;
            promise.then(() => this._emitUpdate());
        }
        return true;
    }

    _emitUpdate () {
        this.runtime.emit(this.runtime.constructor.TARGETS_UPDATE, false);
    }

    /**
     * Decode in the background, one at a time, the sounds that these targets' blocks name.
     * @param {Array.<Target>} targets - targets just added
     */
    warmUp (targets) {
        for (const target of targets) {
            const sprite = target.sprite;
            const bank = sprite && sprite.soundBank;
            if (!bank || !bank.pmPending || !bank.pmPending.size) continue;
            // a sound chosen by a reporter (number or joined name) is decoded when it is first played
            const values = fieldValues(target.blocks);
            for (const sound of sprite.sounds) {
                if (values.has(sound.name)) this._warmQueue.push([bank, sound.soundId]);
            }
        }
        if (!this._warming) this._warmNext();
    }

    _warmNext () {
        const banks = this._banksOf();
        while (this._warmQueue.length) {
            // Desktop fork (section 165): the rest is decoded when first needed
            if (!this.runtime.pmMemory.hasRoom()) {
                this._warmQueue.length = 0;
                break;
            }
            const [bank, soundId] = this._warmQueue.shift();
            // not for a project that was replaced meanwhile
            const promise = banks.has(bank) && this.ensure(bank, soundId);
            if (promise) {
                this._warming = true;
                promise.then(() => this._warmNext());
                return;
            }
        }
        if (this._warming) {
            // the sounds tab shows each sound's length, which decoding can change slightly
            this._warming = false;
            this._emitUpdate();
        }
    }
}

module.exports = LazySounds;
