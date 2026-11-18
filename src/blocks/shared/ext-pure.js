/**
 * Desktop fork (section 294): small pure extension blocks (pure-blocks.json) of Bitwise, True Fantom Math, Number
 * Utilities and Graphics 2D, written once for the interpreter (the extensions' methods call these functions) and the
 * compiler (jsgen.js pureInlineCode writes the text inline, as section 202's pure-inline.js did). Format:
 * shared/index.js, plus:
 * - `pure`: the answer's type for the compiler ('int' a number never NaN, 'number' may be NaN, 'boolean',
 *   'unknown'); marks the block for jsgen.js pureInlineCode.
 * - input kind `c`: a value for Cast.compare. The interpreter passes on what the extension manager gives; compiled, a
 *   known number declared as text skips the number -> text step (Cast.compare gives the same sign and difference).
 * - `order`: every input and menu in the order of the block's text, when the block has menus (their values are
 *   fixed: these menus take no reporters, section 265). Compiled, a block whose inputs are stored in another order,
 *   or whose menu value has no option, keeps the direct call (which runs `otherwise`).
 * - `menu` may name several menus ("rd CS"): the option is their values joined by a space.
 * Each block gets its arguments as the extension manager converts them (its declared types); the kinds convert as
 * the extension's function did.
 */
module.exports = {
    helpers: {
        pmiRotateRight: '(number, k) => (number >>> k) | (number << (32 - k))',
        pmiRotateLeft: '(number, k) => (number << k) | (number >>> (32 - k))',
        pmiAlmostEqual: `(a, b) => {
    const c = globalState.Cast.compare(a, b);
    return c <= 0.5 && c >= -0.5;
}`,
        pmiScale: '(a, m1, M1, m2, M2) => ((a - m1) * (M2 - m2)) / (M1 - m1) + m2',
        // True Fantom Math's is float (isTrueInt and toNaNNumber; NaN is neither)
        pmiIsFraction: `val => {
    const n = Number(val);
    if (Number.isNaN(n)) return false;
    if (typeof val === "number" || typeof val === "string") return n !== Math.floor(n);
    return typeof val !== "boolean";
}`,
        pmiRoundTo: '(number, multiple) => Math.round(number / multiple) * multiple',
        pmiSegmentLength: '(x1, y1, x2, y2) => Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))',
        pmiRayDirection: '(x1, y1, x2, y2) => (Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI',
        pmiPerpendicular: `(a, b) => {
    if (isNaN(a) || isNaN(b)) return false;
    return (a - (b - 90)) % 180 == 0;
}`,
        // Graphics 2D's area (the shoelace sum in its loop's order) and perimeter
        pmiTriangleArea: `(x1, y1, x2, y2, x3, y3) => {
    let area = 0;
    area += x1 * y2;
    area -= x2 * y1;
    area += x2 * y3;
    area -= x3 * y2;
    area += x3 * y1;
    area -= x1 * y3;
    return Math.abs(area) / 2;
}`,
        pmiTrianglePerimeter: `(x1, y1, x2, y2, x3, y3) => {
    let i = 0;
    i += Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    i += Math.sqrt(Math.pow(x2 - x3, 2) + Math.pow(y2 - y3, 2));
    i += Math.sqrt(Math.pow(x3 - x1, 2) + Math.pow(y3 - y1, 2));
    return i;
}`,
        pmiHeron: `(s1, s2, s3) => {
    const s = (s1 + s2 + s3) / 2;
    return Math.sqrt(s * (s - s1) * (s - s2) * (s - s3));
}`,
        pmiQuadArea: `(x1, y1, x2, y2, x3, y3, x4, y4) => {
    let area = 0;
    area += x1 * y2;
    area -= x2 * y1;
    area += x2 * y3;
    area -= x3 * y2;
    area += x3 * y4;
    area -= x4 * y3;
    area += x4 * y1;
    area -= x1 * y4;
    return Math.abs(area) / 2;
}`,
        pmiQuadPerimeter: `(x1, y1, x2, y2, x3, y3, x4, y4) => {
    let i = 0;
    i += Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    i += Math.sqrt(Math.pow(x2 - x3, 2) + Math.pow(y2 - y3, 2));
    i += Math.sqrt(Math.pow(x3 - x4, 2) + Math.pow(y3 - y4, 2));
    i += Math.sqrt(Math.pow(x4 - x1, 2) + Math.pow(y4 - y1, 2));
    return i;
}`
    },
    blocks: {
        // TurboWarp "Bitwise": every input is declared a number, so the function gets a number (NaN only if the input
        // was the number NaN); the operators turn NaN into 0 themselves
        Bitwise_bitwiseRightShift: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT >> $RIGHT)', pure: 'int'},
        Bitwise_bitwiseLeftShift: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT << $RIGHT)', pure: 'int'},
        Bitwise_bitwiseLogicalRightShift: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT >>> $RIGHT)', pure: 'int'},
        Bitwise_bitwiseCircularRightShift: {inputs: 'LEFT:r RIGHT:r', js: 'pmiRotateRight($LEFT, $RIGHT)', pure: 'int'},
        Bitwise_bitwiseCircularLeftShift: {inputs: 'LEFT:r RIGHT:r', js: 'pmiRotateLeft($LEFT, $RIGHT)', pure: 'int'},
        Bitwise_bitwiseAnd: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT & $RIGHT)', pure: 'int'},
        Bitwise_bitwiseOr: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT | $RIGHT)', pure: 'int'},
        Bitwise_bitwiseXor: {inputs: 'LEFT:r RIGHT:r', js: '($LEFT ^ $RIGHT)', pure: 'int'},
        Bitwise_bitwiseNot: {inputs: 'CENTRAL:r', js: '(~$CENTRAL)', pure: 'int'},

        // TurboWarp "True Fantom Math"
        truefantommath_negative_block: {inputs: 'A:n', js: '(0 - $A)', pure: 'number'},
        truefantommath_almost_equal_block: {inputs: 'A:c B:c', js: 'pmiAlmostEqual($A, $B)', pure: 'boolean'},
        truefantommath_not_almost_equal_block: {inputs: 'A:c B:c', js: '!pmiAlmostEqual($A, $B)', pure: 'boolean'},
        truefantommath_exactly_cont_block: {inputs: 'A:s B:s', js: '$A.includes($B)', pure: 'boolean'},
        truefantommath_sign_of: {inputs: 'A:n', js: 'Math.sign($A)', pure: 'number'},
        // (answers a number, worked out from all five)
        truefantommath_scale_block: {inputs: 'A:n m1:n M1:n m2:n M2:n', js: 'pmiScale($A, $m1, $M1, $m2, $M2)', pure: 'number'},
        truefantommath_true_math_op: {inputs: 'NUM:n', order: 'OPERATOR NUM', menu: 'OPERATOR', lowerCase: true, options: {
            sin: 'Math.sin($NUM)',
            cos: 'Math.cos($NUM)',
            tan: 'Math.tan($NUM)',
            asin: 'Math.asin($NUM)',
            acos: 'Math.acos($NUM)',
            atan: 'Math.atan($NUM)'
        }, otherwise: '($NUM, 0)', pure: 'number'},
        truefantommath_is_safe_number_block: {inputs: 'A:n', js: 'Number.isSafeInteger($A)', pure: 'boolean'},
        // (the value may be text that reads as a number: the direct call passes such a variable on unconverted)
        truefantommath_is_float_block: {inputs: 'A:r', js: 'pmiIsFraction($A)', pure: 'boolean'},

        // PenguinMod "Number Utilities" (toFixed and the others throw for out-of-range digits, as the function did)
        numberUtilities_toFixed: {inputs: 'NUMBER:n DECIMALS:n', js: '$NUMBER.toFixed($DECIMALS)', pure: 'unknown'},
        numberUtilities_toPrecision: {inputs: 'NUMBER:n PRECISION:n', js: '$NUMBER.toPrecision($PRECISION)', pure: 'unknown'},
        numberUtilities_toExponential: {inputs: 'NUMBER:n DECIMALS:n', js: '$NUMBER.toExponential($DECIMALS)', pure: 'unknown'},
        numberUtilities_formatPercentage: {inputs: 'NUMBER:n DECIMALS:n', js: '(($NUMBER * 100).toFixed($DECIMALS) + "%")', pure: 'unknown'},
        numberUtilities_roundNumber: {inputs: 'NUMBER:n MULTIPLE:n', js: 'pmiRoundTo($NUMBER, $MULTIPLE)', pure: 'number'},
        numberUtilities_isFinite: {inputs: 'NUMBER:n', js: 'Number.isFinite($NUMBER)', pure: 'boolean'},

        // TurboWarp "Graphics 2D" (nonameawagraph)
        nonameawagraph_line_section: {inputs: 'x1:r y1:r x2:r y2:r', js: 'pmiSegmentLength($x1, $y1, $x2, $y2)', pure: 'number'},
        nonameawagraph_ray_direction2: {inputs: 'x1:n y1:n x2:n y2:n', js: 'pmiRayDirection($x1, $y1, $x2, $y2)', pure: 'number'},
        nonameawagraph_vertical: {inputs: 'a:c b:c', js: 'pmiPerpendicular($a, $b)', pure: 'boolean'},
        nonameawagraph_triangle: {inputs: 'x1:r y1:r x2:r y2:r x3:r y3:r', order: 'x1 y1 x2 y2 x3 y3 CS', menu: 'CS', options: {
            s: 'pmiTriangleArea($x1, $y1, $x2, $y2, $x3, $y3)',
            c: 'pmiTrianglePerimeter($x1, $y1, $x2, $y2, $x3, $y3)'
        }, otherwise: '0', pure: 'number'},
        nonameawagraph_triangle_s: {inputs: 's1:r s2:r s3:r', js: 'pmiHeron($s1, $s2, $s3)', pure: 'number'},
        nonameawagraph_quadrilateral: {inputs: 'x1:r y1:r x2:r y2:r x3:r y3:r x4:r y4:r', order: 'x1 y1 x2 y2 x3 y3 x4 y4 CS', menu: 'CS', options: {
            s: 'pmiQuadArea($x1, $y1, $x2, $y2, $x3, $y3, $x4, $y4)',
            c: 'pmiQuadPerimeter($x1, $y1, $x2, $y2, $x3, $y3, $x4, $y4)'
        }, otherwise: '0', pure: 'number'},
        // (radius or diameter, circumference or area)
        nonameawagraph_round: {inputs: 'a:r', order: 'rd a CS', menu: 'rd CS', options: {
            'r c': '(2 * Math.PI * $a)',
            'd c': '(2 * Math.PI * ($a / 2))',
            'r s': '(Math.PI * $a ** 2)',
            'd s': '(Math.PI * ($a / 2) ** 2)'
        }, otherwise: 'undefined', pure: 'number'}
    }
};
