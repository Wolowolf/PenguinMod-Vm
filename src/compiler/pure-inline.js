/**
 * Desktop fork (section 202): inline code for small pure extension blocks (pure-blocks.json), written into the
 * compiled script instead of the direct call of section 118 / 189 (jsgen.js descendPureExtensionBlock).
 *
 * Each entry gives the block's inputs in the order of the block's text (`order`; a block whose inputs are stored in
 * another order keeps the direct call, so inputs that change something, e.g. pick random, are still worked out in
 * the same order) and a function that returns [JS, answer type] or null (keep the direct call), from an `a` object
 * (jsgen.js PureInlineArgs) that gives each argument as the block's function receives it after the extension
 * manager's conversion:
 *   a.raw(name)   the value itself (its declared type: number, string or boolean; a number may be NaN)
 *   a.num(name)   Cast.toNumber of it          a.str(name)  Cast.toString of it      a.bool(name)  Cast.toBoolean of it
 *   a.cmp(name)   the value for Cast.compare, skipping the number -> text step when the input is a known number
 *                 (Cast.compare of the two texts gives the same sign and the same difference)
 *   a.fixed(name) {value} when the value is known while compiling, else null
 * Every input is used exactly once and in `order`, either directly in the expression or as an argument of one
 * helper (jsexecute.js `pmi...`); the JS does exactly what the extension's function does with those values.
 * Answer types: 'int' (a number, never NaN), 'number' (a number, may be NaN), 'boolean', 'unknown'.
 * Switch (tests only): runtime.pmNoPureInline puts every block back on the direct call.
 */

const call = (helper, args, type) => [`${helper}(${args.join(', ')})`, type];
const fixedText = (a, name) => {
    const fixed = a.fixed(name);
    return fixed ? String(fixed.value) : null;
};

const BLOCKS = {
    // TurboWarp "Bitwise": every input is declared a number, so the function gets a number (NaN only if the input
    // was the number NaN); the operators turn NaN into 0 themselves
    Bitwise_isNumberBits: {order: ['CENTRAL'], js: a => [`/^-?[01]+$/.test(${a.raw('CENTRAL')})`, 'boolean']},
    Bitwise_toNumberBits: {order: ['CENTRAL'], js: a => [`${a.num('CENTRAL')}.toString(2)`, 'unknown']},
    Bitwise_ofNumberBits: {order: ['CENTRAL'], js: a => call('pmiBitsToNumber', [a.raw('CENTRAL')], 'int')},
    Bitwise_bitwiseRightShift: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} >> ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseLeftShift: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} << ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseLogicalRightShift: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} >>> ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseCircularRightShift: {order: ['LEFT', 'RIGHT'], js: a => call('pmiRotateRight', [a.raw('LEFT'), a.raw('RIGHT')], 'int')},
    Bitwise_bitwiseCircularLeftShift: {order: ['LEFT', 'RIGHT'], js: a => call('pmiRotateLeft', [a.raw('LEFT'), a.raw('RIGHT')], 'int')},
    Bitwise_bitwiseAnd: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} & ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseOr: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} | ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseXor: {order: ['LEFT', 'RIGHT'], js: a => [`(${a.raw('LEFT')} ^ ${a.raw('RIGHT')})`, 'int']},
    Bitwise_bitwiseNot: {order: ['CENTRAL'], js: a => [`(~${a.raw('CENTRAL')})`, 'int']},

    // TurboWarp "True Fantom Math"
    truefantommath_root_block: {order: ['A', 'B'], js: a => call('pmiRootOf', [a.num('A'), a.num('B')], 'number')},
    truefantommath_negative_block: {order: ['A'], js: a => [`(0 - ${a.num('A')})`, 'number']},
    truefantommath_exactly_equal_block: {order: ['A', 'B'], js: a => [`(pmiExactCompare(${a.cmp('A')}, ${a.cmp('B')}) === 0)`, 'boolean']},
    truefantommath_not_exactly_equal_block: {order: ['A', 'B'], js: a => [`(pmiExactCompare(${a.cmp('A')}, ${a.cmp('B')}) !== 0)`, 'boolean']},
    truefantommath_almost_equal_block: {order: ['A', 'B'], js: a => call('pmiAlmostEqual', [a.cmp('A'), a.cmp('B')], 'boolean')},
    truefantommath_not_almost_equal_block: {order: ['A', 'B'], js: a => [`!pmiAlmostEqual(${a.cmp('A')}, ${a.cmp('B')})`, 'boolean']},
    // (& and | instead of && and ||: both inputs are always worked out, as for the call)
    truefantommath_between_or_equal: {order: ['A', 'B', 'C'], js: a => call('pmiBetweenOrEqual', [a.raw('A'), a.raw('B'), a.raw('C')], 'boolean')},
    truefantommath_between: {order: ['A', 'B', 'C'], js: a => call('pmiBetweenOnly', [a.raw('A'), a.raw('B'), a.raw('C')], 'boolean')},
    truefantommath_exactly_cont_block: {order: ['A', 'B'], js: a => [`${a.str('A')}.includes(${a.str('B')})`, 'boolean']},
    truefantommath_sign_of: {order: ['A'], js: a => [`Math.sign(${a.num('A')})`, 'number']},
    // (answers one of its inputs as given, which may be text)
    truefantommath_clamp_block: {order: ['A', 'B', 'C'], js: a => call('pmiClampCompare', [a.raw('A'), a.raw('B'), a.raw('C')], 'unknown')},
    truefantommath_scale_block: {order: ['A', 'm1', 'M1', 'm2', 'M2'],
        js: a => call('pmiScale', [a.num('A'), a.num('m1'), a.num('M1'), a.num('m2'), a.num('M2')], 'number')},
    truefantommath_trunc2_block: {order: ['A', 'B'], js: a => call('pmiTruncTo', [a.num('A'), a.num('B')], 'number')},
    truefantommath_log_with_base_block: {order: ['A', 'B'], js: a => [`(Math.log(${a.num('A')}) / Math.log(${a.num('B')}))`, 'number']},
    truefantommath_true_math_op: {order: ['OPERATOR', 'NUM'], js: a => {
        const operator = fixedText(a, 'OPERATOR');
        if (operator === null) return null;
        const fn = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].find(name => name === operator.toLowerCase());
        if (!fn) return [`(${a.num('NUM')}, 0)`, 'number'];
        return [`Math.${fn}(${a.num('NUM')})`, 'number'];
    }},
    truefantommath_is_safe_number_block: {order: ['A'], js: a => [`Number.isSafeInteger(${a.num('A')})`, 'boolean']},
    // (the value may be text that reads as a number: the direct call passes such a variable on unconverted)
    truefantommath_is_number_block: {order: ['A'], js: a => [`!Number.isNaN(Number(${a.raw('A')}))`, 'boolean']},
    truefantommath_is_int_block: {order: ['A'], js: a => call('pmiIsWhole', [a.raw('A')], 'boolean')},
    truefantommath_is_float_block: {order: ['A'], js: a => call('pmiIsFraction', [a.raw('A')], 'boolean')},

    // TurboWarp "Utilities"
    utilities_ternaryOperator: {order: ['A', 'B', 'C'], js: a => call('pmiChoose', [a.raw('A'), a.raw('B'), a.raw('C')], 'unknown')},
    utilities_letters: {order: ['START', 'END', 'STRING'], js: a => call('pmiLettersClamped', [a.raw('START'), a.raw('END'), a.str('STRING')], 'unknown')},
    utilities_stringToBoolean: {order: ['STRING'], js: a => [a.bool('STRING'), 'boolean']},

    // TurboWarp "Lily's utils" (lmsutilsblocks)
    lmsutilsblocks_stringIf: {order: ['BOOLEAN', 'INPUTA'], js: a => call('pmiChoose', [a.raw('BOOLEAN'), a.raw('INPUTA'), '""'], 'unknown')},
    lmsutilsblocks_stringIfElse: {order: ['BOOLEAN', 'INPUTA', 'INPUTB'], js: a => call('pmiChoose', [a.raw('BOOLEAN'), a.raw('INPUTA'), a.raw('INPUTB')], 'unknown')},
    lmsutilsblocks_lettersToOf: {order: ['INPUTA', 'INPUTB', 'STRING'], js: a => call('pmiSliceFromOne', [a.raw('INPUTA'), a.raw('INPUTB'), a.str('STRING')], 'unknown')},
    lmsutilsblocks_replaceWords: {order: ['INPUTA', 'INPUTB', 'STRING'], js: a => call('pmiReplaceIn', [a.raw('INPUTA'), a.raw('INPUTB'), a.str('STRING')], 'unknown')},
    lmsutilsblocks_findIndexOfString: {order: ['INPUTA', 'INPUTB'], js: a => call('pmiFindFromOne', [a.raw('INPUTA'), a.str('INPUTB')], 'unknown')},
    lmsutilsblocks_itemOfFromString: {order: ['INPUTA', 'INPUTB', 'INPUTC'], js: a => call('pmiItemOfSplit', [a.num('INPUTA'), a.str('INPUTB'), a.raw('INPUTC')], 'unknown')},
    lmsutilsblocks_stringToUpperCase: {order: ['STRING'], js: a => [`${a.str('STRING')}.toUpperCase()`, 'unknown']},
    lmsutilsblocks_stringToLowerCase: {order: ['STRING'], js: a => [`${a.str('STRING')}.toLowerCase()`, 'unknown']},
    lmsutilsblocks_norBoolean: {order: ['INPUTA', 'INPUTB'], js: a => [`!(${a.raw('INPUTA')} | ${a.raw('INPUTB')})`, 'boolean']},
    lmsutilsblocks_xorBoolean: {order: ['INPUTA', 'INPUTB'], js: a => [`(${a.raw('INPUTA')} !== ${a.raw('INPUTB')})`, 'boolean']},
    lmsutilsblocks_xnorBoolean: {order: ['INPUTA', 'INPUTB'], js: a => [`(${a.raw('INPUTA')} === ${a.raw('INPUTB')})`, 'boolean']},
    lmsutilsblocks_nandBoolean: {order: ['INPUTA', 'INPUTB'], js: a => [`!(${a.raw('INPUTA')} & ${a.raw('INPUTB')})`, 'boolean']},
    lmsutilsblocks_stringCheckBoolean: {order: ['INPUT', 'DROPDOWN'], js: a => {
        const check = fixedText(a, 'DROPDOWN');
        if (check === 'text') return [`isNaN(${a.raw('INPUT')})`, 'boolean'];
        if (check === 'number') return [`!isNaN(${a.raw('INPUT')})`, 'boolean'];
        if (check === 'uppercase') return call('pmiIsUpper', [a.raw('INPUT')], 'boolean');
        if (check === 'lowercase') return call('pmiIsLower', [a.raw('INPUT')], 'boolean');
        if (check === null) return null;
        return [`(${a.raw('INPUT')}, false)`, 'boolean'];
    }},
    lmsutilsblocks_negativeReporter: {order: ['INPUT'], js: a => [`(${a.num('INPUT')} * -1)`, 'number']},
    lmsutilsblocks_normaliseValue: {order: ['INPUT'], js: a => call('pmiUnitOrZeroText', [a.num('INPUT')], 'unknown')},
    lmsutilsblocks_clampNumber: {order: ['INPUTA', 'INPUTB', 'INPUTC'],
        js: a => [`Math.min(Math.max(${a.num('INPUTA')}, ${a.num('INPUTB')}), ${a.num('INPUTC')})`, 'number']},

    // PenguinMod "Number Utilities" (numberUtilities; toFixed and the others throw for out-of-range digits, as the
    // call does)
    numberUtilities_toFixed: {order: ['NUMBER', 'DECIMALS'], js: a => [`${a.num('NUMBER')}.toFixed(${a.num('DECIMALS')})`, 'unknown']},
    numberUtilities_toPrecision: {order: ['NUMBER', 'PRECISION'], js: a => [`${a.num('NUMBER')}.toPrecision(${a.num('PRECISION')})`, 'unknown']},
    numberUtilities_toExponential: {order: ['NUMBER', 'DECIMALS'], js: a => [`${a.num('NUMBER')}.toExponential(${a.num('DECIMALS')})`, 'unknown']},
    numberUtilities_formatPercentage: {order: ['NUMBER', 'DECIMALS'], js: a => [`((${a.num('NUMBER')} * 100).toFixed(${a.num('DECIMALS')}) + "%")`, 'unknown']},
    numberUtilities_roundNumber: {order: ['NUMBER', 'MULTIPLE'], js: a => call('pmiRoundTo', [a.num('NUMBER'), a.num('MULTIPLE')], 'number')},
    numberUtilities_isInteger: {order: ['NUMBER'], js: a => [`Number.isInteger(${a.num('NUMBER')})`, 'boolean']},
    numberUtilities_isFinite: {order: ['NUMBER'], js: a => [`Number.isFinite(${a.num('NUMBER')})`, 'boolean']},
    numberUtilities_clamp: {order: ['NUMBER', 'MIN', 'MAX'], js: a => call('pmiClampSwapped', [a.num('NUMBER'), a.num('MIN'), a.num('MAX')], 'number')},

    // TurboWarp "Graphics 2D" (nonameawagraph); the shape menus must be fixed
    nonameawagraph_line_section: {order: ['x1', 'y1', 'x2', 'y2'],
        js: a => call('pmiSegmentLength', [a.raw('x1'), a.raw('y1'), a.raw('x2'), a.raw('y2')], 'number')},
    nonameawagraph_ray_direction2: {order: ['x1', 'y1', 'x2', 'y2'],
        js: a => call('pmiRayDirection', [a.num('x1'), a.num('y1'), a.num('x2'), a.num('y2')], 'number')},
    nonameawagraph_vertical: {order: ['a', 'b'], js: a => call('pmiPerpendicular', [a.cmp('a'), a.cmp('b')], 'boolean')},
    nonameawagraph_triangle: {order: ['x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'CS'], js: a => {
        const kind = fixedText(a, 'CS');
        if (kind !== 's' && kind !== 'c') return null;
        const points = ['x1', 'y1', 'x2', 'y2', 'x3', 'y3'].map(name => a.raw(name));
        return call(kind === 's' ? 'pmiTriangleArea' : 'pmiTrianglePerimeter', points, 'number');
    }},
    nonameawagraph_triangle_s: {order: ['s1', 's2', 's3'], js: a => call('pmiHeron', [a.raw('s1'), a.raw('s2'), a.raw('s3')], 'number')},
    nonameawagraph_quadrilateral: {order: ['x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'x4', 'y4', 'CS'], js: a => {
        const kind = fixedText(a, 'CS');
        if (kind !== 's' && kind !== 'c') return null;
        const points = ['x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'x4', 'y4'].map(name => a.raw(name));
        return call(kind === 's' ? 'pmiQuadArea' : 'pmiQuadPerimeter', points, 'number');
    }},
    nonameawagraph_round: {order: ['rd', 'a', 'CS'], js: a => {
        const radius = fixedText(a, 'rd');
        const kind = fixedText(a, 'CS');
        if (radius === null || (kind !== 's' && kind !== 'c')) return null;
        const size = radius === 'r' ? a.raw('a') : `(${a.raw('a')} / 2)`;
        return kind === 'c' ? [`(2 * Math.PI * ${size})`, 'number'] : [`(Math.PI * ${size} ** 2)`, 'number'];
    }}
};

module.exports = BLOCKS;
