/**
 * Desktop fork (section 291): shared block definitions. What a core block does is written once, as JavaScript
 * source text, and both modes are made from that text:
 * - the interpreter (src/blocks/scratch3_*.js getPrimitives) gets functions made from it once per runtime;
 * - the compiler (jsgen.js) writes the same text into the compiled script with the inputs' JavaScript in place
 *   (inline code, so a compiled script runs exactly what it ran before), and jsexecute.js puts the helpers into
 *   every compiled script that names them.
 * docs/EXTENSION-INTEGRATION.md "Shared block definitions" in the desktop repo has the rules.
 *
 * A definitions file (shared/operators.js, shared/data.js) exports {helpers, blocks}:
 * - helpers: name -> source of a value (normally an arrow function), or {js, base, extra}: `base` puts it into
 *   every compiled script (jsexecute.js baseRuntime), `extra` holds helpers only it uses (name -> source), written
 *   just before it. A helper reads only its parameters, other helpers, standard JavaScript and `globalState`
 *   (Cast, listLookup, thread.target.runtime): no `runtime`, compiled scripts' helpers cannot see it.
 * - blocks: opcode -> {inputs, js | stack, menu, options, otherwise, lowerCase, list, variable}:
 *   `inputs` "NAME:kind NAME:kind" in the block's order, kind n number, s text, b Boolean, r the value as it is
 *   (the interpreter converts with Cast.toNumber / toString / toBoolean; the compiler with its own converters to
 *   the same kind). `js` is an expression (a reporter), `stack` statements ending in a line break (a command).
 *   $NAME is an input's value, each used once; with `list` (the list field's name) also $LIST (the list
 *   variable), $ITEMS (its items), $CHANGED (statements marking the items as changed in place) and $ID (its ID);
 *   with `variable` (the variable field's name) $ID. `runtime` is the runtime. A block with `menu` (a field's
 *   name) has `options` (value -> js) and `otherwise` (js for any other value; `lowerCase` lowers the value
 *   first).
 */
const Cast = require('../../util/cast');
const listLookup = require('../../engine/list-lookup');

const FILES = [require('./operators'), require('./data')];

const helpers = {};
const blocks = {};
for (const file of FILES) {
    for (const name of Object.keys(file.helpers)) {
        const value = file.helpers[name];
        helpers[name] = typeof value === 'string' ? {js: value} : value;
    }
    Object.assign(blocks, file.blocks);
}

const PLACEHOLDER = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
const LIST_PLACEHOLDERS = ['LIST', 'ITEMS', 'CHANGED', 'ID'];

const inputsOf = definition => (definition.inputs ? definition.inputs.split(' ').map(entry => {
    const [name, kind] = entry.split(':');
    return {name, kind};
}) : []);

const templatesOf = definition => {
    if (!definition.menu) return [definition.js || definition.stack];
    return Object.keys(definition.options).map(key => definition.options[key]).concat(definition.otherwise);
};

// Each input once (compiled code works it out where it stands), nothing unknown
for (const opcode of Object.keys(blocks)) {
    const definition = blocks[opcode];
    const names = inputsOf(definition).map(input => input.name);
    for (const template of templatesOf(definition)) {
        const used = [];
        template.replace(PLACEHOLDER, (match, name) => {
            if (LIST_PLACEHOLDERS.indexOf(name) !== -1 && (definition.list || (definition.variable && name === 'ID'))) return match;
            if (names.indexOf(name) === -1) throw new Error(`shared block ${opcode}: unknown ${match}`);
            if (used.indexOf(name) !== -1) throw new Error(`shared block ${opcode}: ${match} used twice`);
            used.push(name);
            return match;
        });
    }
}

/**
 * @param {string} name A helper's name.
 * @returns {string} Its source as `const` lines (the ones it alone uses first).
 */
const helperSource = name => {
    const helper = helpers[name];
    let source = '';
    if (helper.extra) {
        for (const extra of Object.keys(helper.extra)) source += `const ${extra} = ${helper.extra[extra]};\n`;
    }
    return `${source}const ${name} = ${helper.js}`;
};

/**
 * @returns {string} The helpers every compiled script gets (jsexecute.js baseRuntime).
 */
const baseSource = () => Object.keys(helpers).filter(name => helpers[name].base)
    .map(name => `${helperSource(name)};\n`)
    .join('');

/**
 * @returns {object.<string, string>} The other helpers' sources by name (jsexecute.js runtimeFunctions).
 */
const helperSources = () => {
    const result = {};
    for (const name of Object.keys(helpers)) {
        if (!helpers[name].base) result[name] = helperSource(name);
    }
    return result;
};

/**
 * @param {string} opcode The block's opcode.
 * @param {*} value The menu field's value.
 * @returns {string|null} The option of the block's menu this value picks, or null for `otherwise`.
 */
const option = (opcode, value) => {
    const definition = blocks[opcode];
    let key = Cast.toString(value);
    if (definition.lowerCase) key = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(definition.options, key) ? key : null;
};

/**
 * The compiler's code of a block: the definition's text with each input's JavaScript in its place.
 * @param {string} opcode The block's opcode.
 * @param {object.<string, string>} values JavaScript by input name (and LIST, ITEMS, CHANGED, ID where used).
 * @param {string|null} [menuOption] With a menu: the option (`option`), null for `otherwise`.
 * @returns {string} The JavaScript.
 */
const inline = (opcode, values, menuOption) => {
    const definition = blocks[opcode];
    let template = definition.js || definition.stack;
    if (definition.menu) template = menuOption === null ? definition.otherwise : definition.options[menuOption];
    return template.replace(PLACEHOLDER, (match, name) => values[name]);
};

/**
 * @param {string} opcode A block without inputs whose definition is a fixed value ("new line").
 * @returns {*} The value.
 */
// eslint-disable-next-line no-new-func
const value = opcode => new Function(`return ${blocks[opcode].js};`)();

const INTERPRETER_CAST ={n: 'Cast.toNumber', s: 'Cast.toString', b: 'Cast.toBoolean'};

/**
 * The interpreter's function of a block, as source text.
 * @param {string} opcode The block's opcode.
 * @returns {string} An arrow function (args, util).
 */
const interpreterSource = opcode => {
    const definition = blocks[opcode];
    const field = definition.list || definition.variable;
    const values = {
        LIST: 'list',
        ITEMS: 'listItems(list)',
        CHANGED: 'listLookup.changed(list);\n',
        ID: field ? `args.${field}.id` : ''
    };
    for (const {name, kind} of inputsOf(definition)) {
        const cast = INTERPRETER_CAST[kind];
        values[name] = cast ? `${cast}(args.${name})` : `args.${name}`;
    }
    const write = template => {
        const source = template.replace(PLACEHOLDER, (match, name) => values[name]);
        return definition.stack ? source : `return ${source};`;
    };
    let body = definition.list ? `const list = util.target.lookupOrCreateList(args.${field}.id, args.${field}.name);\n` : '';
    if (definition.menu) {
        let menu = `Cast.toString(args.${definition.menu})`;
        if (definition.lowerCase) menu += '.toLowerCase()';
        body += `switch (${menu}) {\n`;
        for (const key of Object.keys(definition.options)) {
            body += `case ${JSON.stringify(key)}: ${write(definition.options[key])}\n`;
        }
        body += `}\n${write(definition.otherwise)}`;
    } else {
        body += write(definition.js || definition.stack);
    }
    return `(args, util) => {\n${body}\n}`;
};

/**
 * The interpreter's functions of every shared block, made from the definitions once per runtime (a block package
 * calls this in its constructor). Their helpers reach the runtime as compiled scripts' helpers do, through
 * globalState.thread.target.runtime.
 * @param {Runtime} runtime The runtime.
 * @returns {object.<string, Function>} The functions by opcode.
 */
const interpreterBlocks = runtime => {
    const globalState = {Cast, listLookup, thread: {target: {runtime}}};
    let source = '';
    for (const name of Object.keys(helpers)) source += `${helperSource(name)};\n`;
    source += 'return {\n';
    for (const opcode of Object.keys(blocks)) source += `${opcode}: ${interpreterSource(opcode)},\n`;
    source += '};';
    // eslint-disable-next-line no-new-func
    return new Function('globalState', 'runtime', 'Cast', source)(globalState, runtime, Cast);
};

module.exports = {
    blocks,
    helperSources,
    baseSource,
    option,
    inline,
    value,
    interpreterBlocks
};
