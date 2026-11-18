const Cast = require('../util/cast.js');
// Desktop fork (section 274)
const ExpandableBlocks = require('../util/expandable-blocks');
// Desktop fork (section 291): what each Operators block does is in shared/operators.js, used by the compiler too
const SharedBlocks = require('./shared');

class Scratch3OperatorsBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this._shared = SharedBlocks.interpreterBlocks(runtime);
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        const primitives = {
            // Desktop fork (section 274): the modular blocks, worked out with the single blocks' functions
            operator_expandableMath: this.expandableMath,
            operator_expandablejoininputs: this.expandableJoin,
            operator_expandableBool: this.expandableBool,
            operator_expandableCompare: this.expandableCompare
        };
        for (const opcode of Object.keys(this._shared)) {
            if (opcode.startsWith('operator_')) primitives[opcode] = this._shared[opcode];
        }
        return primitives;
    }

    // Desktop fork (section 274): the modular blocks with the single blocks' functions, nested like the compiler
    // nests them (src/util/expandable-blocks.js)
    _expandableInputs (args, prefix) {
        const values = [];
        const count = ExpandableBlocks.readCount(args.mutation);
        for (let i = 1; i <= count; i++) values.push(args[prefix + i]);
        return values;
    }

    expandableMath (args) {
        const shared = this._shared;
        const values = this._expandableInputs(args, 'NUM');
        if (values.length === 0) return 0;
        if (values.length === 1) return shared.operator_add({NUM1: values[0], NUM2: 0});
        const functions = {
            '+': shared.operator_add, '-': shared.operator_subtract, '*': shared.operator_multiply,
            '/': shared.operator_divide, '%': shared.operator_mod, '^': shared.operator_power
        };
        const operators = ExpandableBlocks.readOperators(args.mutation, values.length, '+');
        return ExpandableBlocks.nestMath(values, operators,
            (operator, left, right) => functions[operator]({NUM1: left, NUM2: right}));
    }

    expandableJoin (args) {
        const join = this._shared.operator_join;
        const values = this._expandableInputs(args, 'INPUT');
        let result = values.length === 0 ? '' : join({STRING1: values[0], STRING2: ''});
        for (let i = 1; i < values.length; i++) result = join({STRING1: result, STRING2: values[i]});
        return result;
    }

    expandableBool (args) {
        const shared = this._shared;
        const values = this._expandableInputs(args, 'BOOL');
        if (values.length === 0) return false;
        if (values.length === 1) return Cast.toBoolean(values[0]);
        const functions = {
            a: shared.operator_and, o: shared.operator_or, x: shared.operator_xor,
            n: shared.operator_nand, N: shared.operator_nor, X: shared.operator_xnor
        };
        const operators = ExpandableBlocks.readOperators(args.mutation, values.length, 'a');
        return ExpandableBlocks.nestBool(values, operators,
            (operator, left, right) => functions[operator]({OPERAND1: left, OPERAND2: right}),
            value => shared.operator_not({OPERAND: value}));
    }

    expandableCompare (args) {
        const shared = this._shared;
        const values = this._expandableInputs(args, 'INPUT');
        const operators = ExpandableBlocks.readCompareOperators(args.mutation, values.length);
        const functions = {
            m: shared.operator_gt, M: shared.operator_gtorequal, l: shared.operator_lt,
            L: shared.operator_ltorequal, e: shared.operator_equals, n: shared.operator_notequal,
            E: shared.operator_strictEquals
        };
        for (let i = 0; i < values.length - 1; i++) {
            const holds = functions[operators[i]]({OPERAND1: values[i], OPERAND2: values[i + 1]});
            if (!holds) return false;
        }
        return true;
    }
}

module.exports = Scratch3OperatorsBlocks;
