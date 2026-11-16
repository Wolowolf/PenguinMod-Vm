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

// "+ - * / ^": the usual order of operations, ^ groups from the right (2 ^ 3 ^ 2 = 2 ^ 9).
const MATH_LEVELS = {'+': 1, '-': 1, '*': 2, '/': 2, '^': 3};
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

module.exports = {
    readCount,
    readOperators,
    readCompareOperators,
    nestMath,
    nestBool
};
