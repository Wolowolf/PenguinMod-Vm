// Desktop fork (section 306): code Dictation and Text To Speech (ttsrV2) both had: asking the app for missing
// speech packs, and telling the credits sprite which credits a project uses.

const BASE = 'https://studio.penguinmod.com/__speech__/';

// One request per list of packs at a time; a failed or refused one is asked again next time.
const packRequests = new Map();

/**
 * The packs a block needs; the app offers to download missing ones. A packaged game sets pmSpeechBase: it has no
 * installer, the packager put the files next to it.
 * @param {Array<string>} packs The pack names.
 * @returns {Promise<boolean>} Whether they are there.
 */
const ensureSpeechPacks = packs => {
    if (globalThis.pmSpeechBase) return Promise.resolve(true);
    const key = packs.join(',');
    if (!packRequests.has(key)) {
        packRequests.set(key, fetch(`${BASE}install?packs=${key}`).then(async res => {
            if (res.status === 404) return true;
            const result = await res.json();
            if (!result.ok) packRequests.delete(key); // asked again next time
            return !!result.ok;
        }).catch(() => {
            packRequests.delete(key);
            return false;
        }));
    }
    return packRequests.get(key);
};

/**
 * Register an extension's credits (replacing an earlier registration with the same id) and emit
 * PM_CREDITS_CHANGED half a second after a project change or load when the credits it uses changed.
 * @param {Runtime} runtime The runtime.
 * @param {string} id The extension's id.
 * @param {function(): Array} usedCredits The credits the project uses now.
 */
const addCreditProvider = (runtime, id, usedCredits) => {
    runtime.pmCreditProviders = (runtime.pmCreditProviders || []).filter(p => p.id !== id);
    const provider = () => usedCredits();
    provider.id = id;
    runtime.pmCreditProviders.push(provider);
    let lastCredits = null;
    let creditTimer = null;
    const scheduleCredits = () => {
        if (creditTimer) return;
        creditTimer = setTimeout(() => {
            creditTimer = null;
            const now = JSON.stringify(usedCredits());
            if (now !== lastCredits) {
                lastCredits = now;
                runtime.emit('PM_CREDITS_CHANGED');
            }
        }, 500);
    };
    runtime.on('PROJECT_CHANGED', scheduleCredits);
    runtime.on('PROJECT_LOADED', scheduleCredits);
    scheduleCredits();
};

module.exports = {ensureSpeechPacks, addCreditProvider};
