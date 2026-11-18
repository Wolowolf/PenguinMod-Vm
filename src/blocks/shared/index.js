/**
 * Desktop fork (section 291): shared block definitions. What a core block does is written once, as JavaScript
 * source text, and both modes are made from that text:
 * - the interpreter (src/blocks/scratch3_*.js getPrimitives) gets functions made from it once per runtime;
 * - the compiler (jsgen.js) writes the same text into the compiled script with the inputs' JavaScript in place
 *   (inline code, so a compiled script runs exactly what it ran before), and jsexecute.js puts the helpers into
 *   every compiled script that names them.
 * docs/EXTENSION-INTEGRATION.md "Shared block definitions" in the desktop repo has the rules.
 *
 * A definitions file (shared/operators.js, data.js, motion.js, looks.js, sound.js, sensing.js, control.js) exports
 * {helpers, blocks}:
 * - helpers: name -> source of a value (normally an arrow function), or {js, base, extra}: `base` puts it into
 *   every compiled script (jsexecute.js baseRuntime), `extra` holds helpers only it uses (name -> source), written
 *   just before it. A helper reads only its parameters, other helpers, standard JavaScript and `globalState`
 *   (Cast, listLookup, thread.target.runtime): no `runtime`, compiled scripts' helpers cannot see it.
 * - blocks: opcode -> {inputs, js | stack, menu, options, otherwise, lowerCase, list, variable, fields, locals, skip,
 *   command, order, pure}:
 *   `inputs` "NAME:kind NAME:kind" in the block's order, kind n number, s text, b Boolean, r the value as it is
 *   (the interpreter converts with Cast.toNumber / toString / toBoolean; the compiler with its own converters to
 *   the same kind). `js` is an expression (a reporter), `stack` statements ending in a line break (a command).
 *   $NAME is an input's value, each used once; with `list` (the list field's name) also $LIST (the list
 *   variable), $ITEMS (its items), $CHANGED (statements marking the items as changed in place) and $ID (its ID);
 *   with `variable` (the variable field's name) $ID. `runtime` is the runtime. A block with `menu` (a field's
 *   name) has `options` (value -> js) and `otherwise` (js for any other value; `lowerCase` lowers the value
 *   first).
 *   Section 292 (Motion, Looks, Sound): `target` is the sprite or stage running the block, `stage` the stage.
 *   `fields` "NAME NAME:lower": fixed fields, $NAME is the field's text (lowered with `:lower`) as a string, as often
 *   as needed (the compiler writes it as a string literal). `locals` "a b": $a, $b are names of new constants, as
 *   often as needed (the compiler gives fresh names, so two blocks in one script never clash). `skip`: a condition
 *   (fields and `target` only) under which the block does nothing; the interpreter tests it each time, the compiler
 *   when it compiles (jsgen.js then writes nothing, not even the inputs). A command with a menu has `command: true`.
 *   Section 294 (extension blocks, shared/ext-*.js): the opcode is the extension's (`<id>_<method>`) and the
 *   extension's method calls the function made here (`interpreterBlocks(runtime)[opcode](args, util)`), so the
 *   interpreter converts once more what the extension manager already converted (the same value). `menu` may name
 *   several menus ("rd CS"; the option is their values joined by a space). Kind `c`, `order` and `pure`:
 *   shared/ext-pure.js.
 */
const Cast = require('../../util/cast');
const listLookup = require('../../engine/list-lookup');

const FILES = [require('./operators'), require('./data'), require('./motion'), require('./looks'), require('./sound'),
    require('./sensing'), require('./control'), require('./ext-expansions'), require('./ext-pure')];

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
const fieldsOf = definition => inputsOf({inputs: definition.fields});
const localsOf = definition => (definition.locals ? definition.locals.split(' ') : []);

const templatesOf = definition => {
    if (!definition.menu) return [definition.js || definition.stack];
    return Object.keys(definition.options).map(key => definition.options[key]).concat(definition.otherwise);
};

// Each input once (compiled code works it out where it stands), nothing unknown
for (const opcode of Object.keys(blocks)) {
    const definition = blocks[opcode];
    const names = inputsOf(definition).map(input => input.name);
    const free = fieldsOf(definition).map(field => field.name).concat(localsOf(definition));
    for (const name of free) {
        if (names.indexOf(name) !== -1) throw new Error(`shared block ${opcode}: $${name} is an input and a field or local`);
    }
    for (const template of templatesOf(definition).concat(definition.skip ? [definition.skip] : [])) {
        const used = [];
        template.replace(PLACEHOLDER, (match, name) => {
            if (LIST_PLACEHOLDERS.indexOf(name) !== -1 && (definition.list || (definition.variable && name === 'ID'))) return match;
            if (free.indexOf(name) !== -1) return match;
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
 * @param {*} value The menu field's value (section 294: an array of the values of several menus).
 * @returns {string|null} The option of the block's menu this value picks, or null for `otherwise`.
 */
const option = (opcode, value) => {
    const definition = blocks[opcode];
    let key = Array.isArray(value) ? value.map(Cast.toString).join(' ') : Cast.toString(value);
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
    let body = definition.list ? `const list = util.target.lookupOrCreateList(args.${field}.id, args.${field}.name);\n` : '';
    // Section 292: the sprite, the stage, fields and locals
    const all = templatesOf(definition).concat(definition.skip || '').join('\n');
    if (/(^|[^.\w$])target\b/.test(all)) body += 'const target = util.target;\n';
    if (/(^|[^.\w$])stage\b/.test(all)) body += 'const stage = runtime.getTargetForStage();\n';
    for (const {name, kind} of fieldsOf(definition)) {
        values[name] = `field_${name}`;
        body += `const field_${name} = Cast.toString(args.${name})${kind === 'lower' ? '.toLowerCase()' : ''};\n`;
    }
    for (const name of localsOf(definition)) values[name] = `local_${name}`;
    const fill = template => template.replace(PLACEHOLDER, (match, name) => values[name]);
    if (definition.skip) body += `if (${fill(definition.skip)}) return;\n`;
    // (each menu option in its own braces, so its constants and a command's end stay its own)
    const write = template => (definition.stack || definition.command ? `{\n${fill(template)}return;\n}` : `return ${fill(template)};`);
    if (definition.menu) {
        // (section 294: several menus give their values joined by a space)
        let menu = definition.menu.split(' ').map(name => `Cast.toString(args.${name})`).join(' + " " + ');
        if (definition.lowerCase) menu = `(${menu}).toLowerCase()`;
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
 * The interpreter's functions of every shared block, made from the definitions once per runtime (each block package
 * asks in its constructor; the first one makes them). Their helpers reach the runtime as compiled scripts' helpers
 * do, through globalState.thread.target.runtime.
 * @param {Runtime} runtime The runtime.
 * @returns {object.<string, Function>} The functions by opcode.
 */
const made = new WeakMap();
const interpreterBlocks = runtime => {
    // (unit tests make block packages without a runtime)
    if (typeof runtime !== 'object' || runtime === null) return makeInterpreterBlocks(runtime);
    if (made.has(runtime)) return made.get(runtime);
    const result = makeInterpreterBlocks(runtime);
    made.set(runtime, result);
    return result;
};
const makeInterpreterBlocks = runtime => {
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
