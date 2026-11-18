const test = require('tap').test;
const Operators = require('../../src/blocks/scratch3_operators');
const Runtime = require('../../src/engine/runtime');

// Desktop fork (section 155): random numbers come from the runtime
const blocks = new Operators(new Runtime());

test('getPrimitives', t => {
    t.type(blocks.getPrimitives(), 'object');
    t.end();
});

test('add', t => {
    t.strictEqual(blocks._shared.operator_add({NUM1: '1', NUM2: '1'}), 2);
    t.strictEqual(blocks._shared.operator_add({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('subtract', t => {
    t.strictEqual(blocks._shared.operator_subtract({NUM1: '1', NUM2: '1'}), 0);
    t.strictEqual(blocks._shared.operator_subtract({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('multiply', t => {
    t.strictEqual(blocks._shared.operator_multiply({NUM1: '2', NUM2: '2'}), 4);
    t.strictEqual(blocks._shared.operator_multiply({NUM1: 'foo', NUM2: 'bar'}), 0);
    t.end();
});

test('divide', t => {
    t.strictEqual(blocks._shared.operator_divide({NUM1: '2', NUM2: '2'}), 1);
    t.ok(isNaN(blocks._shared.operator_divide({NUM1: 'foo', NUM2: 'bar'}))); // @todo
    t.end();
});

test('lt', t => {
    t.strictEqual(blocks._shared.operator_lt({OPERAND1: '1', OPERAND2: '2'}), true);
    t.strictEqual(blocks._shared.operator_lt({OPERAND1: '2', OPERAND2: '1'}), false);
    t.strictEqual(blocks._shared.operator_lt({OPERAND1: '1', OPERAND2: '1'}), false);
    t.strictEqual(blocks._shared.operator_lt({OPERAND1: '10', OPERAND2: '2'}), false);
    t.strictEqual(blocks._shared.operator_lt({OPERAND1: 'a', OPERAND2: 'z'}), true);
    t.end();
});

test('equals', t => {
    t.strictEqual(blocks._shared.operator_equals({OPERAND1: '1', OPERAND2: '2'}), false);
    t.strictEqual(blocks._shared.operator_equals({OPERAND1: '2', OPERAND2: '1'}), false);
    t.strictEqual(blocks._shared.operator_equals({OPERAND1: '1', OPERAND2: '1'}), true);
    t.strictEqual(blocks._shared.operator_equals({OPERAND1: 'あ', OPERAND2: 'ア'}), false);
    t.end();
});

test('gt', t => {
    t.strictEqual(blocks._shared.operator_gt({OPERAND1: '1', OPERAND2: '2'}), false);
    t.strictEqual(blocks._shared.operator_gt({OPERAND1: '2', OPERAND2: '1'}), true);
    t.strictEqual(blocks._shared.operator_gt({OPERAND1: '1', OPERAND2: '1'}), false);
    t.end();
});

test('and', t => {
    t.strictEqual(blocks._shared.operator_and({OPERAND1: true, OPERAND2: true}), true);
    t.strictEqual(blocks._shared.operator_and({OPERAND1: true, OPERAND2: false}), false);
    t.strictEqual(blocks._shared.operator_and({OPERAND1: false, OPERAND2: false}), false);
    t.end();
});

test('or', t => {
    t.strictEqual(blocks._shared.operator_or({OPERAND1: true, OPERAND2: true}), true);
    t.strictEqual(blocks._shared.operator_or({OPERAND1: true, OPERAND2: false}), true);
    t.strictEqual(blocks._shared.operator_or({OPERAND1: false, OPERAND2: false}), false);
    t.end();
});

test('not', t => {
    t.strictEqual(blocks._shared.operator_not({OPERAND: true}), false);
    t.strictEqual(blocks._shared.operator_not({OPERAND: false}), true);
    t.end();
});

test('random', t => {
    const min = 0;
    const max = 100;
    const result = blocks._shared.operator_random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - equal', t => {
    const min = 1;
    const max = 1;
    t.strictEqual(blocks._shared.operator_random({FROM: min, TO: max}), min);
    t.end();
});

test('random - decimal', t => {
    const min = 0.1;
    const max = 10;
    const result = blocks._shared.operator_random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - int', t => {
    const min = 0;
    const max = 10;
    const result = blocks._shared.operator_random({FROM: min, TO: max});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('random - reverse', t => {
    const min = 0;
    const max = 10;
    const result = blocks._shared.operator_random({FROM: max, TO: min});
    t.ok(result >= min);
    t.ok(result <= max);
    t.end();
});

test('join', t => {
    t.strictEqual(blocks._shared.operator_join({STRING1: 'foo', STRING2: 'bar'}), 'foobar');
    t.strictEqual(blocks._shared.operator_join({STRING1: '1', STRING2: '2'}), '12');
    t.end();
});

test('letterOf', t => {
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 0}), '');
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 1}), 'f');
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 2}), 'o');
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 3}), 'o');
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 4}), '');
    t.strictEqual(blocks._shared.operator_letter_of({STRING: 'foo', LETTER: 'bar'}), '');
    t.end();
});

test('length', t => {
    t.strictEqual(blocks._shared.operator_length({STRING: ''}), 0);
    t.strictEqual(blocks._shared.operator_length({STRING: 'foo'}), 3);
    t.strictEqual(blocks._shared.operator_length({STRING: '1'}), 1);
    t.strictEqual(blocks._shared.operator_length({STRING: '100'}), 3);
    t.end();
});

test('contains', t => {
    t.strictEqual(blocks._shared.operator_contains({STRING1: 'hello world', STRING2: 'hello'}), true);
    t.strictEqual(blocks._shared.operator_contains({STRING1: 'foo', STRING2: 'bar'}), false);
    t.strictEqual(blocks._shared.operator_contains({STRING1: 'HeLLo world', STRING2: 'hello'}), true);
    t.end();
});

test('mod', t => {
    t.strictEqual(blocks._shared.operator_mod({NUM1: 1, NUM2: 1}), 0);
    t.strictEqual(blocks._shared.operator_mod({NUM1: 3, NUM2: 6}), 3);
    t.strictEqual(blocks._shared.operator_mod({NUM1: -3, NUM2: 6}), 3);
    t.end();
});

test('round', t => {
    t.strictEqual(blocks._shared.operator_round({NUM: 1}), 1);
    t.strictEqual(blocks._shared.operator_round({NUM: 1.1}), 1);
    t.strictEqual(blocks._shared.operator_round({NUM: 1.5}), 2);
    t.end();
});

test('mathop', t => {
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'abs', NUM: -1}), 1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'floor', NUM: 1.5}), 1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'ceiling', NUM: 0.1}), 1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'sqrt', NUM: 1}), 1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'sin', NUM: 1}), 0.0174524064);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'sin', NUM: 90}), 1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'cos', NUM: 1}), 0.9998476952);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'cos', NUM: 180}), -1);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'tan', NUM: 1}), 0.0174550649);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'tan', NUM: 90}), Infinity);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'tan', NUM: 180}), 0);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'asin', NUM: 1}), 90);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'acos', NUM: 1}), 0);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'atan', NUM: 1}), 45);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'ln', NUM: 1}), 0);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'log', NUM: 1}), 0);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'e ^', NUM: 1}), 2.718281828459045);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: '10 ^', NUM: 1}), 10);
    t.strictEqual(blocks._shared.operator_mathop({OPERATOR: 'undefined', NUM: 1}), 0);
    t.end();
});
