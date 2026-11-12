// Desktop fork (section 246): finer facts about numbers for the compiler.
//
// What a number can be is a set of nine "kinds", one bit each. A calculation's rule takes the sets of its inputs and
// answers the set of its result; the result may never be outside that set (too large a set only costs speed). With
// them the compiler can tell that a result is never NaN (no "NaN becomes 0" guard needed) and that it is a whole
// number. The idea and the nine kinds are TurboWarp's (iroptimizer.js getInputType, commit 0cb82af, MPL-2.0); the
// rules below were derived again here from how IEEE 754 doubles behave and are checked by the tool
// bench\number-facts\number-facts-check.cjs (every rule on a matrix of edge values).

const PINF = 1; // Infinity
const PINT = 2; // a positive whole number (finite; includes huge ones such as 1e308)
const PFRACT = 4; // a positive number that is not whole
const ZERO = 8; // 0
const NZERO = 16; // -0
const NFRACT = 32; // a negative number that is not whole
const NINT = 64; // a negative whole number (finite)
const NINF = 128; // -Infinity
const NAN = 256; // NaN

const POS = PINF | PINT | PFRACT;
const NEG = NINF | NINT | NFRACT;
const PREAL = PINT | PFRACT;
const NREAL = NINT | NFRACT;
const FRACT = PFRACT | NFRACT;
const INF = PINF | NINF;
const ANYZERO = ZERO | NZERO;
const NOT_NAN = 255;
const ANY = 511;
// whole numbers (and nothing else): what "is a whole number" means
const WHOLE = PINT | ZERO | NZERO | NINT;

/**
 * @param {number} value A number.
 * @returns {number} Its kind (one bit).
 */
const kindOf = value => {
    if (value !== value) return NAN;
    if (value === 0) return Object.is(value, -0) ? NZERO : ZERO;
    if (value === Infinity) return PINF;
    if (value === -Infinity) return NINF;
    if (value > 0) return Number.isInteger(value) ? PINT : PFRACT;
    return Number.isInteger(value) ? NINT : NFRACT;
};

/**
 * The kinds after "NaN becomes 0" (what asNumber() does to a value).
 * @param {number} kinds Kinds.
 * @returns {number} Kinds without NaN.
 */
const withoutNaN = kinds => (kinds & NAN ? (kinds & NOT_NAN) | ZERO : kinds);

// The same kinds with the other sign (-x). NaN stays.
const negate = k => (k & NAN) |
    (k & PINF ? NINF : 0) | (k & NINF ? PINF : 0) |
    (k & PINT ? NINT : 0) | (k & NINT ? PINT : 0) |
    (k & PFRACT ? NFRACT : 0) | (k & NFRACT ? PFRACT : 0) |
    (k & ZERO ? NZERO : 0) | (k & NZERO ? ZERO : 0);

/**
 * a + b
 * - NaN only from Infinity + -Infinity (or a NaN input).
 * - A result above 0 needs an input above 0. It is Infinity when an input is, or when two finite positive inputs
 *   overflow; it is not whole only when an input is not whole (the sum of two whole doubles is whole).
 * - 0 comes from x + -x, 0 + 0, 0 + -0, -0 + 0 (a sum never underflows to 0); -0 only from -0 + -0.
 * @param {number} l Kinds of a.
 * @param {number} r Kinds of b.
 * @returns {number} Kinds of the result.
 */
const add = (l, r) => {
    let out = (l | r) & NAN;
    if ((l & PINF && r & NINF) || (l & NINF && r & PINF)) out |= NAN;
    const either = l | r;
    const fract = either & FRACT;
    if (either & POS) {
        out |= PINT;
        if (either & PINF || (l & PREAL && r & PREAL)) out |= PINF;
        if (fract) out |= PFRACT;
    }
    if (either & NEG) {
        out |= NINT;
        if (either & NINF || (l & NREAL && r & NREAL)) out |= NINF;
        if (fract) out |= NFRACT;
    }
    if ((l & PREAL && r & NREAL) || (l & NREAL && r & PREAL)) out |= ZERO;
    if ((l & ZERO && r & ANYZERO) || (l & NZERO && r & ZERO)) out |= ZERO;
    if (l & NZERO && r & NZERO) out |= NZERO;
    // x + 0 and x + -0 are x
    if (r & ANYZERO) out |= l & (POS | NEG);
    if (l & ANYZERO) out |= r & (POS | NEG);
    return out;
};

/**
 * a - b: exactly a + (-b) in IEEE 754, signs of zero included.
 * @param {number} l Kinds of a.
 * @param {number} r Kinds of b.
 * @returns {number} Kinds of the result.
 */
const subtract = (l, r) => add(l, negate(r));

// One sign of a set of kinds, as three groups. Zero has a sign too.
const split = (k, positive) => (positive ?
    {inf: k & PINF, real: k & PREAL, zero: k & ZERO} :
    {inf: k & NINF, real: k & NREAL, zero: k & NZERO});
// Groups of a result back to kinds, with a sign.
const signed = (positive, inf, int, fract, zero) => (positive ?
    (inf ? PINF : 0) | (int ? PINT : 0) | (fract ? PFRACT : 0) | (zero ? ZERO : 0) :
    (inf ? NINF : 0) | (int ? NINT : 0) | (fract ? NFRACT : 0) | (zero ? NZERO : 0));

/**
 * a * b. The sign of the result is the product of the signs (zeros included).
 * - NaN only from Infinity * 0 in either order and sign (or a NaN input).
 * - Infinity * anything else is Infinity. 0 * a finite number is 0.
 * - finite * finite (neither 0): whole, or Infinity by overflow; not whole only when an input is not whole;
 *   0 by underflow only when both inputs are not whole (both must be below 1 in size).
 * @param {number} l Kinds of a.
 * @param {number} r Kinds of b.
 * @returns {number} Kinds of the result.
 */
const multiply = (l, r) => {
    let out = (l | r) & NAN;
    if ((l & INF && r & ANYZERO) || (l & ANYZERO && r & INF)) out |= NAN;
    for (let i = 0; i < 4; i++) {
        const a = split(l, i < 2);
        const b = split(r, i % 2 === 0);
        const positive = (i < 2) === (i % 2 === 0);
        const inf = (a.inf && (b.inf || b.real)) || (a.real && b.inf);
        const zero = (a.zero && (b.zero || b.real)) || (a.real && b.zero);
        if (inf) out |= signed(positive, true, false, false, false);
        if (zero) out |= signed(positive, false, false, false, true);
        if (a.real && b.real) {
            const fract = (a.real | b.real) & FRACT;
            out |= signed(positive, true, true, fract, a.real & FRACT && b.real & FRACT);
        }
    }
    return out;
};

/**
 * a / b. The sign of the result is the product of the signs (zeros included).
 * - NaN only from 0 / 0 and Infinity / Infinity in any signs (or a NaN input).
 * - Infinity / finite and anything but 0 / 0: Infinity. Finite / Infinity and 0 / anything but 0: 0.
 * - finite / finite (neither 0): anything of that sign: whole, not whole, Infinity by overflow, 0 by underflow.
 * @param {number} l Kinds of a.
 * @param {number} r Kinds of b.
 * @returns {number} Kinds of the result.
 */
const divide = (l, r) => {
    let out = (l | r) & NAN;
    if ((l & ANYZERO && r & ANYZERO) || (l & INF && r & INF)) out |= NAN;
    for (let i = 0; i < 4; i++) {
        const a = split(l, i < 2);
        const b = split(r, i % 2 === 0);
        const positive = (i < 2) === (i % 2 === 0);
        const inf = (a.inf && (b.real || b.zero)) || (a.real && b.zero);
        const zero = (a.zero && (b.real || b.inf)) || (a.real && b.inf);
        if (inf) out |= signed(positive, true, false, false, false);
        if (zero) out |= signed(positive, false, false, false, true);
        if (a.real && b.real) out |= signed(positive, true, true, true, true);
    }
    return out;
};

// Math.abs
const abs = k => (k & NAN) | (k & INF ? PINF : 0) | (k & (PINT | NINT) ? PINT : 0) | (k & FRACT ? PFRACT : 0) |
    (k & ANYZERO ? ZERO : 0);
// Math.floor: 0.5 -> 0, -0.5 -> -1; everything whole or infinite stays
const floor = k => (k & ~FRACT) | (k & PFRACT ? ZERO | PINT : 0) | (k & NFRACT ? NINT : 0);
// Math.ceil: 0.5 -> 1, -0.5 -> -0
const ceiling = k => (k & ~FRACT) | (k & PFRACT ? PINT : 0) | (k & NFRACT ? NZERO | NINT : 0);
// Math.round: 0.4 -> 0, 0.5 -> 1, -0.5 -> -0, -0.6 -> -1
const round = k => (k & ~FRACT) | (k & PFRACT ? ZERO | PINT : 0) | (k & NFRACT ? NZERO | NINT : 0);
// Math.sign: 1, -1, 0, -0, NaN
const sign = k => (k & (NAN | ANYZERO)) | (k & POS ? PINT : 0) | (k & NEG ? NINT : 0);
// Math.sqrt: NaN below 0; -0 stays -0; a whole or not whole input can give either
const sqrt = k => (k & (NAN | ANYZERO | PINF)) | (k & PREAL ? PREAL : 0) | (k & NEG ? NAN : 0);
// Any number, NaN only when the input can be one of `bad` (or NaN).
const nanOnly = bad => k => NOT_NAN | (k & (bad | NAN) ? NAN : 0);

module.exports = {
    PINF, PINT, PFRACT, ZERO, NZERO, NFRACT, NINT, NINF, NAN,
    POS, NEG, PREAL, NREAL, FRACT, INF, ANYZERO, NOT_NAN, ANY, WHOLE,
    kindOf,
    withoutNaN,
    negate,
    add,
    subtract,
    multiply,
    divide,
    abs,
    floor,
    ceiling,
    round,
    sign,
    sqrt,
    // tan (the helper reduces the angle below 360 first): NaN only of an infinite angle; can be Infinity.
    // Not sin and cos: they multiply by PI first, which makes a huge finite angle infinite, and that gives NaN.
    tan: nanOnly(INF),
    // ln, log, log2: NaN below 0 (of 0 and -0: -Infinity)
    log: nanOnly(NEG)
};
