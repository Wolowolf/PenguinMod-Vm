/**
 * Desktop fork (section 165): when decoded sounds and costume skins together go over a memory budget, the ones not used
 * for a while are freed, oldest first; they are made again from their file the next time they are needed (sounds:
 * lazy-sounds.js, skins: Skin._pmDefer). A sound that is playing and a costume that is shown are never freed. Nothing
 * used in the last IDLE_MS is freed either, so a project that really uses more than the budget goes over it instead of
 * decoding the same things again and again. What can't be made again (JPEGs, other PNGs than lazy-costumes.js puts off,
 * edited costumes and sounds) can't be freed and doesn't count.
 */

// about 60 big backdrops plus a few minutes of music: what ordinary projects never reach, and an amount a PC with 8 GB
// of memory can spare anyway, so freeing only happens when it is about to matter
const BUDGET_BYTES = 512 * 1024 * 1024;
const IDLE_MS = 60 * 1000;
const CHECK_MS = 5 * 1000;

class MemoryBudget {
    constructor (runtime) {
        this.runtime = runtime;
        this.budget = BUDGET_BYTES;
        this.idleMs = IDLE_MS;
        /** How much was freed so far. */
        this.freedBytes = 0;
        this._nextCheck = 0;
    }

    // true when the renderer can free skins and no extension reads them directly
    get _freesSkins () {
        const renderer = this.runtime.renderer;
        return !!(renderer && renderer.pmFreeableSkins && !this.runtime.pmCostumes.eager);
    }

    /**
     * @returns {number} about how many bytes the sounds and skins that could be freed use
     */
    usedBytes () {
        const skins = this._freesSkins ? this.runtime.renderer.pmSkinBytes() : 0;
        return skins + this.runtime.pmSounds.decodedBytes();
    }

    /**
     * For preparing things ahead of time.
     * @returns {boolean} true when more can be prepared without going over the budget
     */
    hasRoom () {
        return this.usedBytes() < this.budget;
    }

    /**
     * Called every frame.
     */
    tick () {
        const now = Date.now();
        if (now < this._nextCheck) return;
        this._nextCheck = now + CHECK_MS;
        this.check(now);
    }

    /**
     * Free what wasn't used for a while until the budget is kept.
     * @param {number} [now] - the time
     */
    check (now = Date.now()) {
        const items = this.runtime.pmSounds.freeable(now);
        if (this._freesSkins) {
            const renderer = this.runtime.renderer;
            for (const skin of renderer.pmFreeableSkins(now)) {
                skin.free = () => renderer.pmFreeSkin(skin.skinId);
                items.push(skin);
            }
        }
        let used = items.reduce((sum, item) => sum + item.bytes, 0);
        if (used <= this.budget) return;
        items.sort((a, b) => a.lastUsed - b.lastUsed);
        for (const item of items) {
            if (used <= this.budget || item.lastUsed >= now - this.idleMs) return;
            item.free();
            used -= item.bytes;
            this.freedBytes += item.bytes;
        }
    }
}

module.exports = MemoryBudget;
