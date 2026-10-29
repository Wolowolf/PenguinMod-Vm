// Desktop fork (section 159): the one door through which the shipped extensions reach the page
// (docs/EXTENSION-INTEGRATION.md "One door to the page"), `runtime.pmPage`. An engine that later runs in a worker
// needs a stand-in for this object only, instead of changes to every extension that uses the page. Each function
// calls the page function it stands for with the same arguments and returns what it returns, so nothing changes
// while the engine runs on the page.
// The groups, by what a worker stand-in would have to do:
// - messages: plain data in, plain data out; a stand-in sends them to the page and gets the answer back (dialogs and
//   storage answer at once on the page, so in a worker they would have to wait for the answer).
// - page events: the listener gets the real event here; a stand-in would listen on the page and send a plain copy of
//   the event's fields. Listeners that call the event's methods (preventDefault, clipboardData.setData) need the
//   page side.
// Planned, not here yet (the extensions still use the page directly; order in the doc): page facts and actions,
// device access (navigator), the stage canvas, images and media, page elements and the overlay over the stage.

/* eslint-env browser */

const eventTarget = function (target) {
    return target === 'document' ? document : window;
};

class PageDoor {
    // messages: dialogs

    /**
     * @param {...*} args Like alert().
     */
    alert (...args) {
        alert(...args);
    }

    /**
     * @param {...*} args Like confirm().
     * @returns {boolean} Whether OK was clicked.
     */
    confirm (...args) {
        return confirm(...args);
    }

    /**
     * @param {...*} args Like prompt().
     * @returns {?string} The text typed, or null when cancelled.
     */
    prompt (...args) {
        return prompt(...args);
    }

    // messages: the page's localStorage (where there is none: nothing stored, nothing read)

    /**
     * @param {string} key The key.
     * @returns {?string} The stored text, like localStorage.getItem().
     */
    storageGet (key) {
        return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
    }

    /**
     * @param {string} key The key.
     * @param {string} value The text, like localStorage.setItem().
     */
    storageSet (key, value) {
        if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    }

    /**
     * @param {string} key The key, like localStorage.removeItem().
     */
    storageRemove (key) {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    }

    /**
     * @param {*} area A storage event's storageArea.
     * @returns {boolean} Whether it is the page's localStorage.
     */
    isLocalStorage (area) {
        return typeof localStorage !== 'undefined' && area === localStorage;
    }

    // page events

    /**
     * @param {string} target 'window' or 'document'.
     * @param {...*} args Like addEventListener(): type, listener, options.
     */
    addEventListener (target, ...args) {
        eventTarget(target).addEventListener(...args);
    }

    /**
     * @param {string} target 'window' or 'document'.
     * @param {...*} args Like removeEventListener(): type, listener, options.
     */
    removeEventListener (target, ...args) {
        eventTarget(target).removeEventListener(...args);
    }
}

module.exports = PageDoor;
