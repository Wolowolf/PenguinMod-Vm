const log = require('../util/log');
const Cast = require('../util/cast');
const BlockType = require('../extension-support/block-type');
const VariablePool = require('./variable-pool');
const jsexecute = require('./jsexecute');
const environment = require('./environment');

// Imported for JSDoc types, not to actually use
// eslint-disable-next-line no-unused-vars
const {IntermediateScript, IntermediateRepresentation} = require('./intermediate');

/**
 * @fileoverview Convert intermediate representations to JavaScript functions.
 */

/* eslint-disable max-len */
/* eslint-disable prefer-template */

const sanitize = string => {
    if (typeof string !== 'string') {
        log.warn(`sanitize got unexpected type: ${typeof string}`);
        string = '' + string;
    }
    return JSON.stringify(string).slice(1, -1);
};

const TYPE_NUMBER = 1;
const TYPE_STRING = 2;
const TYPE_BOOLEAN = 3;
const TYPE_UNKNOWN = 4;
const TYPE_NUMBER_NAN = 5;


// Pen-related constants
const PEN_EXT = 'runtime.ext_pen';
const PEN_STATE = `${PEN_EXT}._getPenState(target)`;

// Math-related constants
const TO_RADIAN = Math.PI / 180;
const TO_DEGREE = 180 / Math.PI;

/**
 * Variable pool used for factory function names.
 */
const factoryNameVariablePool = new VariablePool('factory');

/**
 * Variable pool used for generated functions (non-generator)
 */
const functionNameVariablePool = new VariablePool('fun');

/**
 * Variable pool used for generated generator functions.
 */
const generatorNameVariablePool = new VariablePool('gen');

/**
 * @typedef Input
 * @property {Function} asNumber Returns string
 * @property {Function} asNumberOrNaN Returns string
 * @property {Function} asString Returns string
 * @property {Function} asBoolean Returns string
 * @property {Function} asColor Returns string
 * @property {Function} asUnknown Returns string
 * @property {Function} asSafe Returns string
 * @property {Function} isAlwaysNumber Returns boolean
 * @property {Function} isAlwaysNumberOrNaN Returns boolean
 * @property {Function} isNeverNumber Returns boolean
 */

/**
 * @implements {Input}
 */
class TypedInput {
    constructor (source, type) {
        this.source = source;
        this.type = type;
    }

    asNumber () {
        if (this.type === TYPE_NUMBER) return this.source;
        if (this.type === TYPE_NUMBER_NAN) return `(${this.source} || 0)`;
        return `(+${this.source} || 0)`;
    }

    asNumberOrNaN () {
        if (this.type === TYPE_NUMBER || this.type === TYPE_NUMBER_NAN) return this.source;
        return `(+${this.source})`;
    }

    asString () {
        if (this.type === TYPE_STRING) return this.source;
        return `("" + ${this.source})`;
    }

    asBoolean () {
        if (this.type === TYPE_UNKNOWN) return `toBoolean(${this.source})`;
        if (this.type === TYPE_STRING) return `${this.source} === 'false' || ${this.source} === '0' ? false : true`;
        if (this.type === TYPE_NUMBER) return `${this.source} !== 0`;
        if (this.type === TYPE_NUMBER_NAN) return `(${this.source} || 0) !== 0`;

        return this.source;
    }

    asColor () {
        return this.asUnknown();
    }

    asUnknown () {
        return this.source;
    }

    asSafe () {
        return this.asUnknown();
    }

    isAlwaysNumber () {
        return this.type === TYPE_NUMBER;
    }

    isAlwaysNumberOrNaN () {
        return this.type === TYPE_NUMBER || this.type === TYPE_NUMBER_NAN;
    }

    isNeverNumber () {
        return false;
    }
}

/**
 * @implements {Input}
 */
class ConstantInput {
    constructor (constantValue, safe) {
        this.constantValue = constantValue;
        this.safe = safe;
    }

    asNumber () {
        // Compute at compilation time
        const numberValue = +this.constantValue;
        if (numberValue) {
            // It's important that we use the number's stringified value and not the constant value
            // Using the constant value allows numbers such as "010" to be interpreted as 8 (or SyntaxError in strict mode) instead of 10.
            return numberValue.toString();
        }
        // numberValue is one of 0, -0, or NaN
        if (Object.is(numberValue, -0)) {
            return '-0';
        }
        return '0';
    }

    asNumberOrNaN () {
        return this.asNumber();
    }

    asString () {
        return `"${sanitize('' + this.constantValue)}"`;
    }

    asBoolean () {
        // Compute at compilation time
        return Cast.toBoolean(this.constantValue).toString();
    }

    asColor () {
        // Attempt to parse hex code at compilation time
        if (/^#[0-9a-f]{6,8}$/i.test(this.constantValue)) {
            const hex = this.constantValue.slice(1);
            return Number.parseInt(hex, 16).toString();
        }
        return this.asUnknown();
    }

    asUnknown () {
        // Attempt to convert strings to numbers if it is unlikely to break things
        if (typeof this.constantValue === 'number' || typeof this.constantValue === 'boolean') {
            // todo: handle NaN?
            return this.constantValue;
        }
        // handle bad nulls
        if (this.constantValue == null) {
            return 'null';
        }
        const numberValue = +this.constantValue;
        if (numberValue.toString() === this.constantValue) {
            return this.constantValue;
        }
        return this.asString();
    }

    asSafe () {
        if (this.safe) {
            return this.asUnknown();
        }
        return this.asString();
    }

    isAlwaysNumber () {
        const value = +this.constantValue;
        if (Number.isNaN(value)) {
            return false;
        }
        // Empty strings evaluate to 0 but should not be considered a number.
        if (value === 0) {
            return this.constantValue.toString().trim() !== '';
        }
        return true;
    }

    isAlwaysNumberOrNaN () {
        return this.isAlwaysNumber();
    }

    isNeverNumber () {
        return Number.isNaN(+this.constantValue);
    }
}

/**
 * @implements {Input}
 */
class VariableInput {
    constructor (source) {
        this.source = source;
        this.type = TYPE_UNKNOWN;
        /**
         * The value this variable was most recently set to, if any.
         * @type {Input}
         * @private
         */
        this._value = null;
    }

    /**
     * @param {Input} input The input this variable was most recently set to.
     */
    setInput (input) {
        if (input instanceof VariableInput) {
            // When being set to another variable, extract the value it was set to.
            // Otherwise, you may end up with infinite recursion in analysis methods when a variable is set to itself.
            if (input._value) {
                input = input._value;
            } else {
                this.type = TYPE_UNKNOWN;
                this._value = null;
                return;
            }
        }
        this._value = input;
        if (input instanceof TypedInput) {
            this.type = input.type;
        } else {
            this.type = TYPE_UNKNOWN;
        }
    }

    asNumber () {
        if (this.type === TYPE_NUMBER) return this.source;
        if (this.type === TYPE_NUMBER_NAN) return `(${this.source} || 0)`;
        return `(+${this.source} || 0)`;
    }

    asNumberOrNaN () {
        if (this.type === TYPE_NUMBER || this.type === TYPE_NUMBER_NAN) return this.source;
        return `(+${this.source})`;
    }

    asString () {
        if (this.type === TYPE_STRING) return this.source;
        return `("" + ${this.source})`;
    }

    asBoolean () {
        if (this.type === TYPE_BOOLEAN) return this.source;
        return `toBoolean(${this.source})`;
    }

    asColor () {
        return this.asUnknown();
    }

    asUnknown () {
        return this.source;
    }

    asSafe () {
        return this.asUnknown();
    }

    isAlwaysNumber () {
        if (this._value) {
            return this._value.isAlwaysNumber();
        }
        return false;
    }

    isAlwaysNumberOrNaN () {
        if (this._value) {
            return this._value.isAlwaysNumberOrNaN();
        }
        return false;
    }

    isNeverNumber () {
        if (this._value) {
            return this._value.isNeverNumber();
        }
        return false;
    }
}

const getNamesOfCostumesAndSounds = runtime => {
    const result = new Set();
    for (const target of runtime.targets) {
        if (target.isOriginal) {
            const sprite = target.sprite;
            for (const costume of sprite.costumes) {
                result.add(costume.name);
            }
            for (const sound of sprite.sounds) {
                result.add(sound.name);
            }
        }
    }
    return result;
};

const isSafeConstantForEqualsOptimization = input => {
    const numberValue = +input.constantValue;
    // Do not optimize 0
    if (!numberValue) {
        return false;
    }
    // Do not optimize numbers when the original form does not match
    return numberValue.toString() === input.constantValue.toString();
};

/**
 * PMDESKTOP_FOLD (section 44): kinds of input that change nothing and always give the same answer for the same
 * inputs: only arithmetic, comparison, logic and text operations. Anything that reads or changes variables, lists,
 * the timer, random numbers, sprites, the stage or an extension is not in this list.
 */
const FOLDABLE_KINDS = new Set([
    'op.add', 'op.subtract', 'op.multiply', 'op.divide', 'op.mod', 'op.power',
    'op.abs', 'op.floor', 'op.ceiling', 'op.round', 'op.sqrt', 'op.sign',
    'op.sin', 'op.cos', 'op.tan', 'op.asin', 'op.acos', 'op.atan',
    'op.ln', 'op.log', 'op.log2', 'op.e^', 'op.10^',
    'op.equals', 'op.greater', 'op.less', 'op.and', 'op.or', 'op.not',
    'op.join', 'op.length', 'op.letterOf', 'op.contains',
    // PenguinMod's expandable math / and-or / compare blocks (their inputs are lists of inputs)
    'op.expandmath', 'op.expandBool', 'op.expandCompare',
    // the "Operators Expansion" extension's calculations (bit operations, if-falsey/truthy, pitch, atan2); they
    // are compiled by the extension itself, only the answer is worked out here
    'pmOperatorsExpansion.shiftLeft', 'pmOperatorsExpansion.shiftRight', 'pmOperatorsExpansion.binnaryAnd',
    'pmOperatorsExpansion.binnaryOr', 'pmOperatorsExpansion.binnaryXor', 'pmOperatorsExpansion.binnaryNot',
    'pmOperatorsExpansion.orIfFalsey', 'pmOperatorsExpansion.ifIsTruthy', 'pmOperatorsExpansion.speedToPitch',
    'pmOperatorsExpansion.pitchToSpeed', 'pmOperatorsExpansion.atan2'
]);

/**
 * PMDESKTOP_FOLD (section 44): whether generated code is one unbroken term whose meaning cannot change with the
 * code around it: `(...)`, `name(...)`, `"text"`, any of those followed by `.name`, or `!` in front of one.
 * (Some generated code, e.g. "not" of a text, is not: it reads differently depending on what it is put into.
 * That code is never folded, so it stays exactly as it was.)
 * @param {string} source Generated JavaScript for one input.
 * @returns {boolean} true if the source is one unbroken term.
 */
const isUnbrokenTerm = source => {
    const length = source.length;
    let i = 0;
    while (source.charCodeAt(i) === 33) i++; // "!"
    const first = source[i];
    if (first === '"') {
        i = skipStringLiteral(source, i);
        if (i < 0) return false;
    } else {
        // optional name (Math.abs, mod, compareEqual …) then a bracket pair
        while (i < length && /[\w$.]/.test(source[i])) i++;
        if (source[i] !== '(') return false;
        let depth = 0;
        for (; i < length; i++) {
            const c = source[i];
            if (c === '"' || c === "'") {
                i = skipStringLiteral(source, i) - 1;
                if (i < 0) return false;
            } else if (c === '(') {
                depth++;
            } else if (c === ')') {
                depth--;
                if (depth === 0) break;
                if (depth < 0) return false;
            }
        }
        if (depth !== 0) return false;
        i++;
    }
    // only property reads such as .length may follow
    return i === length || /^(\.[A-Za-z_$][\w$]*)+$/.test(source.slice(i));
};

/**
 * @param {string} source JavaScript.
 * @param {number} start Index of the opening quote.
 * @returns {number} Index just after the closing quote, or -1.
 */
const skipStringLiteral = (source, start) => {
    const quote = source[start];
    for (let i = start + 1; i < source.length; i++) {
        const c = source[i];
        if (c === '\\') i++;
        else if (c === quote) return i + 1;
    }
    return -1;
};

/**
 * A frame contains some information about the current substack being compiled.
 */
class Frame {
    constructor (isLoop, parentKind, overrideLoop = false) {
        /**
         * Whether the current stack runs in a loop (while, for)
         * @type {boolean}
         * @readonly
         */
        this.isLoop = isLoop;

        /**
         * Whether the current block is the last block in the stack.
         * @type {boolean}
         */
        this.isLastBlock = false;

        this.overrideLoop = overrideLoop

        /**
         * General important data that needs to be carried down from other threads.
         * @type {boolean}
         */
        this.importantData = {
            parents: [parentKind]
        };
        if (isLoop)
            this.importantData.containedByLoop = isLoop;

        /**
         * the block who created this frame
         * @type {string}
         * @readonly
         */
        this.parent = parentKind;
    }

    assignData(obj) {
        if (obj instanceof Frame) {
            obj = obj.importantData;
            obj.parents = obj.parents.concat(this.importantData.parents);
        }
        Object.assign(this.importantData, obj);
    }
}

class JSGenerator {
    /**
     * @param {IntermediateScript} script The generated IR script
     * @param {IntermediateRepresentation} ir The IR generator
     * @param {Target} target The target to generate code for
     */
    constructor (script, ir, target) {
        this.script = script;
        this.ir = ir;
        this.target = target;
        this.source = '';

        /**
         * @type {Object.<string, VariableInput>}
         */
        this.variableInputs = {};

        this.isWarp = script.isWarp;
        this.isOptimized = script.isOptimized;
        this.optimizationUtil = script.optimizationUtil;
        this.isProcedure = script.isProcedure;
        this.warpTimer = script.warpTimer;

        /**
         * Stack of frames, most recent is last item.
         * @type {Frame[]}
         */
        this.frames = [];

        /**
         * The current Frame.
         * @type {Frame}
         */
        this.currentFrame = null;

        this.namesOfCostumesAndSounds = getNamesOfCostumesAndSounds(target.runtime);

        this.localVariables = new VariablePool('a');
        this._setupVariablesPool = new VariablePool('b');
        this._setupVariables = {};

        this.descendedIntoModulo = false;
        this.isInHat = false;

        /**
         * Input nodes that were worked out at compile time (section 44).
         * @type {WeakSet<object>}
         */
        this.foldedNodes = new WeakSet();

        this.debug = this.target.runtime.debug;
    }

    static exports = {
        TypedInput,
        ConstantInput,
        VariableInput,
        Frame,
        VariablePool,
        TYPE_NUMBER,
        TYPE_STRING,
        TYPE_BOOLEAN,
        TYPE_UNKNOWN,
        TYPE_NUMBER_NAN,
        PEN_EXT,
        PEN_STATE,
        factoryNameVariablePool,
        functionNameVariablePool,
        generatorNameVariablePool,
        sanitize,
    }

    static unstable_exports = JSGenerator.exports;

    static _extensionJSInfo = {};
    static setExtensionJs(id, data) {
        JSGenerator._extensionJSInfo[id] = data;
    }
    static hasExtensionJs(id) {
        return Boolean(JSGenerator._extensionJSInfo[id]);
    }
    static getExtensionJs(id) {
        return JSGenerator._extensionJSInfo[id];
    }

    static getExtensionImports() {
        // used so extensions have things like the Frame class
        return {
            Frame: Frame,
            TypedInput: TypedInput,
            VariableInput: VariableInput,
            ConstantInput: ConstantInput,
            VariablePool: VariablePool,

            TYPE_NUMBER: TYPE_NUMBER,
            TYPE_STRING: TYPE_STRING,
            TYPE_BOOLEAN: TYPE_BOOLEAN,
            TYPE_UNKNOWN: TYPE_UNKNOWN,
            TYPE_NUMBER_NAN: TYPE_NUMBER_NAN
        };
    }

    /**
     * Enter a new frame
     * @param {Frame} frame New frame.
     */
    pushFrame (frame) {
        this.frames.push(frame);
        this.currentFrame = frame;
    }

    /**
     * Exit the current frame
     */
    popFrame () {
        this.frames.pop();
        this.currentFrame = this.frames[this.frames.length - 1];
    }

    /**
     * @returns {boolean} true if the current block is the last command of a loop
     */
    isLastBlockInLoop () {
        for (let i = this.frames.length - 1; i >= 0; i--) {
            const frame = this.frames[i];
            if (frame.overrideLoop) {
                return false;
            }
            if (!frame.isLastBlock) {
                return false;
            }
            if (frame.isLoop) {
                return true;
            }
        }
        return false;
    }

    /**
     * PMDESKTOP_FOLD (section 44): compile an input; when it is a calculation whose inputs are all fixed values,
     * work out the answer now instead of every time the script runs.
     * @param {object} node Input node to compile.
     * @param {boolean} visualReport if this is being called to get visual reporter content
     * @returns {Input} Compiled input.
     */
    descendInput (node, visualReport = false) {
        const input = this.descendInputUnfolded(node, visualReport);
        if (!FOLDABLE_KINDS.has(node.kind) || !(input instanceof TypedInput)) return input;
        // (never when an extension has registered its own code for the "op" blocks: then the answer is not ours to know)
        if (this.target.runtime.pmNoConstantFolding || JSGenerator.hasExtensionJs('op') || !this.hasOnlyFixedInputs(node)) return input;
        return this.foldFixedInput(node, input);
    }

    /**
     * @param {object} node Input node of a foldable kind.
     * @returns {boolean} true if every input of the node is a fixed value (or a calculation folded to one).
     */
    hasOnlyFixedInputs (node) {
        for (const key in node) {
            if (key !== 'kind' && !this.isFixedValue(node[key])) return false;
        }
        return true;
    }

    /**
     * @param {*} value A field of an input node: plain data, a child node, or a list of those.
     * @returns {boolean} true if it is plain data or a fixed child node.
     */
    isFixedValue (value) {
        if (value === null || typeof value !== 'object') return true;
        if (Array.isArray(value)) {
            for (const item of value) {
                if (!this.isFixedValue(item)) return false;
            }
            return true;
        }
        if (typeof value.kind !== 'string') return false;
        if (value.kind === 'constant') {
            const type = typeof value.value;
            return type === 'string' || type === 'number' || type === 'boolean';
        }
        return value.kind === 'op.true' || value.kind === 'op.false' || this.foldedNodes.has(value);
    }

    /**
     * Work out the answer of a calculation whose inputs are all fixed values. The calculation is the code that
     * would have been written for it anyway, run with the same helper functions the compiled script gets, so the
     * answer is the one the script would have computed. Left unchanged when the answer is not an ordinary
     * number (NaN, infinity, -0), a string or a boolean, or when running it fails.
     * @param {object} node The input node.
     * @param {TypedInput} input The code written for the node.
     * @returns {Input} The answer as a fixed value, or `input`.
     */
    foldFixedInput (node, input) {
        // Only code that reads the same wherever it is put (see isUnbrokenTerm).
        if (!isUnbrokenTerm(input.source)) return input;
        let value;
        try {
            // (only the sin / cos tables are reachable from the expression, not the project)
            value = jsexecute.evalPure(input.source, this.pureRuntime || (this.pureRuntime = {optimizationUtil: this.target.runtime.optimizationUtil}));
        } catch (e) {
            return input;
        }
        // The answer keeps the type the code was written with, so the code around it is written as before.
        let source;
        switch (input.type) {
        case TYPE_NUMBER:
        case TYPE_NUMBER_NAN:
            if (typeof value !== 'number' || !Number.isFinite(value) || Object.is(value, -0)) return input;
            source = `(${value})`;
            break;
        case TYPE_BOOLEAN:
            if (typeof value !== 'boolean') return input;
            source = `(${value})`;
            break;
        case TYPE_STRING:
            if (typeof value !== 'string') return input;
            source = `("${sanitize(value)}")`;
            break;
        case TYPE_UNKNOWN:
            // (extension calculations whose answer can be any kind of value)
            if (typeof value === 'number') {
                if (!Number.isFinite(value) || Object.is(value, -0)) return input;
                source = `(${value})`;
            } else if (typeof value === 'boolean') {
                source = `(${value})`;
            } else if (typeof value === 'string') {
                source = `("${sanitize(value)}")`;
            } else {
                return input;
            }
            break;
        default:
            return input;
        }
        this.foldedNodes.add(node);
        return new TypedInput(source, input.type);
    }

    /**
     * @param {object} node Input node to compile.
     * @param {boolean} visualReport if this is being called to get visual reporter content
     * @returns {Input} Compiled input.
     */
    descendInputUnfolded (node, visualReport = false) {
        // check if we have extension js for this kind
        const extensionId = String(node.kind).split('.')[0];
        const blockId = String(node.kind).replace(extensionId + '.', '');
        if (JSGenerator.hasExtensionJs(extensionId) && JSGenerator.getExtensionJs(extensionId)[blockId]) {
            // this is an extension block that wants to be compiled
            const imports = JSGenerator.getExtensionImports();
            const jsFunc = JSGenerator.getExtensionJs(extensionId)[blockId];
            // return the input
            let input = null;
            try {
                input = jsFunc(node, this, imports);
            } catch (err) {
                log.warn(extensionId + '_' + blockId, 'failed to compile JavaScript;', err);
            }
            // log.log(input);
            return input;
        }

        switch (node.kind) {
        case 'args.boolean':
            return new TypedInput(`toBoolean(p${node.index})`, TYPE_BOOLEAN);
        case 'args.stringNumber':
            return new TypedInput(`p${node.index}`, TYPE_UNKNOWN);

        case 'compat':
            // Compatibility layer inputs never use flags.
            // log.log('compat')
            return new TypedInput(`(${this.generateCompatibilityLayerCall(node, false, null, visualReport)})`, TYPE_UNKNOWN);

        case 'constant':
            return this.safeConstantInput(node.value);
        case 'counter.get':
            return new TypedInput('runtime.ext_scratch3_control._counter', TYPE_NUMBER);
        case 'control.error':
            return new TypedInput('runtime.ext_scratch3_control._error', TYPE_STRING);
        case 'control.isclone':
            return new TypedInput('(!target.isOriginal)', TYPE_BOOLEAN);
        case 'math.polygon':
            let points = JSON.stringify(node.points.map((point, num) => ({x: `x${num}`, y: `y${num}`})));
            for (let num = 0; num < node.points.length; num++) {
                const point = node.points[num];
                const xn = `"x${num}"`;
                const yn = `"y${num}"`;
                points = points
                    .replace(xn, this.descendInput(point.x).asNumber())
                    .replace(yn, this.descendInput(point.y).asNumber());
            }
            return new TypedInput(points, TYPE_UNKNOWN);

        case 'control.inlineStackOutput': {
            // reset this.source but save it
            const originalSource = this.source;
            this.source = '(yield* (function*() {';
            // descend now since descendStack modifies source
            this.descendStack(node.code, new Frame(false, 'control.inlineStackOutput', true));
            this.source += '})())';
            // save edited
            const stackSource = this.source;
            this.source = originalSource;
            return new TypedInput(stackSource, TYPE_UNKNOWN);
        }

        case 'keyboard.pressed':
            return new TypedInput(`runtime.ioDevices.keyboard.getKeyIsDown(${this.descendInput(node.key).asSafe()})`, TYPE_BOOLEAN);

        case 'list.contains':
            if (this.isOptimized) {
                // pm: we can use a better function here
                return new TypedInput(`listContainsFastest(${this.referenceVariable(node.list)}, ${this.descendInput(node.item).asUnknown()})`, TYPE_BOOLEAN);
            }
            return new TypedInput(`listContains(${this.referenceVariable(node.list)}, ${this.descendInput(node.item).asUnknown()})`, TYPE_BOOLEAN);
        case 'list.contents':
            if (this.isOptimized) {
                // pm: its more consistent to just return the list with spaces inbetween
                return new TypedInput(`(${this.listItems(node.list)}.join(' '))`, TYPE_STRING);
            }
            return new TypedInput(`listContents(${this.referenceVariable(node.list)})`, TYPE_STRING);
        case 'list.get': {
            const index = this.descendInput(node.index);
            if (environment.supportsNullishCoalescing) {
                if (index.isAlwaysNumberOrNaN()) {
                    return new TypedInput(`(${this.listItems(node.list)}[(${index.asNumber()} | 0) - 1] ?? "")`, TYPE_UNKNOWN);
                }
                if (index instanceof ConstantInput && index.constantValue === 'last') {
                    return new TypedInput(`(${this.listItems(node.list)}[${this.listItems(node.list)}.length - 1] ?? "")`, TYPE_UNKNOWN);
                }
            }
            if (this.isOptimized) {
                // pm: we can just use this as an index ignoring the string input, the nullish coalescing operator will just make sure we dont return undefined
                return new TypedInput(`(${this.listItems(node.list)}[${index.asUnknown()} - 1] ?? "")`, TYPE_UNKNOWN);
            }
            return new TypedInput(`listGet(${this.listItems(node.list)}, ${index.asUnknown()})`, TYPE_UNKNOWN);
        }
        case 'list.indexOf':
            return new TypedInput(`listIndexOf(${this.referenceVariable(node.list)}, ${this.descendInput(node.item).asUnknown()})`, TYPE_NUMBER);
        case 'list.amountOf':
            return new TypedInput(`${this.listItems(node.list)}.filter((x) => x == ${this.descendInput(node.value).asUnknown()}).length`, TYPE_NUMBER);
        case 'list.length':
            return new TypedInput(`${this.listItems(node.list)}.length`, TYPE_NUMBER);

        case 'list.filteritem':
            return new TypedInput('(thread._listFilterItem ?? [""])[(thread._listFilterItem ?? [""]).length - 1]', TYPE_UNKNOWN);
        case 'list.filterindex':
            return new TypedInput('(thread._listFilterIndex ?? [0])[(thread._listFilterIndex ?? [0]).length - 1]', TYPE_NUMBER);

        case 'looks.size':
            return new TypedInput('target.size', TYPE_NUMBER);
        case 'looks.tintColor':
            return new TypedInput('runtime.ext_scratch3_looks.getTintColor(null, { target: target })', TYPE_NUMBER);
        case 'looks.backdropName':
            return new TypedInput('stage.getCostumes()[stage.currentCostume].name', TYPE_STRING);
        case 'looks.backdropNumber':
            return new TypedInput('(stage.currentCostume + 1)', TYPE_NUMBER);
        case 'looks.costumeName':
            return new TypedInput('target.getCostumes()[target.currentCostume].name', TYPE_STRING);
        case 'looks.costumeNumber':
            return new TypedInput('(target.currentCostume + 1)', TYPE_NUMBER);

        case 'motion.direction':
            return new TypedInput('target.direction', TYPE_NUMBER);

        case 'motion.x':
            if (this.isOptimized) {
                return new TypedInput('(target.x)', TYPE_NUMBER);
            }
            return new TypedInput('limitPrecision(target.x)', TYPE_NUMBER);
        case 'motion.y':
            if (this.isOptimized) {
                return new TypedInput('(target.y)', TYPE_NUMBER);
            }
            return new TypedInput('limitPrecision(target.y)', TYPE_NUMBER);

        case 'mouse.down':
            return new TypedInput('runtime.ioDevices.mouse.getIsDown()', TYPE_BOOLEAN);
        case 'mouse.x':
            return new TypedInput('runtime.ioDevices.mouse.getScratchX()', TYPE_NUMBER);
        case 'mouse.y':
            return new TypedInput('runtime.ioDevices.mouse.getScratchY()', TYPE_NUMBER);

        case 'op.true':
            return new TypedInput('(true)', TYPE_BOOLEAN);
        case 'op.false':
            return new TypedInput('(false)', TYPE_BOOLEAN);
        case 'op.randbool':
            return new TypedInput('(Boolean(Math.round(Math.random())))', TYPE_BOOLEAN);

        case 'pmEventsExpansion.broadcastFunction':
            // we need to do function otherwise this block would be stupidly long
            const msgName = this.descendInput(node.broadcast).asString();
            let source = '(yield* (function*() {';
            source += `var broadcastVar = runtime.getTargetForStage().lookupBroadcastMsg("", ${msgName} );\n`;
            source += `if (broadcastVar) broadcastVar.isSent = true;\n`;
            const threads = this.localVariables.next();
            source += `var ${threads} = startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${msgName} });\n`;
            const threadVar = this.localVariables.next();
            source += `for (const ${threadVar} of ${threads}) { ${threadVar}.__evex_recievedDataa = '' };\n`;
            source += `yield* waitThreads(${threads});\n`;
            // wait an extra frame so the thread has the new value
            if (this.isWarp) {
                source += 'if (isStuck()) yield;\n';
            } else {
                source += 'yield;\n';
            }
            // Control may have been yielded to another script -- all bets are off.
            this.resetVariableInputs();
            // get value
            const value = this.localVariables.next();
            const thread = this.localVariables.next();
            source += `var ${value} = undefined;\n`;
            source += `for (var ${thread} of ${threads}) {`;
            // if not undefined, return value
            source += `if (typeof ${thread}.__evex_returnDataa !== 'undefined') {`;
            source += `return ${thread}.__evex_returnDataa;\n`;
            source += `}`;
            source += `}`;
            // no value, return empty value
            source += `return '';\n`;
            source += '})())';
            return new TypedInput(source, TYPE_STRING);
        case 'pmEventsExpansion.broadcastFunctionArgs': {
            // we need to do function otherwise this block would be stupidly long
            const msgName = this.descendInput(node.broadcast).asString();
            let source = '(yield* (function*() {';
            const threads = this.localVariables.next();
            source += `var broadcastVar = runtime.getTargetForStage().lookupBroadcastMsg("", ${msgName} );\n`;
            source += `if (broadcastVar) broadcastVar.isSent = true;\n`;
            source += `var ${threads} = startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${msgName} });\n`;
            const threadVar = this.localVariables.next();
            source += `for (const ${threadVar} of ${threads}) { ${threadVar}.__evex_recievedDataa = ${this.descendInput(node.args).asString()} };\n`;
            source += `yield* waitThreads(${threads});\n`;
            // wait an extra frame so the thread has the new value
            if (this.isWarp) {
                source += 'if (isStuck()) yield;\n';
            } else {
                source += 'yield;\n';
            }
            // Control may have been yielded to another script -- all bets are off.
            this.resetVariableInputs();
            // get value
            const value = this.localVariables.next();
            const thread = this.localVariables.next();
            source += `var ${value} = undefined;\n`;
            source += `for (var ${thread} of ${threads}) {`;
            // if not undefined, return value
            source += `if (typeof ${thread}.__evex_returnDataa !== 'undefined') {`;
            source += `return ${thread}.__evex_returnDataa;\n`;
            source += `}`;
            source += `}`;
            // no value, return empty value
            source += `return '';\n`;
            source += '})())';
            return new TypedInput(source, TYPE_STRING);
        }
        case 'op.abs':
            return new TypedInput(`Math.abs(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.acos':
            // Needs to be marked as NaN because Math.acos(1.0001) === NaN
            return new TypedInput(`(Math.acos(${this.descendInput(node.value).asNumber()}) * ${TO_DEGREE})`, TYPE_NUMBER_NAN);
        case 'op.add':
            // Needs to be marked as NaN because Infinity + -Infinity === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} + ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.and':
            return new TypedInput(`(${this.descendInput(node.left).asBoolean()} && ${this.descendInput(node.right).asBoolean()})`, TYPE_BOOLEAN);
        case 'op.asin':
            // Needs to be marked as NaN because Math.asin(1.0001) === NaN
            return new TypedInput(`(Math.asin(${this.descendInput(node.value).asNumber()}) * ${TO_DEGREE})`, TYPE_NUMBER_NAN);
        case 'op.atan':
            return new TypedInput(`(Math.atan(${this.descendInput(node.value).asNumber()}) * ${TO_DEGREE})`, TYPE_NUMBER);
        case 'op.ceiling':
            return new TypedInput(`Math.ceil(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.contains':
            return new TypedInput(`(${this.descendInput(node.string).asString()}.toLowerCase().indexOf(${this.descendInput(node.contains).asString()}.toLowerCase()) !== -1)`, TYPE_BOOLEAN);
        case 'op.cos':
            // pm: optimizations allow us to use a premade list for sin values on integers
            if (this.isOptimized) {
                const value = `${this.descendInput(node.value).asNumber()}`;
                return new TypedInput(`(Number.isInteger(${value}) ? runtime.optimizationUtil.cos[((${value} % 360) + 360) % 360] : (Math.round(Math.cos(${value} * ${TO_RADIAN}) * 1e10) / 1e10))`, TYPE_NUMBER_NAN);
            }
            return new TypedInput(`(Math.round(Math.cos(${this.descendInput(node.value).asNumber()} * ${TO_RADIAN}) * 1e10) / 1e10)`, TYPE_NUMBER_NAN);
        case 'op.divide':
            // Needs to be marked as NaN because 0 / 0 === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} / ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.power':
            // Needs to be marked as NaN because -1 ** 0.5 === NaN
            return new TypedInput(`(Math.pow(${this.descendInput(node.left).asNumber()}, ${this.descendInput(node.right).asNumber()}))`, TYPE_NUMBER_NAN);
        case 'op.equals': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When both operands are known to never be numbers, only use string comparison to avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() === ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            const leftAlwaysNumber = left.isAlwaysNumber();
            const rightAlwaysNumber = right.isAlwaysNumber();
            // When both operands are known to be numbers, we can use ===
            if (leftAlwaysNumber && rightAlwaysNumber) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // In certain conditions, we can use === when one of the operands is known to be a safe number.
            if (leftAlwaysNumber && left instanceof ConstantInput && isSafeConstantForEqualsOptimization(left)) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            if (rightAlwaysNumber && right instanceof ConstantInput && isSafeConstantForEqualsOptimization(right)) {
                return new TypedInput(`(${left.asNumber()} === ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareEqual(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.e^':
            return new TypedInput(`Math.exp(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.floor':
            return new TypedInput(`Math.floor(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.greater': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When the left operand is a number and the right operand is a number or NaN, we can use >
            if (left.isAlwaysNumber() && right.isAlwaysNumberOrNaN()) {
                return new TypedInput(`(${left.asNumber()} > ${right.asNumberOrNaN()})`, TYPE_BOOLEAN);
            }
            // When the left operand is a number or NaN and the right operand is a number, we can negate <=
            if (left.isAlwaysNumberOrNaN() && right.isAlwaysNumber()) {
                return new TypedInput(`!(${left.asNumberOrNaN()} <= ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() > ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareGreaterThan(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.join':
            return new TypedInput(`(${this.descendInput(node.left).asString()} + ${this.descendInput(node.right).asString()})`, TYPE_STRING);
        case "op.expandjoin": {
            for (var i = 0; i < node.strings.length; i++) {
                node.strings[i] = this.descendInput(node.strings[i]).asString();
            }
            return new TypedInput('(' + node.strings.join('+') + ')', TYPE_STRING);
        }
        case 'op.length':
            return new TypedInput(`${this.descendInput(node.string).asString()}.length`, TYPE_NUMBER);
        case 'op.less': {
            const left = this.descendInput(node.left);
            const right = this.descendInput(node.right);
            // When the left operand is a number or NaN and the right operand is a number, we can use <
            if (left.isAlwaysNumberOrNaN() && right.isAlwaysNumber()) {
                return new TypedInput(`(${left.asNumberOrNaN()} < ${right.asNumber()})`, TYPE_BOOLEAN);
            }
            // When the left operand is a number and the right operand is a number or NaN, we can negate >=
            if (left.isAlwaysNumber() && right.isAlwaysNumberOrNaN()) {
                return new TypedInput(`!(${left.asNumber()} >= ${right.asNumberOrNaN()})`, TYPE_BOOLEAN);
            }
            // When either operand is known to never be a number, avoid all number parsing.
            if (left.isNeverNumber() || right.isNeverNumber()) {
                return new TypedInput(`(${left.asString()}.toLowerCase() < ${right.asString()}.toLowerCase())`, TYPE_BOOLEAN);
            }
            // No compile-time optimizations possible - use fallback method.
            return new TypedInput(`compareLessThan(${left.asUnknown()}, ${right.asUnknown()})`, TYPE_BOOLEAN);
        }
        case 'op.letterOf':
            return new TypedInput(`((${this.descendInput(node.string).asString()})[(${this.descendInput(node.letter).asNumber()} | 0) - 1] || "")`, TYPE_STRING);
        case 'op.ln':
            // Needs to be marked as NaN because Math.log(-1) == NaN
            return new TypedInput(`Math.log(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.log':
            // Needs to be marked as NaN because Math.log(-1) == NaN
            return new TypedInput(`(Math.log(${this.descendInput(node.value).asNumber()}) / Math.LN10)`, TYPE_NUMBER_NAN);
        case 'op.log2':
            // Needs to be marked as NaN because Math.log2(-1) == NaN
            return new TypedInput(`Math.log2(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.advlog':
            // Needs to be marked as NaN because Math.log(-1) == NaN
            return new TypedInput(`(Math.log(${this.descendInput(node.right).asNumber()}) / (Math.log(${this.descendInput(node.left).asNumber()}))`, TYPE_NUMBER_NAN);
        case 'op.mod':
            this.descendedIntoModulo = true;
            // Needs to be marked as NaN because mod(0, 0) (and others) == NaN
            return new TypedInput(`mod(${this.descendInput(node.left).asNumber()}, ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.multiply':
            // Needs to be marked as NaN because Infinity * 0 === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} * ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.not':
            return new TypedInput(`!${this.descendInput(node.operand).asBoolean()}`, TYPE_BOOLEAN);
        case 'op.or':
            return new TypedInput(`(${this.descendInput(node.left).asBoolean()} || ${this.descendInput(node.right).asBoolean()})`, TYPE_BOOLEAN);
        case 'op.random':
            if (node.useInts) {
                // Both inputs are ints, so we know neither are NaN
                return new TypedInput(`randomInt(${this.descendInput(node.low).asNumber()}, ${this.descendInput(node.high).asNumber()})`, TYPE_NUMBER);
            }
            if (node.useFloats) {
                return new TypedInput(`randomFloat(${this.descendInput(node.low).asNumber()}, ${this.descendInput(node.high).asNumber()})`, TYPE_NUMBER_NAN);
            }
            return new TypedInput(`runtime.ext_scratch3_operators._random(${this.descendInput(node.low).asUnknown()}, ${this.descendInput(node.high).asUnknown()})`, TYPE_NUMBER_NAN);
        case 'op.round':
            return new TypedInput(`Math.round(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.sign':
            return new TypedInput(`Math.sign(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.sin':
            // pm: optimizations allow us to use a premade list for sin values on integers
            if (this.isOptimized) {
                const value = `${this.descendInput(node.value).asNumber()}`;
                return new TypedInput(`(Number.isInteger(${value}) ? runtime.optimizationUtil.sin[((${value} % 360) + 360) % 360] : (Math.round(Math.sin(${value} * ${TO_RADIAN}) * 1e10) / 1e10))`, TYPE_NUMBER_NAN);
            }
            return new TypedInput(`(Math.round(Math.sin(${this.descendInput(node.value).asNumber()} * ${TO_RADIAN}) * 1e10) / 1e10)`, TYPE_NUMBER_NAN);
        case 'op.sqrt':
            // Needs to be marked as NaN because Math.sqrt(-1) === NaN
            return new TypedInput(`Math.sqrt(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.subtract':
            // Needs to be marked as NaN because Infinity - Infinity === NaN
            return new TypedInput(`(${this.descendInput(node.left).asNumber()} - ${this.descendInput(node.right).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.tan':
            return new TypedInput(`tan(${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER_NAN);
        case 'op.10^':
            return new TypedInput(`(10 ** ${this.descendInput(node.value).asNumber()})`, TYPE_NUMBER);
        case 'op.expandmath': {
            const operations = node.operations;
            let builder = '';
            let powWrap = 0;
            for (var i = 0; i < operations.length; i++) {
                const op = operations[i];
                const prevOp = operations[i - 1];
                const opType = op[1];

                if (opType === "^") {
                    builder += 'Math.pow(';
                    builder += this.descendInput(op[0]).asNumber();
                    builder += ',';
                    powWrap++;
                } else {
                    builder += this.descendInput(op[0]).asNumber();
                    while (powWrap > 0) {
                        builder += ')';
                        powWrap--;
                    }
                    if (opType) builder += " " + opType + " ";
                }
            }
            return new TypedInput('(' + builder + ')', TYPE_NUMBER_NAN);
        }
        case 'op.expandBool': {
            const casted = node.bools.map((b) => this.descendInput(b).asBoolean());
            let src = '';

            if (node.isOptimized) {
                for (let i = 0; i < casted.length; i++) src += casted[i] + node.operators[i][0];
                if (!node.isNormal) src = `!(${src})`;
            } else {
                let abnormalCount = 0;
                for (let i = 0; i < casted.length; i++) {
                    const operator = node.operators[i];
                    const isAbnormal = ['n', 'N', 'X'].includes(operator[1]);
                    if (isAbnormal) {
                        abnormalCount++;
                        src += '!(';
                    }
                    src += casted[i];
                    if (!isAbnormal && abnormalCount > 0) {
                        abnormalCount--;
                        src += ')';
                    }
                    src += operator[0];
                }

                while (abnormalCount > 0) {
                    abnormalCount--;
                    src += ')';
                }
            }
            return new TypedInput('(' + src + ')', TYPE_BOOLEAN);
        }
        case 'op.expandCompare': {
            const casted = node.bools.map((b) => this.descendInput(b).asUnknown());
            const src = [];
            for (let i = 0; i < casted.length - 1; i++) {
                src.push("(" + casted[i] + node.operators[i][0] + casted[i + 1] + ")");
            }
            return new TypedInput('(' + src.join("&&") + ')', TYPE_BOOLEAN);
        }

        case 'sensing.answer':
            return new TypedInput(`runtime.ext_scratch3_sensing._answer`, TYPE_STRING);
        case 'sensing.colorTouchingColor':
            return new TypedInput(`target.colorIsTouchingColor(colorToList(${this.descendInput(node.target).asColor()}), colorToList(${this.descendInput(node.mask).asColor()}))`, TYPE_BOOLEAN);
        case 'sensing.date':
            return new TypedInput(`(new Date().getDate())`, TYPE_NUMBER);
        case 'sensing.dayofweek':
            return new TypedInput(`(new Date().getDay() + 1)`, TYPE_NUMBER);
        case 'sensing.daysSince2000':
            return new TypedInput('daysSince2000()', TYPE_NUMBER);
        case 'sensing.distance':
            // TODO: on stages, this can be computed at compile time
            return new TypedInput(`distance(${this.descendInput(node.target).asString()})`, TYPE_NUMBER);
        case 'sensing.hour':
            return new TypedInput(`(new Date().getHours())`, TYPE_NUMBER);
        case 'sensing.minute':
            return new TypedInput(`(new Date().getMinutes())`, TYPE_NUMBER);
        case 'sensing.month':
            return new TypedInput(`(new Date().getMonth() + 1)`, TYPE_NUMBER);
        case 'sensing.of': {
            const object = this.descendInput(node.object).asString();
            const property = node.property;
            if (node.object.kind === 'constant') {
                const isStage = node.object.value === '_stage_';
                // Note that if target isn't a stage, we can't assume it exists
                const objectReference = isStage ? 'stage' : this.evaluateOnce(`runtime.getSpriteTargetByName(${object})`);
                if (property === 'volume') {
                    return new TypedInput(`(${objectReference} ? ${objectReference}.volume : 0)`, TYPE_NUMBER);
                }
                if (isStage) {
                    switch (property) {
                    case 'background #':
                        // fallthrough for scratch 1.0 compatibility
                    case 'backdrop #':
                        return new TypedInput(`(${objectReference}.currentCostume + 1)`, TYPE_NUMBER);
                    case 'backdrop name':
                        return new TypedInput(`${objectReference}.getCostumes()[${objectReference}.currentCostume].name`, TYPE_STRING);
                    }
                } else {
                    switch (property) {
                    case 'x position':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.x : 0)`, TYPE_NUMBER);
                    case 'y position':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.y : 0)`, TYPE_NUMBER);
                    case 'direction':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.direction : 0)`, TYPE_NUMBER);
                    case 'costume #':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.currentCostume + 1 : 0)`, TYPE_NUMBER);
                    case 'costume name':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.getCostumes()[${objectReference}.currentCostume].name : 0)`, TYPE_UNKNOWN);
                    case 'layer':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.getLayerOrder() : 0)`, TYPE_NUMBER);
                    case 'size':
                        return new TypedInput(`(${objectReference} ? ${objectReference}.size : 0)`, TYPE_NUMBER);
                    }
                }
                const variableReference = this.evaluateOnce(`${objectReference} && ${objectReference}.lookupVariableByNameAndType("${sanitize(property)}", "", true)`);
                return new TypedInput(`(${variableReference} ? ${variableReference}.value : 0)`, TYPE_UNKNOWN);
            }
            return new TypedInput(`runtime.ext_scratch3_sensing.getAttributeOf({OBJECT: ${object}, PROPERTY: "${sanitize(property)}" })`, TYPE_UNKNOWN);
        }
        case 'sensing.second':
            return new TypedInput(`(new Date().getSeconds())`, TYPE_NUMBER);
        case 'sensing.timestamp':
            return new TypedInput(`(Date.now())`, TYPE_NUMBER);
        case 'sensing.touching':
            return new TypedInput(`target.isTouchingObject(${this.descendInput(node.object).asUnknown()})`, TYPE_BOOLEAN);
        case 'sensing.touchingColor':
            return new TypedInput(`target.isTouchingColor(colorToList(${this.descendInput(node.color).asColor()}))`, TYPE_BOOLEAN);
        case 'sensing.username':
            return new TypedInput('runtime.ioDevices.userData.getUsername()', TYPE_STRING);
        case 'sensing.loggedin':
            return new TypedInput('runtime.ioDevices.userData.getLoggedIn()', TYPE_BOOLEAN);
        case 'sensing.year':
            return new TypedInput(`(new Date().getFullYear())`, TYPE_NUMBER);

        case 'timer.get':
            return new TypedInput('runtime.ioDevices.clock.projectTimer()', TYPE_NUMBER);

        case 'tw.lastKeyPressed':
            return new TypedInput('runtime.ioDevices.keyboard.getLastKeyPressed()', TYPE_STRING);

        case 'var.get':
            return this.descendVariable(node.variable);

        case 'procedures.call': {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            let source = '(';
            // Do not generate any code for empty procedures.
            const procedureData = this.ir.procedures[procedureVariant];
            if (procedureData.stack === null) return new TypedInput('""', TYPE_STRING);

            const yieldForRecursion = !this.isWarp && procedureCode === this.script.procedureCode;
            const yieldForHat = this.isInHat;
            if (yieldForRecursion || yieldForHat) {
                // Direct recursion yields.
                this.yieldNotWarp();
            }
            if (procedureData.yields) {
                source += 'yield* ';
                if (!this.script.yields) {
                    throw new Error('Script uses yielding procedure but is not marked as yielding.');
                }
            }
            source += `thread.procedures["${sanitize(procedureVariant)}"](`;
            // Only include arguments if the procedure accepts any.
            if (procedureData.arguments.length) {
                const args = [];
                for (const input of node.arguments) {
                    if (input instanceof Array) {
                        //is a stack input
                        const temp = this.source;
                        this.source = "function*(thread, target, runtime, stage) {"
                        const temp2 = this.isWarp;
                        this.isWarp = procedureData.isWarp;
                        this.descendStack(input, new Frame(false, undefined, true));
                        this.isWarp = temp2;
                        this.source += "}";
                        args.push(this.source);
                        this.source = temp;
                    } else {
                        args.push(this.descendInput(input).asSafe());
                    }
                }
                source += args.join(',');
            }
            source += `))`;
            // Variable input types may have changes after a procedure call.
            this.resetVariableInputs();
            return new TypedInput(source, TYPE_UNKNOWN);
        }

        case 'noop':
            console.warn('unexpected noop');
            return new TypedInput('""', TYPE_UNKNOWN);

        case 'control.dualBlock':
            return new TypedInput('"dual block works!"', TYPE_STRING);
        case 'control.fromToIndex':
            return new TypedInput('(typeof _pmControlFromToIndex !== "undefined" ? _pmControlFromToIndex : 0)', TYPE_NUMBER)

        default:
            log.warn(`JS: Unknown input: ${node.kind}`, node);
            throw new Error(`JS: Unknown input: ${node.kind}`);
        }
    }

    /**
     * @param {*} node Stacked node to compile.
     */
    descendStackedBlock (node) {
        // check if we have extension js for this kind
        const extensionId = String(node.kind).split('.')[0];
        const blockId = String(node.kind).replace(extensionId + '.', '');
        if (JSGenerator.hasExtensionJs(extensionId) && JSGenerator.getExtensionJs(extensionId)[blockId]) {
            // this is an extension block that wants to be compiled
            const imports = JSGenerator.getExtensionImports();
            const jsFunc = JSGenerator.getExtensionJs(extensionId)[blockId];
            // add to source
            try {
                jsFunc(node, this, imports);
            } catch (err) {
                log.warn(extensionId + '_' + blockId, 'failed to compile JavaScript;', err);
            }
            return;
        }

        switch (node.kind) {
        case 'your mom':
            const urmom = 'https://penguinmod.com/dump/urmom-your-mom.mp4';
            const yaTried = 'https://penguinmod.com/dump/chips.mp4';
            const MISTERBEAST = 'https://penguinmod.com/dump/MISTER_BEAST.webm';
            const createVideo = url => `\`<video src="${url}" height="\${height}" autoplay loop style="alignment:center;"></video>\``;
            this.source += `
            const stage = document.getElementsByClassName('stage_stage_1fD7k box_box_2jjDp')[0].children[0]
            const height = stage.children[0].style.height
            stage.innerHTML = ${createVideo(urmom)}
            runtime.on('PROJECT_STOP_ALL', () => document.body.innerHTML = ${createVideo(yaTried)})
            stage.children[0].addEventListener('mousedown', () => stage.innerHTML = ${createVideo(MISTERBEAST)});
            `;
            break;

        case 'args.command':
            if (node.index !== -1) {
                let outputVariable = this.localVariables.next();
                this.source += `let ${outputVariable} = yield* (p${node.index} || function*(){})(thread, target, runtime, stage);\n`;
                this.source += `if (${outputVariable} !== undefined) { return ${outputVariable}; };\n`
            }
            break;

        case 'addons.call': {
            const inputs = this.descendInputRecord(node.arguments);
            const blockFunction = `runtime.getAddonBlock("${sanitize(node.code)}").callback`;
            const blockId = `"${sanitize(node.blockId)}"`;
            this.source += `yield* executeInCompatibilityLayer(${inputs}, ${blockFunction}, ${this.isWarp}, false, ${blockId});\n`;
            break;
        }
        case 'compat': {
            // If the last command in a loop returns a promise, immediately continue to the next iteration.
            // If you don't do this, the loop effectively yields twice per iteration and will run at half-speed.
            const isLastInLoop = this.isLastBlockInLoop();

            const blockType = node.blockType;
            if (blockType === BlockType.COMMAND || blockType === BlockType.HAT) {
                this.source += `${this.generateCompatibilityLayerCall(node, isLastInLoop)};\n`;
            } else if (blockType === BlockType.CONDITIONAL || blockType === BlockType.LOOP) {
                const branchVariable = this.localVariables.next();
                const label = "compatLoopLabel" + branchVariable;
                this.source += `const ${branchVariable} = createBranchInfo(${blockType === BlockType.LOOP});\n`;
                this.source += `${label}: while (${branchVariable}.branch = +(${this.generateCompatibilityLayerCall(node, false, branchVariable)})) {\n`;
                this.source += `switch (${branchVariable}.branch) {\n`;
                this.compatBranchInfo = { node, branchVar: branchVariable, label };
                for (let i = 0; i < node.substacks.length; i++) {
                    this.source += `case ${i + 1}: {\n`;
                    this.descendStack(node.substacks[i], new Frame(false));
                    this.source += `break;\n`;
                    this.source += `}\n`; // close case
                }
                this.source += '}\n'; // close switch
                this.source += `if (${branchVariable}.onEnd[0]) yield ${branchVariable}.onEnd.shift()(${branchVariable});\n`;
                this.source += `if (!${branchVariable}.isLoop) break;\n`;
                this.yieldLoop();
                this.source += '}\n'; // close while
                this.compatBranchInfo = undefined;
            } else {
                throw new Error(`Unknown block type: ${blockType}`);
            }

            if (isLastInLoop) {
                this.source += 'if (hasResumedFromPromise) {hasResumedFromPromise = false;continue;}\n';
            }
            break;
        }
        case 'procedures.set':
            const val = this.descendInput(node.val);
            const i = node.param.index;
            if (i !== undefined) this.source += `p${i} = ${val.asSafe()};\n`;
            break;
        case 'control.createClone':
            this.source += `runtime.ext_scratch3_control._createClone(${this.descendInput(node.target).asString()}, target);\n`;
            break;
        case 'control.deleteClone':
            this.source += 'if (!target.isOriginal) {\n';
            this.source += '  runtime.disposeTarget(target);\n';
            this.source += '  runtime.stopForTarget(target);\n';
            this.retire();
            this.source += '}\n';
            break;
        case 'control.for': {
            this.resetVariableInputs();
            const index = this.localVariables.next();
            this.source += `var ${index} = 0; `;
            this.source += `while (${index} < ${this.descendInput(node.count).asNumber()}) { `;
            this.source += `${index}++; `;
            this.source += `${this.referenceVariable(node.variable)}.value = ${index};\n`;
            this.descendStack(node.do, new Frame(true, 'control.for'));
            this.yieldLoop();
            this.source += '}\n';
            break;
        }
        case 'control.switch':
            this.source += `switch (${this.descendInput(node.test).asString()}) {\n`;
            this.descendStack(node.conditions, new Frame(false, 'control.switch'));
            // only add the else branch if it won't be empty
            // this makes scripts have a bit less useless noise in them
            if (node.default.length) {
                this.source += `default:\n`;
                this.descendStack(node.default, new Frame(false, 'control.switch'));
            }
            this.source += `}\n`;
            break;
        case 'control.case':
            if (this.currentFrame.parent !== 'control.switch') {
                this.source += `throw 'All "case" blocks must be inside of a "switch" block.';\n`;
                break;
            }
            this.source += `case ${this.descendInput(node.condition).asString()}:\n`;
            if (!node.runsNext){
                const frame = new Frame(false, 'control.case');
                frame.assignData({
                    containedByCase: true
                });
                this.descendStack(node.code, frame);
                this.source += `break;\n`;
            }
            break;
        case 'control.allAtOnce': {
            const ooldWarp = this.isWarp;
            this.isWarp = true;
            this.descendStack(node.code, new Frame(false, 'control.allAtOnce'));
            this.isWarp = ooldWarp;
            break;
        }
        case 'control.newScript': {
            const currentBlockId = this.localVariables.next();
            const branchBlock = this.localVariables.next();
            // get block id so we can get branch
            this.source += `var ${currentBlockId} = thread.peekStack();\n`;
            this.source += `var ${branchBlock} = thread.target.blocks.getBranch(${currentBlockId}, 0);\n`;
            // push new thread if we found a branch
            this.source += `if (${branchBlock}) {`;
            this.source += `runtime._pushThread(${branchBlock}, target, {});\n`;
            this.source += `}`;
            break;
        }
        case 'control.exitCase':
            if (!this.currentFrame.importantData.containedByCase) {
                this.source += `throw 'All "exit case" blocks must be inside of a "case" block.';\n`;
                break;
            }
            this.source += `break;\n`;
            break;
        case 'control.exitLoop': {
            const inLoop = this.currentFrame.importantData.containedByLoop;
            if (inLoop) this.source += `break;\n`;
            else {
                // this could be an uncompiled loop block
                if (this.compatBranchInfo) {
                    this.source += `break ${this.compatBranchInfo.label};\n`;
                } else {
                    this.source += `yield* executeInCompatibilityLayer({}, runtime.getOpcodeFunction("control_exitLoop"), false, false, "${node.id}", null);\n`;
                }
            }
            break;
        }
        case 'control.continueLoop': {
            const inLoop = this.currentFrame.importantData.containedByLoop;
            if (inLoop) this.source += `continue;\n`;
            else {
                // this could be an uncompiled loop block
                if (this.compatBranchInfo) {
                    this.source += `continue ${this.compatBranchInfo.label};\n`;
                } else {
                    this.source += `yield* executeInCompatibilityLayer({}, runtime.getOpcodeFunction("control_exitLoop"), false, false, "${node.id}", null);\n`;
                }
            }
            break;
        }
        case 'control.if':
            this.source += `if (${this.descendInput(node.condition).asBoolean()}) {\n`;
            this.descendStack(node.whenTrue, new Frame(false, 'control.if'));
            // only add the else branch if it won't be empty
            // this makes scripts have a bit less useless noise in them
            if (node.whenFalse.length) {
                this.source += `} else {\n`;
                this.descendStack(node.whenFalse, new Frame(false, 'control.if'));
            }
            this.source += `}\n`;
            break;
        case 'control.expandableIf': {
            const branches = node.branches;
            for (let i = 0; i < branches.length; i++) {
                const branch = branches[i];
                const isFirst = i === 0, isLast = i + 1 === branches.length;
                const isElse = branch[0].value === null;

                if (isFirst) this.source += `if `;
                else if (isLast && isElse) this.source += `else `;
                else this.source += `else if `;

                if (branch === null) {
                    if (isLast && isElse) this.source += `{}\n`;
                    else this.source += `(false) {}\n`;
                } else {
                    if (isElse) this.source += `{\n`;
                    else this.source += `(${this.descendInput(branch[0]).asBoolean()}) {\n`;

                    if (branch[1][0]) this.descendStack(branch[1], new Frame(false, 'control.if'));
                    this.source += `} `;
                }
            }
            break;
        }
        case 'control.trycatch':
            this.source += `try {\n`;
            this.descendStack(node.try, new Frame(false, 'control.trycatch'));
            const error = this.localVariables.next();
            this.source += `} catch (${error}) {\n`;
            this.source += `runtime.ext_scratch3_control._error = String(${error});\n`;
            this.descendStack(node.catch, new Frame(false, 'control.trycatch'));
            this.source += `}\n`;
            break;
        case 'control.throwError': {
            const error = this.descendInput(node.error).asString();
            this.source += `throw ${error};\n`;
            break;
        }
        case 'control.repeat': {
            const i = this.localVariables.next();
            this.source += `for (var ${i} = ${this.descendInput(node.times).asNumber()}; ${i} >= 0.5; ${i}--) {\n`;
            this.descendStack(node.do, new Frame(true, 'control.repeat'));
            this.yieldLoop();
            this.source += `}\n`;
            break;
        }
        case 'control.repeatForSeconds': {
            const duration = this.localVariables.next();
            this.source += `thread.timer2 = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.times).asNumber()});\n`;
            this.requestRedraw();
            this.source += `while (thread.timer2.timeElapsed() < ${duration}) {\n`;
            this.descendStack(node.do, new Frame(true, 'control.repeatForSeconds'));
            this.yieldLoop();
            this.source += `}\n`;
            this.source += 'thread.timer2 = null;\n';
            break;
        }
        case 'control.stopAll':
            this.source += 'runtime.stopAll();\n';
            this.retire();
            break;
        case 'control.stopOthers':
            this.source += 'runtime.stopForTarget(target, thread);\n';
            break;
        case 'control.stopScript':
            if (this.isProcedure) {
                this.source += 'return;\n';
            } else {
                this.retire();
            }
            break;
        case 'control.wait': {
            const duration = this.localVariables.next();
            this.source += `thread.timer = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.seconds).asNumber()});\n`;
            this.requestRedraw();
            // always yield at least once, even on 0 second durations
            this.yieldNotWarp();
            this.source += `while (thread.timer.timeElapsed() < ${duration}) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += '}\n';
            this.source += 'thread.timer = null;\n';
            break;
        }
        case 'control.waitTick': {
            this.yieldNotWarp();
            break;
        }
        case 'control.waitUntil': {
            this.resetVariableInputs();
            this.source += `while (!${this.descendInput(node.condition).asBoolean()}) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += `}\n`;
            break;
        }
        case 'control.waitOrUntil': {
            const duration = this.localVariables.next();
            const condition = this.descendInput(node.condition).asBoolean();
            this.source += `thread.timer = timer();\n`;
            this.source += `var ${duration} = Math.max(0, 1000 * ${this.descendInput(node.seconds).asNumber()});\n`;
            this.requestRedraw();
            // always yield at least once, even on 0 second durations
            this.yieldNotWarp();
            this.source += `while ((thread.timer.timeElapsed() < ${duration}) && (!(${condition}))) {\n`;
            this.yieldStuckOrNotWarp();
            this.source += '}\n';
            this.source += 'thread.timer = null;\n';
            break;
        }
        case 'control.while':
            this.resetVariableInputs();
            this.source += `while (${this.descendInput(node.condition).asBoolean()}) {\n`;
            this.descendStack(node.do, new Frame(true, 'control.while'));
            if (node.warpTimer) {
                this.yieldStuckOrNotWarp();
            } else {
                this.yieldLoop();
            }
            this.source += `}\n`;
            break;
        case 'control.fromTo': {
            this.resetVariableInputs();
            const from = this.localVariables.next();
            const to = this.localVariables.next();
            const index = this.localVariables.next();
            this.source += `var ${from} = ${this.descendInput(node.from).asNumber()};\n`;
            this.source += `var ${to} = ${this.descendInput(node.to).asNumber()};\n`;
            this.source += `for (var ${index} = ${from}; ${index} <= ${to}; ${index}++) {\n`;
            this.source += `let _pmControlFromToIndex = ${index};\n`;
            this.descendStack(node.do, new Frame(true, 'control.fromTo'));
            this.yieldLoop();
            this.source += '}\n';
            break;
        }
        case 'control.runAsSprite':
            const stage = 'runtime.getTargetForStage()';
            const sprite = this.descendInput(node.sprite).asString();
            const isStage = sprite === '"_stage_"';

            // save the original target
            const originalTarget = this.localVariables.next();
            this.source += `const ${originalTarget} = target;\n`;
            // pm: unknown behavior may appear so lets use try catch
            this.source += `try {\n`;
            // set target
            const evaluatedName = this.localVariables.next()
            this.source += `var ${evaluatedName} = ${sprite};\n`
            const targetSprite = isStage ? stage : `runtime.getSpriteTargetByName(${evaluatedName}) || runtime.getTargetById(${evaluatedName})`;
            this.source += `const target = (${targetSprite});\n`;
            // only run if target is found
            this.source += `if (target) {\n`;
            // set thread target (for compat blocks)
            this.source += `thread.target = target;\n`;
            // tell thread we are spoofing (for custom blocks)
            // we could already be spoofing tho so save that first
            const alreadySpoofing = this.localVariables.next();
            const alreadySpoofTarget = this.localVariables.next();
            this.source += `var ${alreadySpoofing} = thread.spoofing;\n`;
            this.source += `var ${alreadySpoofTarget} = thread.spoofTarget;\n`;

            this.source += `thread.spoofing = true;\n`;
            this.source += `thread.spoofTarget = target;\n`;

            // descendle stackle
            this.descendStack(node.substack, new Frame(false, 'control.runAsSprite'));

            // undo thread target & spoofing change
            this.source += `thread.target = ${originalTarget};\n`;
            this.source += `thread.spoofing = ${alreadySpoofing};\n`;
            this.source += `thread.spoofTarget = ${alreadySpoofTarget};\n`;

            this.source += `}\n`;
            this.source += `} catch (e) {\nconsole.log('as sprite function failed;', e);\n`;

            // same as last undo
            this.source += `thread.target = ${originalTarget};\n`;
            this.source += `thread.spoofing = ${alreadySpoofing};\n`;
            this.source += `thread.spoofTarget = ${alreadySpoofTarget};\n`;

            this.source += `}\n`;
            break;
        case 'counter.clear':
            this.source += 'runtime.ext_scratch3_control._counter = 0;\n';
            break;
        case 'counter.increment':
            this.source += 'runtime.ext_scratch3_control._counter++;\n';
            break;
        case 'counter.decrement':
            this.source += 'runtime.ext_scratch3_control._counter--;\n';
            break;
        case 'counter.set':
            this.source += `runtime.ext_scratch3_control._counter = ${this.descendInput(node.value).asNumber()};\n`;
            break;
        case 'hat.edge':
            this.isInHat = true;
            this.source += '{\n';
            // For exact Scratch parity, evaluate the input before checking old edge state.
            // Can matter if the input is not instantly evaluated.
            this.source += `const resolvedValue = ${this.descendInput(node.condition).asBoolean()};\n`;
            this.source += `const id = "${sanitize(node.id)}";\n`;
            this.source += 'const hasOldEdgeValue = target.hasEdgeActivatedValue(id);\n';
            this.source += `const oldEdgeValue = target.updateEdgeActivatedValue(id, resolvedValue);\n`;
            this.source += `const edgeWasActivated = hasOldEdgeValue ? (!oldEdgeValue && resolvedValue) : resolvedValue;\n`;
            this.source += `if (!edgeWasActivated) {\n`;
            this.retire();
            this.source += '}\n';
            this.source += 'yield;\n';
            this.source += '}\n';
            this.isInHat = false;
            break;
        case 'hat.predicate':
            this.isInHat = true;
            this.source += `if (!${this.descendInput(node.condition).asBoolean()}) {\n`;
            this.retire();
            this.source += '}\n';
            this.source += 'yield;\n';
            this.isInHat = false;
            break;
        case 'event.broadcast': {
            const msgName = this.descendInput(node.broadcast).asString();
            this.source += `var broadcastVar = runtime.getTargetForStage().lookupBroadcastMsg("", ${msgName});\n`;
            this.source += `if (broadcastVar) broadcastVar.isSent = true;\n`;
            this.source += `startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${msgName} });\n`;
            this.resetVariableInputs();
            break;
        }
        case 'event.broadcastAndWait': {
            const msgName = this.descendInput(node.broadcast).asString();
            this.source += `var broadcastVar = runtime.getTargetForStage().lookupBroadcastMsg("", ${msgName});\n`;
            this.source += `if (broadcastVar) broadcastVar.isSent = true;\n`;
            this.source += `yield* waitThreads(startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: ${msgName} }));\n`;
            this.yielded();
            break;
        }
        case 'list.forEach': {
            const list = this.listItems(node.list);
            const set = this.descendVariable(node.variable);
            const to = node.num ? 'index + 1' : 'value';
            this.source +=
            `for (let index = 0; index < ${list}.length; index++) {` +
                `const value = ${list}[index];\n` +
                `${set.source} = ${to};\n`;
            this.descendStack(node.do, new Frame(true, 'list.forEach'));
            this.source += `};\n`;
            break;
        }
        case 'list.add': {
            const list = this.referenceVariable(node.list);
            this.source += `${this.listItems(node.list)}.push(${this.descendInput(node.item).asSafe()});\n`;
            this.source += `${list}._monitorUpToDate = false;\n`;
            break;
        }
        case 'list.delete': {
            const list = this.referenceVariable(node.list);
            const index = this.descendInput(node.index);
            if (index instanceof ConstantInput) {
                if (index.constantValue === 'last') {
                    this.source += `${this.listItems(node.list)}.pop();\n`;
                    this.source += this.listChanged(node.list);
                    this.source += `${list}._monitorUpToDate = false;\n`;
                    break;
                }
                if (+index.constantValue === 1) {
                    this.source += `${this.listItems(node.list)}.shift();\n`;
                    this.source += this.listChanged(node.list);
                    this.source += `${list}._monitorUpToDate = false;\n`;
                    break;
                }
                // do not need a special case for all as that is handled in IR generation (list.deleteAll)
            }
            this.source += `listDelete(${list}, ${index.asUnknown()});\n`;
            break;
        }
        case 'list.deleteAll':
            this.source += this.listSetItems(node.list, '[]');
            break;
        case 'list.shift': {
            const list = this.referenceVariable(node.list);
            const index = this.descendInput(node.index).asNumber();
            if (index <= 0) break;
            this.source += this.listSetItems(node.list, `${this.listItems(node.list)}.slice(${index})`);
            this.source += `${list}._monitorUpToDate = false;\n`;
            break;
        }
        case 'list.hide':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case 'list.insert': {
            const list = this.referenceVariable(node.list);
            const index = this.descendInput(node.index);
            const item = this.descendInput(node.item);
            if (index instanceof ConstantInput && +index.constantValue === 1) {
                this.source += `${this.listItems(node.list)}.unshift(${item.asSafe()});\n`;
                this.source += this.listChanged(node.list);
                this.source += `${list}._monitorUpToDate = false;\n`;
                break;
            }
            this.source += `listInsert(${list}, ${index.asUnknown()}, ${item.asSafe()});\n`;
            break;
        }
        case 'list.replace':
            this.source += `listReplace(${this.referenceVariable(node.list)}, ${this.descendInput(node.index).asUnknown()}, ${this.descendInput(node.item).asSafe()});\n`;
            break;
        case 'list.show':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.list.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;

        case 'list.filter':
            const filterOutput = this.localVariables.next();
            this.source += `var ${filterOutput} = [];\n`
            const cloneList = this.localVariables.next();
            this.source += `var ${cloneList} = [...${this.listItems(node.list)}];\n`
            this.source += `thread._listFilterItem ??= [];\n`;
            this.source += `thread._listFilterIndex ??= [];\n`;
            this.source += `thread._listFilterItem.push("");\n`;
            this.source += `thread._listFilterIndex.push(0);\n`;
            let lastIndex = `thread._listFilterIndex[thread._listFilterIndex.length-1]`
            let lastItem = `thread._listFilterItem[thread._listFilterItem.length-1]`
            this.source += `for (${lastIndex} = 1; ${lastIndex} <= ${cloneList}.length; ${lastIndex}++) {\n`
            this.source += `    ${lastItem} = ${cloneList}[${lastIndex} - 1];\n`;
            this.source += `    if (${this.descendInput(node.bool).asBoolean()}) ${filterOutput}.push(${lastItem});\n`;
            this.source += `};\n`;
            this.source += this.listSetItems(node.list, filterOutput);
            this.source += `thread._listFilterItem.pop();\n`;
            this.source += `thread._listFilterIndex.pop();\n`;
            break;

        case 'looks.backwardLayers':
            if (!this.target.isStage) {
                this.source += `target.goBackwardLayers(${this.descendInput(node.layers).asNumber()});\n`;
            }
            break;
        case 'looks.clearEffects':
            this.source += 'target.clearEffects();\nruntime.ext_scratch3_looks._resetBubbles(target);\n';
            break;
        case 'looks.changeEffect':
            if (this.target.effects.hasOwnProperty(node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value).asNumber()} + target.effects["${sanitize(node.effect)}"]));\n`;
            }
            break;
        case 'looks.changeSize':
            this.source += `target.setSize(target.size + ${this.descendInput(node.size).asNumber()});\n`;
            break;
        case 'looks.forwardLayers':
            if (!this.target.isStage) {
                this.source += `target.goForwardLayers(${this.descendInput(node.layers).asNumber()});\n`;
            }
            break;
        case 'looks.goToBack':
            if (!this.target.isStage) {
                this.source += 'target.goToBack();\n';
            }
            break;
        case 'looks.goToFront':
            if (!this.target.isStage) {
                this.source += 'target.goToFront();\n';
            }
            break;
        case 'looks.targetFront':
            if (!this.target.isStage) {
                const name = this.descendInput(node.layers).asString();
                const objRefTarg = this.localVariables.next();
                const targetLayer = this.localVariables.next();
                const myLayer = this.localVariables.next();

                this.source += `const ${objRefTarg} = runtime.getSpriteTargetByName(${name});\n`;
                this.source += `if (${objRefTarg}) {\n`;
                this.source += `const ${myLayer} = target.getLayerOrder();\n`;
                this.source += `const ${targetLayer} = ${objRefTarg}.getLayerOrder();\n`;
                this.source += `if (${targetLayer} > ${myLayer}) target.goForwardLayers(${targetLayer} - ${myLayer});\n`;
                this.source += `else target.goForwardLayers(${targetLayer} - ${myLayer} + 1);\n`;
                this.source += `}\n`;
            }
            break;
        case 'looks.targetBack':
            if (!this.target.isStage) {
                const name = this.descendInput(node.layers).asString();
                const objRefTarg = this.localVariables.next();
                const targetLayer = this.localVariables.next();
                const myLayer = this.localVariables.next();

                this.source += `const ${objRefTarg} = runtime.getSpriteTargetByName(${name});\n`;
                this.source += `if (${objRefTarg}) {\n`;
                this.source += `const ${myLayer} = target.getLayerOrder();\n`;
                this.source += `const ${targetLayer} = ${objRefTarg}.getLayerOrder();\n`;
                this.source += `if (${targetLayer} > ${myLayer}) target.goForwardLayers(${targetLayer} - ${myLayer} - 1);\n`;
                this.source += `else target.goForwardLayers(${targetLayer} - ${myLayer});\n`;
                this.source += `}\n`;
            }
            break;
        case 'looks.hide':
            this.source += 'target.setVisible(false);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case 'looks.nextBackdrop':
            this.source += 'runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume + 1, true);\n';
            break;
        case 'looks.nextCostume':
            this.source += 'target.setCostume(target.currentCostume + 1);\n';
            break;
        case 'looks.setEffect':
            if (this.target.effects.hasOwnProperty(node.effect)) {
                this.source += `target.setEffect("${sanitize(node.effect)}", runtime.ext_scratch3_looks.clampEffect("${sanitize(node.effect)}", ${this.descendInput(node.value).asNumber()}));\n`;
            }
            break;
        case 'looks.setSize':
            this.source += `target.setSize(${this.descendInput(node.size).asNumber()});\n`;
            break;
        case 'looks.setFont':
            this.source += `runtime.ext_scratch3_looks.setFont({ font: ${this.descendInput(node.font).asString()}, size: ${this.descendInput(node.size).asNumber()} }, { target: target });\n`;
            break;
        case 'looks.setColor':
            this.source += `runtime.ext_scratch3_looks.setColor({ prop: "${sanitize(node.prop)}", color: ${this.descendInput(node.color).asColor()} }, { target: target });\n`;
            break;
        case 'looks.setTintColor':
            this.source += `runtime.ext_scratch3_looks.setTintColor({ color: ${this.descendInput(node.color).asColor()} }, { target: target });\n`;
            break;
        case 'looks.setShape':
            this.source += `runtime.ext_scratch3_looks.setShape({ prop: "${sanitize(node.prop)}", color: ${this.descendInput(node.value).asColor()} }, { target: target });\n`;
            break;
        case 'looks.show':
            this.source += 'target.setVisible(true);\n';
            this.source += 'runtime.ext_scratch3_looks._renderBubble(target);\n';
            break;
        case 'looks.switchBackdrop':
            this.source += `runtime.ext_scratch3_looks._setBackdrop(stage, ${this.descendInput(node.backdrop).asSafe()});\n`;
            break;
        case 'looks.switchCostume':
            this.source += `runtime.ext_scratch3_looks._setCostume(target, ${this.descendInput(node.costume).asSafe()});\n`;
            break;

        case 'motion.changeX':
            this.source += `target.setXY(target.x + ${this.descendInput(node.dx).asNumber()}, target.y);\n`;
            break;
        case 'motion.changeY':
            this.source += `target.setXY(target.x, target.y + ${this.descendInput(node.dy).asNumber()});\n`;
            break;
        case 'motion.ifOnEdgeBounce':
            this.source += `runtime.ext_scratch3_motion._ifOnEdgeBounce(target);\n`;
            break;
        case 'motion.setDirection':
            this.source += `target.setDirection(${this.descendInput(node.direction).asNumber()});\n`;
            break;
        case 'motion.setRotationStyle':
            this.source += `target.setRotationStyle("${sanitize(node.style)}");\n`;
            break;
        case 'motion.setX': // fallthrough
        case 'motion.setY': // fallthrough
        case 'motion.setXY': {
            this.descendedIntoModulo = false;
            const x = 'x' in node ? this.descendInput(node.x).asNumber() : 'target.x';
            const y = 'y' in node ? this.descendInput(node.y).asNumber() : 'target.y';
            this.source += `target.setXY(${x}, ${y});\n`;
            break;
        }
        case 'motion.step':
            this.source += `runtime.ext_scratch3_motion._moveSteps(${this.descendInput(node.steps).asNumber()}, target);\n`;
            break;

        case 'noop':
            console.warn('unexpected noop');
            break;

        case 'pen.clear':
            this.source += `${PEN_EXT}.clear();\n`;
            break;
        case 'pen.down':
            this.source += `${PEN_EXT}._penDown(target);\n`;
            break;
        case 'pen.changeParam':
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param).asString()}, ${this.descendInput(node.value).asNumber()}, ${PEN_STATE}, true);\n`;
            break;
        case 'pen.changeSize':
            this.source += `${PEN_EXT}._changePenSizeBy(${this.descendInput(node.size).asNumber()}, target);\n`;
            break;
        case 'pen.legacyChangeHue':
            this.source += `${PEN_EXT}._changePenHueBy(${this.descendInput(node.hue).asNumber()}, target);\n`;
            break;
        case 'pen.legacyChangeShade':
            this.source += `${PEN_EXT}._changePenShadeBy(${this.descendInput(node.shade).asNumber()}, target);\n`;
            break;
        case 'pen.legacySetHue':
            this.source += `${PEN_EXT}._setPenHueToNumber(${this.descendInput(node.hue).asNumber()}, target);\n`;
            break;
        case 'pen.legacySetShade':
            this.source += `${PEN_EXT}._setPenShadeToNumber(${this.descendInput(node.shade).asNumber()}, target);\n`;
            break;
        case 'pen.setColor':
            this.source += `${PEN_EXT}._setPenColorToColor(${this.descendInput(node.color).asColor()}, target);\n`;
            break;
        case 'pen.setParam':
            this.source += `${PEN_EXT}._setOrChangeColorParam(${this.descendInput(node.param).asString()}, ${this.descendInput(node.value).asNumber()}, ${PEN_STATE}, false);\n`;
            break;
        case 'pen.setSize':
            this.source += `${PEN_EXT}._setPenSizeTo(${this.descendInput(node.size).asNumber()}, target);\n`;
            break;
        case 'pen.stamp':
            this.source += `${PEN_EXT}._stamp(target);\n`;
            break;
        case 'pen.up':
            this.source += `${PEN_EXT}._penUp(target);\n`;
            break;

        case 'procedures.return':
            if (node.isDefineClicked) this.retire();
            else this.source += `return ${this.descendInput(node.return).asUnknown()};\n`;
            break;
        case 'procedures.call': {
            const procedureCode = node.code;
            const procedureVariant = node.variant;
            // Do not generate any code for empty procedures.
            const procedureData = this.ir.procedures[procedureVariant];
            if (procedureData.stack === null) {
                break;
            }
            if (!this.isWarp && procedureCode === this.script.procedureCode) {
                // Direct recursion yields.
                this.yieldNotWarp();
            }
            let outputVariable = this.localVariables.next();
            this.source += `let ${outputVariable} = `;
            if (procedureData.yields) {
                this.source += 'yield* ';
                if (!this.script.yields) {
                    throw new Error('Script uses yielding procedure but is not marked as yielding.');
                }
            }
            this.source += `thread.procedures["${sanitize(procedureVariant)}"](`;
            // Only include arguments if the procedure accepts any.
            if (procedureData.arguments.length) {
                const args = [];
                for (const input of node.arguments) {
                    if (input instanceof Array) {
                        //is a stack input
                        const temp = this.source;
                        this.source = "function*(thread, target, runtime, stage) {"
                        const temp2 = this.isWarp;
                        this.isWarp = procedureData.isWarp;
                        this.descendStack(input, new Frame(false, undefined, true));
                        this.isWarp = temp2;
                        this.source += "}";
                        args.push(this.source);
                        this.source = temp;
                    } else {
                        args.push(this.descendInput(input).asSafe());
                    }
                }
                this.source += args.join(',');
            }
            this.source += `);\n`;
            const thisProcedureData = this.ir.procedures[this.script.procedureVariant];
            if (thisProcedureData && !thisProcedureData.returns) {
                this.source += `if (${outputVariable}) { return ${outputVariable}; };\n`
            }

            if (node.type === 'hat') {
                throw new Error('Custom hat blocks are not supported');
            }
            // Variable input types may have changes after a procedure call.
            this.resetVariableInputs();
            break;
        }

        case 'timer.reset':
            this.source += 'runtime.ioDevices.clock.resetProjectTimer();\n';
            break;

        case 'tw.debugger':
            this.source += 'debugger;\n';
            break;

        case 'var.hide':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: false }, runtime);\n`;
            break;
        case 'var.set': {
            const variable = this.descendVariable(node.variable);
            const value = this.descendInput(node.value);
            variable.setInput(value);
            this.source += `${variable.source} = ${value.asSafe()};\n`;
            if (node.variable.isCloud) {
                this.source += `runtime.ioDevices.cloud.requestUpdateVariable("${sanitize(node.variable.name)}", ${variable.source});\n`;
            }
            break;
        }
        case 'var.show':
            this.source += `runtime.monitorBlocks.changeBlock({ id: "${sanitize(node.variable.id)}", element: "checkbox", value: true }, runtime);\n`;
            break;

        case 'visualReport': {
            const value = this.localVariables.next();
            this.source += `const ${value} = ${this.descendInput(node.input, true).asUnknown()};\n`;
            // blocks like legacy no-ops can return a literal `undefined`
            this.source += `if (${value} !== undefined) runtime.visualReport("${sanitize(this.script.topBlockId)}", ${value});\n`;
            break;
        }
        case 'sensing.set.of': {
            const object = this.descendInput(node.object);
            const value = this.descendInput(node.value);
            const property = node.property;
            const isStage = node.object.value === '_stage_';
            const objectReference = this.localVariables.next();
            this.source += `var ${objectReference} = ${isStage ? 'stage' : `runtime.getSpriteTargetByName(${object.asString()})`};\n`;

            this.source += `if (${objectReference})`;

            switch (property) {
            case 'volume':
                this.source += `runtime.ext_scratch3_sound._updateVolume(${value.asNumber()}, ${objectReference});\n`;
                break;
            case 'x position':
                // comment
                this.source += `${objectReference}.setXY(${value.asNumber()}, ${objectReference}.y);\n`;
                break;
            case 'y position':
                this.source += `${objectReference}.setXY(${objectReference}.x, ${value.asNumber()});\n`;
                break;
            case 'direction':
                this.source += `${objectReference}.setDirection(${value.asNumber()});\n`;
                break;
            case 'costume':
                const costume = value.type === TYPE_NUMBER
                    ? value.asNumber()
                    : value.asString();
                this.source += `runtime.ext_scratch3_looks._setCostume(${objectReference}, ${costume});\n`;
                break;
            case 'backdrop':
                const backdrop = value.type === TYPE_NUMBER
                    ? value.asNumber()
                    : value.asString();
                this.source += `runtime.ext_scratch3_looks._setBackdrop(${objectReference}, ${backdrop});\n`;
                break;
            case 'size':
                this.source += `${objectReference}.setSize(${value.asNumber()});\n`;
                break;
            default:
                const variableReference = this.localVariables.next();
                this.source += `{\nconst ${variableReference} = ${objectReference} ? ${objectReference}.lookupVariableByNameAndType("${sanitize(property)}", "", true) : "";\n`;
                this.source += `if (${variableReference}) `;
                this.source += `${variableReference}.value = ${value.asUnknown()};\n}\n`;
                break;
            }
            break;
        }

        case 'control.dualBlock':
            this.source += `console.log("dual block works");\n`
            break

        default:
            log.warn(`JS: Unknown stacked block: ${node.kind}`, node);
            throw new Error(`JS: Unknown stacked block: ${node.kind}`);
        }
    }

    /**
     * Compile a Record of input objects into a safe JS string.
     * @param {Record<string, unknown>} inputs The record to decend
     * @returns {string} The stringified result
     */
    descendInputRecord (inputs) {
        let result = '{';
        for (const name of Object.keys(inputs)) {
            const node = inputs[name];
            result += `"${sanitize(name)}":${this.descendInput(node).asSafe()},`;
        }
        result += '}';
        return result;
    }

    resetVariableInputs () {
        this.variableInputs = {};
    }

    descendStack (nodes, frame) {
        // Entering a stack -- all bets are off.
        // TODO: allow if/else to inherit values
        this.resetVariableInputs();
        frame.assignData(this.currentFrame);
        this.pushFrame(frame);

        for (let i = 0; i < nodes.length; i++) {
            frame.isLastBlock = i === nodes.length - 1;
            this.descendStackedBlock(nodes[i]);
        }

        // Leaving a stack -- any assumptions made in the current stack do not apply outside of it
        // TODO: in if/else this might create an extra unused object
        this.resetVariableInputs();
        this.popFrame();
    }

    descendVariable (variable) {
        if (this.variableInputs.hasOwnProperty(variable.id)) {
            return this.variableInputs[variable.id];
        }
        const input = new VariableInput(`${this.referenceVariable(variable)}.value`);
        this.variableInputs[variable.id] = input;
        return input;
    }

    referenceVariable (variable) {
        if (variable.scope === 'target') {
            return this.evaluateOnce(`target.variables["${sanitize(variable.id)}"]`);
        }
        return this.evaluateOnce(`stage.variables["${sanitize(variable.id)}"]`);
    }

    // PMDESKTOP_LISTLOOKUP (section 62): a list's items without marking them as seen by outside code
    // (engine/list-lookup.js). isList is false when a list block points at another kind of variable
    // (broken projects); that keeps the code from before.
    listItems (list) {
        return `${this.referenceVariable(list)}.${list.isList ? '_value' : 'value'}`;
    }

    // After changing a list's array in place in any way other than adding at the end.
    listChanged (list) {
        return list.isList ? `${this.referenceVariable(list)}._lookup = null;\n` : '';
    }

    // Puts a new array made by the script into a list.
    listSetItems (list, array) {
        const reference = this.referenceVariable(list);
        if (!list.isList) return `${reference}.value = ${array};\n`;
        return `${reference}._value = ${array};\n${reference}._exposed = false;\n${reference}._lookup = null;\n`;
    }

    evaluateOnce (source) {
        if (this._setupVariables.hasOwnProperty(source)) {
            return this._setupVariables[source];
        }
        const variable = this._setupVariablesPool.next();
        this._setupVariables[source] = variable;
        return variable;
    }

    retire () {
        // After running retire() (sets thread status and cleans up some unused data), we need to return to the event loop.
        // When in a procedure, return will only send us back to the previous procedure, so instead we yield back to the sequencer.
        // Outside of a procedure, return will correctly bring us back to the sequencer.
        if (this.isProcedure && this.script.yields) {
            this.source += 'retire(); yield;\n';
        } else {
            this.source += 'retire(); return;\n';
        }
    }

    yieldLoop () {
        if (this.warpTimer) {
            this.yieldStuckOrNotWarp();
        } else {
            this.yieldNotWarp();
        }
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled.
     */
    yieldNotWarp () {
        if (!this.isWarp) {
            this.source += 'yield;\n';
            this.yielded();
        }
    }

    /**
     * Write JS to yield the current thread if warp mode is disabled or if the script seems to be stuck.
     */
    yieldStuckOrNotWarp () {
        if (this.isWarp) {
            this.source += 'if (isStuck()) yield;\n';
        } else {
            this.source += 'yield;\n';
        }
        this.yielded();
    }

    yielded () {
        if (!this.script.yields) {
            throw new Error('Script yielded but is not marked as yielding.');
        }
        // Control may have been yielded to another script -- all bets are off.
        this.resetVariableInputs();
    }

    /**
     * Write JS to request a redraw.
     */
    requestRedraw () {
        this.source += 'runtime.requestRedraw();\n';
    }

    safeConstantInput (value) {
        const unsafe = typeof value === 'string' && this.namesOfCostumesAndSounds.has(value);
        return new ConstantInput(value, !unsafe);
    }

    /**
     * Generate a call into the compatibility layer.
     * @param {*} node The "compat" kind node to generate from.
     * @param {boolean} setFlags Whether flags should be set describing how this function was processed.
     * @param {string|null} [frameName] Name of the stack frame variable, if any
     * @param {boolean} visualReport if this is being called to get visual reporter content
     * @returns {string} The JS of the call.
     */
    generateCompatibilityLayerCall (node, setFlags, frameName = null, visualReport) {
        const opcode = node.opcode;

        let result = 'yield* executeInCompatibilityLayer({';

        for (const inputName of Object.keys(node.inputs)) {
            const input = node.inputs[inputName];
            if (inputName.startsWith('substack')) {
                result += `"${sanitize(inputName.toLowerCase())}":(function* () {\n`;
                this.descendStack(input, new Frame(true, opcode));
                result += '}),';
                continue;
            }
            const compiledInput = this.descendInput(input).asSafe();
            result += `"${sanitize(inputName)}":${compiledInput},`;
        }
        for (const fieldName of Object.keys(node.fields)) {
            const field = node.fields[fieldName];
            if (typeof field !== 'string') {
                result += `"${sanitize(fieldName)}":${JSON.stringify(field)},`;
                continue;
            }
            result += `"${sanitize(fieldName)}":"${sanitize(field)}",`;
        }
        result += `"mutation":${JSON.stringify(node.mutation)},`;
        const opcodeFunction = this.evaluateOnce(`runtime.getOpcodeFunction("${sanitize(opcode)}")`);
        result += `}, ${opcodeFunction}, ${this.isWarp}, ${setFlags}, "${sanitize(node.id)}", ${frameName}, ${visualReport})`;

        return result;
    }

    getScriptFactoryName () {
        return factoryNameVariablePool.next();
    }

    getScriptName (yields) {
        let name = yields ? generatorNameVariablePool.next() : functionNameVariablePool.next();
        if (this.isProcedure) {
            const simplifiedProcedureCode = this.script.procedureCode
                .replace(/%[\w]/g, '') // remove arguments
                .replace(/[^a-zA-Z0-9]/g, '_') // remove unsafe
                .substring(0, 20); // keep length reasonable
            name += `_${simplifiedProcedureCode}`;
        }
        return name;
    }

    /**
     * Generate the JS to pass into eval() based on the current state of the compiler.
     * @returns {string} JS to pass into eval()
     */
    createScriptFactory () {
        let script = '';

        // Setup the factory
        script += `(function ${this.getScriptFactoryName()}(thread) { `;
        script += 'let __target = thread.target; ';
        script += 'let target = __target; ';
        script += 'const runtime = __target.runtime; ';
        script += 'const stage = runtime.getTargetForStage();\n';
        for (const varValue of Object.keys(this._setupVariables)) {
            const varName = this._setupVariables[varValue];
            script += `const ${varName} = ${varValue};\n`;
        }

        // Generated script
        script += 'return ';
        if (this.script.yields) {
            script += `function* `;
        } else {
            script += `function `;
        }
        script += this.getScriptName(this.script.yields);
        script += ' (';
        if (this.script.arguments.length) {
            const args = [];
            for (let i = 0; i < this.script.arguments.length; i++) {
                args.push(`p${i}`);
            }
            script += args.join(',');
        }
        script += ') {\n';

        // pm: check if we are spoofing the target
        // ex: as (Sprite) {} block needs to replace the target
        // with a different one

        // create new var with target so we can define target as the current one
        script += `let target = __target;\n`;
        script += `if (thread.spoofing) {\n`;
        script += `target = thread.spoofTarget;\n`;
        script += `};\n`;

        if (!this.isProcedure) {
            script += 'try {\n';
        }

        script += this.source;

        if (!this.isProcedure) {
            script += '} catch (err) {';
            script += `console.log("${sanitize(script)}");\n`;
            script += 'console.error(err);';
            script += `runtime.emit("BLOCK_STACK_ERROR", {`;
            script += `id:"${sanitize(this.script.topBlockId)}",`;
            script += `value:String(err)`;
            script += `});\n`;
            script += '}\n';
            script += 'retire();\n';
        }

        script += '}; })';
        return script;
    }

    /**
     * Compile this script.
     * @returns {Function} The factory function for the script.
     */
    compile () {
        if (this.script.stack) {
            this.descendStack(this.script.stack, new Frame(false));
        }

        const factory = this.createScriptFactory();
        const fn = jsexecute.scopedEval(factory);

        if (this.debug) {
            log.info(`JS: ${this.target.getName()}: compiled ${this.script.procedureCode || 'script'}`, factory);
        }

        if (JSGenerator.testingApparatus) {
            JSGenerator.testingApparatus.report(this, factory);
        }

        return fn;
    }
}

// Test hook used by automated snapshot testing.
JSGenerator.testingApparatus = null;

module.exports = JSGenerator;
