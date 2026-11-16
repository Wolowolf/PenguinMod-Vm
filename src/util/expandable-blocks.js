/**
 * Desktop fork (section 274): PenguinMod's modular ("expandable") operator blocks are worked out with the single
 * blocks' own calculations. These helpers read a modular block's mutation and put its inputs and operators into
 * the order the single blocks would be nested in; the compiler (irgen.js) builds single-block IR nodes with them and
 * the interpreter (scratch3_operators.js) calls the single blocks' functions with them, so both use the same code.
 */

// The operator after each input: the block stores one character per gap between inputs (menuvalues).
const readOperators = (mutation, count, fallback) => {
    const menu = String((mutation && mutation.menuvalues) || '');
    const operators = [];
    for (let i = 0; i < count - 1; i++) operators.push(menu[i] || fallback);
    return operators;
};

const readCount = mutation => {
    const count = Number(mutation && mutation.inputcount);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

/**
 * Nests operands like an expression: higher levels first, equal levels from left to right (from right to left
 * for right-associative operators).
 * @param {Array} operands the inputs, in order
 * @param {Array<string>} operators one operator between each two inputs
 * @param {Object<string, number>} levels the precedence of each operator
 * @param {function(string): boolean} isRightAssociative operators that group from the right
 * @param {function(string, *, *): *} combine makes one operator of two operands
 * @returns {*} the combined operand
 */
const nestInfix = (operands, operators, levels, isRightAssociative, combine) => {
    let next = 0;
    const parse = minLevel => {
        let left = operands[next++];
        while (next < operands.length) {
            const operator = operators[next - 1];
            const level = levels[operator];
            if (level < minLevel) break;
            const right = parse(isRightAssociative(operator) ? level : level + 1);
            left = combine(operator, left, right);
        }
        return left;
    };
    return parse(0);
};

// "+ - * / mod (%) ^": the usual order of operations (mod ranks with * and /), ^ groups from the right
// (2 ^ 3 ^ 2 = 2 ^ 9).
const MATH_LEVELS = {'+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3};
const nestMath = (operands, operators, combine) =>
    nestInfix(operands, operators.map(o => (o in MATH_LEVELS ? o : '+')), MATH_LEVELS, o => o === '^', combine);

// and (a), or (o), xor (x), nand (n), nor (N), xnor (X): xor/xnor before and/nand before or/nor.
const BOOL_LEVELS = {o: 1, N: 1, a: 2, n: 2, x: 3, X: 3};
const BOOL_BASE = {n: 'a', N: 'o', X: 'x'};
/**
 * When every operator is the same negated one (nand, nor, xnor), the whole chain is negated once:
 * "a nand b nand c" is "not (a and b and c)". Otherwise each operator is one single block.
 * @param {Array} operands the inputs
 * @param {Array<string>} operators the operators between them
 * @param {function(string, *, *): *} combine makes one block of two operands (a, o, x, n, N, X)
 * @param {function(*): *} negate makes a "not" block
 * @returns {*} the combined operand
 */
const nestBool = (operands, operators, combine, negate) => {
    const ops = operators.map(o => (o in BOOL_LEVELS ? o : 'a'));
    if (ops.length > 1 && ops.every(o => o === ops[0]) && BOOL_BASE[ops[0]]) {
        const base = BOOL_BASE[ops[0]];
        return negate(nestInfix(operands, ops.map(() => base), BOOL_LEVELS, () => false, combine));
    }
    return nestInfix(operands, ops, BOOL_LEVELS, () => false, combine);
};

// > (m), >= (M), < (l), <= (L), = (e), === (E), != (n): "a < b < c" is "a < b and b < c".
const COMPARE_OPERATORS = new Set(['m', 'M', 'l', 'L', 'e', 'E', 'n']);
const readCompareOperators = (mutation, count) =>
    readOperators(mutation, count, 'm').map(o => (COMPARE_OPERATORS.has(o) ? o : 'm'));

/**
 * Desktop fork (section 278): a modular block with its own symbols, for extensions (blockInfo `modular`,
 * docs/EXTENSION-INTEGRATION.md "Modular extension blocks"). Reads the block's inputs <prefix>1..n and the symbols
 * between them from the arguments the block's function gets, and nests them with the caller's levels.
 * @param {object} args the block function's arguments (inputs by name and `mutation`)
 * @param {object} options prefix (input name prefix), levels ({symbol code: precedence}, higher first),
 *   fallback (symbol code used for a missing or unknown one; default: the first of levels), convert (applied to
 *   each input, e.g. Cast.toNumber: only the first inputs are declared, so the extension wrapper converts only
 *   those), rightAssociative (function(code): boolean), empty (the answer of a block without inputs)
 * @param {function(string, *, *): *} combine works out one symbol of two values
 * @returns {*} the answer of the chain
 */
const runChain = (args, options, combine) => {
    const count = readCount(args.mutation);
    if (count === 0) return options.empty;
    const levels = options.levels;
    const fallback = options.fallback || Object.keys(levels)[0];
    const operands = [];
    for (let i = 1; i <= count; i++) {
        const value = args[options.prefix + i];
        operands.push(options.convert ? options.convert(value) : value);
    }
    const operators = readOperators(args.mutation, count, fallback)
        .map(o => (Object.prototype.hasOwnProperty.call(levels, o) ? o : fallback));
    return nestInfix(operands, operators, levels, options.rightAssociative || (() => false), combine);
};

/**
 * Desktop fork (section 279): the modular "check" block (control_expandableSwitch). Its mutation has `branches`
 * (all branches), `ends-in-else` (the last one is "otherwise") and `menuvalues` (one character per "is" branch:
 * i = is, n = is, also run next).
 * @param {object} mutation the block's mutation
 * @returns {{cases: number, hasElse: boolean, runsNext: Array<boolean>}} the "is" branches 1..cases (inputs CASEn,
 *   SUBSTACKn) and whether SUBSTACK(cases + 1) is the "otherwise" branch
 */
const readSwitch = mutation => {
    const total = Math.max(1, Math.floor(Number(mutation && mutation.branches)) || 1);
    const hasElse = !!mutation && mutation['ends-in-else'] === 'true' && total > 1;
    const cases = total - (hasElse ? 1 : 0);
    const menu = String((mutation && mutation.menuvalues) || '');
    const runsNext = [];
    for (let i = 0; i < cases; i++) runsNext.push(menu[i] === 'n');
    return {cases, hasElse, runsNext};
};

module.exports = {
    nestInfix,
    readSwitch,
    runChain,
    readCount,
    readOperators,
    readCompareOperators,
    nestMath,
    nestBool
};
