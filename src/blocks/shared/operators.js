/**
 * Desktop fork (section 291): what the Operators blocks do, written once for the interpreter and the compiler
 * (src/blocks/shared/index.js explains the format). Moved here from scratch3_operators.js (the interpreter's
 * functions) and jsgen.js / jsexecute.js (the compiler's code and helpers).
 */

const helpers = {
    // Scratch modulo: floored division instead of truncated division
    mod: `(n, modulus) => {
    let result = n % modulus;
    if (result / modulus < 0) result += modulus;
    return result;
}`,
    // Scratch tangent in degrees: Infinity / -Infinity where it is undefined
    tan: `(angle) => {
    // Desktop fork (section 238): the angle is reduced first (tan of 360 is 0, not -0)
    angle = angle % 360;
    switch (angle) {
    case -270: case 90: return Infinity;
    case -90: case 270: return -Infinity;
    }
    return Math.round(Math.tan((Math.PI * angle) / 180) * 1e10) / 1e10;
}`,
    // "pick random": whole numbers when both ends are whole numbers (section 155: random numbers from the runtime)
    pickRandom: `(runtime, from, to) => {
    const nFrom = globalState.Cast.toNumber(from);
    const nTo = globalState.Cast.toNumber(to);
    const low = nFrom <= nTo ? nFrom : nTo;
    const high = nFrom <= nTo ? nTo : nFrom;
    if (low === high) return low;
    if (globalState.Cast.isInt(from) && globalState.Cast.isInt(to)) {
        return low + Math.floor(runtime.pmRandom() * ((high + 1) - low));
    }
    return (runtime.pmRandom() * (high - low)) + low;
}`,
    // Used by the compare family: a value that converts to 0 but is not the number zero ("", " ", "abc").
    isNotActuallyZero: {base: true, js: `val => {
    if (typeof val !== 'string') return false;
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        if (code === 48 || code === 9) {
            return false;
        }
    }
    return true;
}`},
    compareEqualSlow: {base: true, js: `(v1, v2) => {
    const n1 = +v1;
    if (isNaN(n1) || (n1 === 0 && isNotActuallyZero(v1))) return ('' + v1).toLowerCase() === ('' + v2).toLowerCase();
    const n2 = +v2;
    if (isNaN(n2) || (n2 === 0 && isNotActuallyZero(v2))) return ('' + v1).toLowerCase() === ('' + v2).toLowerCase();
    return n1 === n2;
}`},
    // Scratch "=": numbers compared as numbers, everything else as text ignoring case
    compareEqual: {base: true, js: `(v1, v2) => (typeof v1 === 'number' && typeof v2 === 'number' && v1 === v1 && v2 === v2 || v1 === v2) ? v1 === v2 : compareEqualSlow(v1, v2)`},
    compareGreaterThan: {extra: {compareGreaterThanSlow: `(v1, v2) => {
    let n1 = +v1;
    let n2 = +v2;
    if (n1 === 0 && isNotActuallyZero(v1)) {
        n1 = NaN;
    } else if (n2 === 0 && isNotActuallyZero(v2)) {
        n2 = NaN;
    }
    if (isNaN(n1) || isNaN(n2)) {
        const s1 = ('' + v1).toLowerCase();
        const s2 = ('' + v2).toLowerCase();
        return s1 > s2;
    }
    return n1 > n2;
}`}, js: `(v1, v2) => typeof v1 === 'number' && typeof v2 === 'number' && v1 === v1 ? v1 > v2 : compareGreaterThanSlow(v1, v2)`},
    compareLessThan: {extra: {compareLessThanSlow: `(v1, v2) => {
    let n1 = +v1;
    let n2 = +v2;
    if (n1 === 0 && isNotActuallyZero(v1)) {
        n1 = NaN;
    } else if (n2 === 0 && isNotActuallyZero(v2)) {
        n2 = NaN;
    }
    if (isNaN(n1) || isNaN(n2)) {
        const s1 = ('' + v1).toLowerCase();
        const s2 = ('' + v2).toLowerCase();
        return s1 < s2;
    }
    return n1 < n2;
}`}, js: `(v1, v2) => typeof v1 === 'number' && typeof v2 === 'number' && v2 === v2 ? v1 < v2 : compareLessThanSlow(v1, v2)`},
    // Desktop fork (section 138): helpers of the PenguinMod operator blocks, inputs in the block's order
    coreNumber: `globalState.Cast.toNumber`,
    coreConstrain: `(value, min, max) => Math.min(Math.max(min, value), max)`,
    coreLerp: `(one, two, amount) => ((two - one) * amount) + one`,
    coreRoot: `(one, two, three) => one * Math.pow(three, 1 / two)`,
    coreLog: `(one, two, three) => one * Math.log(three) / Math.log(two)`,
    coreIndexOf: `(find, text) => (text.includes(find) ? text.indexOf(find) + 1 : 0)`,
    coreLastIndexOf: `(find, text) => (text.includes(find) ? text.lastIndexOf(find) + 1 : 0)`,
    coreCountIn: `(find, text) => {
    const parts = text.split(find);
    return parts.length <= 1 ? 0 : parts.length - 1;
}`,
    coreHasLetterFrom: `(text, letters) => {
    let includes = false;
    letters.split('').forEach(letter => {
        if (text.includes(letter)) includes = true;
    });
    return includes;
}`,
    coreLetters: `(from, to, text) => text.substring((from ? from : 1) - 1, to ? to : 1)`,
    coreLine: `(line, text) => text.split('\\n')[(line ? line : 1) - 1] || ''`
};

// sin and cos in degrees, rounded to 10 decimals (also the slow path of the compiler's table lookup, section 187)
const SIN = '(Math.round(Math.sin((Math.PI * $NUM) / 180) * 1e10) / 1e10)';
const COS = '(Math.round(Math.cos((Math.PI * $NUM) / 180) * 1e10) / 1e10)';

const blocks = {
    operator_add: {inputs: 'NUM1:n NUM2:n', js: '($NUM1 + $NUM2)'},
    operator_subtract: {inputs: 'NUM1:n NUM2:n', js: '($NUM1 - $NUM2)'},
    operator_multiply: {inputs: 'NUM1:n NUM2:n', js: '($NUM1 * $NUM2)'},
    operator_divide: {inputs: 'NUM1:n NUM2:n', js: '($NUM1 / $NUM2)'},
    operator_power: {inputs: 'NUM1:n NUM2:n', js: '(Math.pow($NUM1, $NUM2))'},
    operator_mod: {inputs: 'NUM1:n NUM2:n', js: 'mod($NUM1, $NUM2)'},
    operator_round: {inputs: 'NUM:n', js: 'Math.round($NUM)'},
    operator_mathop: {inputs: 'NUM:n', menu: 'OPERATOR', lowerCase: true, otherwise: '0', options: {
        'abs': 'Math.abs($NUM)',
        'floor': 'Math.floor($NUM)',
        'ceiling': 'Math.ceil($NUM)',
        // Desktop fork (section 211): "sign" was missing in the interpreter
        'sign': 'Math.sign($NUM)',
        'sqrt': 'Math.sqrt($NUM)',
        'sin': SIN,
        'cos': COS,
        'tan': 'tan($NUM)',
        'asin': '((Math.asin($NUM) * 180) / Math.PI)',
        'acos': '((Math.acos($NUM) * 180) / Math.PI)',
        'atan': '((Math.atan($NUM) * 180) / Math.PI)',
        'ln': 'Math.log($NUM)',
        'log': '(Math.log($NUM) / Math.LN10)',
        'log2': 'Math.log2($NUM)',
        'e ^': 'Math.exp($NUM)',
        '10 ^': '(10 ** $NUM)'
    }},
    operator_random: {inputs: 'FROM:r TO:r', js: 'pickRandom(runtime, $FROM, $TO)'},
    operator_lt: {inputs: 'OPERAND1:r OPERAND2:r', js: 'compareLessThan($OPERAND1, $OPERAND2)'},
    operator_gt: {inputs: 'OPERAND1:r OPERAND2:r', js: 'compareGreaterThan($OPERAND1, $OPERAND2)'},
    operator_equals: {inputs: 'OPERAND1:r OPERAND2:r', js: 'compareEqual($OPERAND1, $OPERAND2)'},
    // (compiled as "not" of the block above, irgen.js coreInlineInputNode)
    operator_notequal: {inputs: 'OPERAND1:r OPERAND2:r', js: '!compareEqual($OPERAND1, $OPERAND2)'},
    operator_ltorequal: {inputs: 'OPERAND1:r OPERAND2:r', js: '!compareGreaterThan($OPERAND1, $OPERAND2)'},
    operator_gtorequal: {inputs: 'OPERAND1:r OPERAND2:r', js: '!compareLessThan($OPERAND1, $OPERAND2)'},
    // Desktop fork (section 275): "===": the same value of the same type (text is case-sensitive)
    operator_strictEquals: {inputs: 'OPERAND1:r OPERAND2:r', js: '($OPERAND1 === $OPERAND2)'},
    operator_and: {inputs: 'OPERAND1:b OPERAND2:b', js: '($OPERAND1 && $OPERAND2)'},
    operator_or: {inputs: 'OPERAND1:b OPERAND2:b', js: '($OPERAND1 || $OPERAND2)'},
    operator_not: {inputs: 'OPERAND:b', js: '!$OPERAND'},
    operator_nand: {inputs: 'OPERAND1:b OPERAND2:b', js: '((!$OPERAND1 | !$OPERAND2) !== 0)'},
    operator_nor: {inputs: 'OPERAND1:b OPERAND2:b', js: '((!$OPERAND1 & !$OPERAND2) !== 0)'},
    operator_xor: {inputs: 'OPERAND1:b OPERAND2:b', js: '(!$OPERAND1 !== !$OPERAND2)'},
    operator_xnor: {inputs: 'OPERAND1:b OPERAND2:b', js: '(!$OPERAND1 === !$OPERAND2)'},
    operator_join: {inputs: 'STRING1:s STRING2:s', js: '($STRING1 + $STRING2)'},
    operator_length: {inputs: 'STRING:s', js: '$STRING.length'},
    // (letter positions are cut to whole numbers, past either end gives "")
    operator_letter_of: {inputs: 'LETTER:n STRING:s', js: '(($STRING)[($LETTER | 0) - 1] || "")'},
    operator_contains: {inputs: 'STRING1:s STRING2:s', js: '($STRING1.toLowerCase().indexOf($STRING2.toLowerCase()) !== -1)'},
    operator_trueBoolean: {js: '(true)'},
    operator_falseBoolean: {js: '(false)'},
    operator_randomBoolean: {js: '(Boolean(Math.round(runtime.pmRandom())))'},
    operator_newLine: {js: '"\\n"'},
    operator_tabCharacter: {js: '"\\t"'},
    operator_constrainnumber: {inputs: 'inp:r min:r max:r', js: 'coreConstrain($inp, $min, $max)'},
    operator_lerpFunc: {inputs: 'ONE:n TWO:n AMOUNT:n', js: 'coreLerp($ONE, $TWO, $AMOUNT)'},
    operator_advMathExpanded: {inputs: 'ONE:n TWO:n THREE:n', menu: 'OPTION', otherwise: '0', options: {
        root: 'coreRoot($ONE, $TWO, $THREE)',
        log: 'coreLog($ONE, $TWO, $THREE)'
    }},
    operator_stringify: {inputs: 'ONE:s', js: '($ONE)'},
    operator_boolify: {inputs: 'ONE:b', js: '($ONE)'},
    operator_toUpperLowerCase: {inputs: 'TEXT:s', menu: 'OPTION', otherwise: 'undefined', options: {
        upper: '($TEXT.toUpperCase())',
        lower: '($TEXT.toLowerCase())'
    }},
    // ("" gives NaN)
    operator_character_to_code: {inputs: 'ONE:s', js: '($ONE.charCodeAt(0))'},
    operator_code_to_character: {inputs: 'ONE:n', js: 'String.fromCharCode($ONE)'},
    operator_indexOfTextInText: {inputs: 'TEXT1:s TEXT2:s', js: 'coreIndexOf($TEXT1, $TEXT2)'},
    operator_lastIndexOfTextInText: {inputs: 'TEXT1:s TEXT2:s', js: 'coreLastIndexOf($TEXT1, $TEXT2)'},
    operator_textStartsOrEndsWith: {inputs: 'TEXT1:s TEXT2:s', menu: 'OPTION', otherwise: '($TEXT1.endsWith($TEXT2))', options: {
        starts: '($TEXT1.startsWith($TEXT2))'
    }},
    operator_countAppearTimes: {inputs: 'TEXT1:s TEXT2:s', js: 'coreCountIn($TEXT1, $TEXT2)'},
    operator_textIncludesLetterFrom: {inputs: 'TEXT1:s TEXT2:s', js: 'coreHasLetterFrom($TEXT1, $TEXT2)'},
    operator_replaceAll: {inputs: 'text:s term:r res:r', js: '($text.replaceAll($term, $res))'},
    operator_replaceFirst: {inputs: 'text:s term:r res:r', js: '($text.replace($term, $res))'},
    operator_getLettersFromIndexToIndexInTextFixed: {inputs: 'INDEX1:n INDEX2:n TEXT:s', js: 'coreLetters($INDEX1, $INDEX2, $TEXT)'},
    operator_readLineInMultilineText: {inputs: 'LINE:n TEXT:s', js: 'coreLine($LINE, $TEXT)'}
};

module.exports = {helpers, blocks};
