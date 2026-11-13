/**
 * Methods for cloning JavaScript objects.
 * @type {object}
 */
class Clone {
    /**
     * Deep-clone a "simple" object: one which can be fully expressed with JSON.
     * Non-JSON values, such as functions, will be stripped from the clone.
     * @param {object} original - the object to be cloned.
     * @returns {object} a deep clone of the original object.
     */
    static simple (original) {
        return JSON.parse(JSON.stringify(original));
    }

    /**
     * Desktop fork (section 254): the same result as `simple`, without JSON, for a plain object
     * whose values are all primitives (graphic effects, the speech-bubble state): numbers that are
     * not finite become null, -0 becomes 0, undefined/functions/symbols are left out. Anything else
     * (nested objects, arrays, other prototypes, a "__proto__" key) goes through `simple`.
     * @param {object} original - the object to be cloned.
     * @returns {object} a copy equal to `Clone.simple(original)`.
     */
    static flat (original) {
        if (original === null || typeof original !== 'object' ||
            Object.getPrototypeOf(original) !== Object.prototype) return Clone.simple(original);
        const copy = {};
        const keys = Object.keys(original);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (key === '__proto__') return Clone.simple(original);
            const value = original[key];
            switch (typeof value) {
            case 'number':
                // eslint-disable-next-line no-self-compare
                copy[key] = value === 0 ? 0 : (value - value === 0 ? value : null);
                break;
            case 'string':
            case 'boolean':
                copy[key] = value;
                break;
            case 'undefined':
            case 'function':
            case 'symbol':
                break;
            default:
                if (value !== null) return Clone.simple(original);
                copy[key] = null;
            }
        }
        return copy;
    }
}

module.exports = Clone;
