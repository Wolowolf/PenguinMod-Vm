// Desktop fork (section 296): one shared easing table (tween curves), used by jg_tween (Tween) and
// Gen1x/iris-text.js (Iris Text's character animations), and ready for future animation blocks.
// The curves are the code both extensions had, unchanged: each takes progress x (0-1) and a direction
// "in" / "out" / "in out" and returns the eased progress (some curves go outside 0-1 on purpose).
// An unknown direction gives 0, as before.

/**
   * @param {number} time should be 0-1
   * @param {number} a value at 0
   * @param {number} b value at 1
   * @returns {number}
   */
const interpolate = (time, a, b) => {
    // don't restrict range of time as some easing functions are expected to go outside the range
    const multiplier = b - a;
    return time * multiplier + a;
};

const linear = x => x;

const sine = (x, dir) => {
    switch (dir) {
        case "in": return 1 - Math.cos((x * Math.PI) / 2);
        case "out": return Math.sin((x * Math.PI) / 2);
        case "in out": return -(Math.cos(Math.PI * x) - 1) / 2;
        default: return 0;
    }
};

const quad = (x, dir) => {
    switch (dir) {
        case "in": return x * x;
        case "out": return 1 - (1 - x) * (1 - x);
        case "in out": return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        default: return 0;
    }
};

const cubic = (x, dir) => {
    switch (dir) {
        case "in": return x * x * x;
        case "out": return 1 - Math.pow(1 - x, 3);
        case "in out": return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
        default: return 0;
    }
};

const quart = (x, dir) => {
    switch (dir) {
        case "in": return x * x * x * x;
        case "out": return 1 - Math.pow(1 - x, 4);
        case "in out": return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
        default: return 0;
    }
};

const quint = (x, dir) => {
    switch (dir) {
        case "in": return x * x * x * x * x;
        case "out": return 1 - Math.pow(1 - x, 5);
        case "in out": return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
        default:
        return 0;
    }
};

const expo = (x, dir) => {
    switch (dir) {
        case "in": return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
        case "out": return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
        case "in out": return x === 0 ? 0 : x === 1 ? 1 : x < 0.5
            ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
        default: return 0;
    }
};

const circ = (x, dir) => {
    switch (dir) {
        case "in": return 1 - Math.sqrt(1 - Math.pow(x, 2));
        case "out": return Math.sqrt(1 - Math.pow(x - 1, 2));
        case "in out": return x < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
            : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2;
        default: return 0;
    }
};

const back = (x, dir) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    const c3 = c1 + 1;
    switch (dir) {
        case "in": return c3 * x * x * x - c1 * x * x;
        case "out": return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        case "in out": return x < 0.5 ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
            : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
        default: return 0;
    }
};

const elastic = (x, dir) => {
    const c4 = (2 * Math.PI) / 3;
    const c5 = (2 * Math.PI) / 4.5;
    switch (dir) {
        case "in": return x === 0 ? 0 : x === 1 ? 1 : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4);
        case "out": return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
        case "in out": return x === 0 ? 0 : x === 1 ? 1 : x < 0.5
            ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1;
        default: return 0;
    }
};

const bounce = (x, dir) => {
    switch (dir) {
        case "in": return 1 - bounce(1 - x, "out");
        case "out": {
            const n1 = 7.5625, d1 = 2.75;
            if (x < 1 / d1) return n1 * x * x;
            else if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
            else if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
            return n1 * (x -= 2.625 / d1) * x + 0.984375;
        }
        case "in out": return x < 0.5 ? (1 - bounce(1 - 2 * x, "out")) / 2 : (1 + bounce(2 * x - 1, "out")) / 2;
        default: return 0;
    }
};

const EasingMethods = {
    linear, sine, quad, cubic, quart,
    quint, expo, circ, back, elastic, bounce
};

module.exports = Object.freeze({
    interpolate,
    linear,
    EasingMethods: Object.freeze(EasingMethods)
});
