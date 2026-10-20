// Desktop fork (docs/EXTENSION-ROADMAP.md step 2): checks src/extension-support/block-inventory.json against the extensions.
// - Every block of an inventoried built-in extension is in the inventory, and nothing else is.
// - Every block marked "pure" gives the same answer for the same inputs (many tricky inputs, in two different orders),
//   touches neither `util` nor the runtime while it runs (both throw), and answers the recorded type.
// Blocks marked "compiled" only have a stub for the interpreter; their compiler code is checked in step 4.
// Run: node test/unit/desktop_block_inventory.js
const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const Cast = require('../../src/util/cast');
const inventory = require('../../src/extension-support/block-inventory.json');

// Built-in extension modules, read from the extension manager's list (the manager itself needs a page).
const managerFile = path.join(__dirname, '../../src/extension-support/extension-manager.js');
const builtinPaths = {};
for (const m of fs.readFileSync(managerFile, 'utf8').matchAll(/^\s*(\w+): \(\) => require\(["'](\.\.\/extensions\/[^"']+)["']\)/gm)) {
    builtinPaths[m[1]] = path.join(path.dirname(managerFile), m[2]);
}

// Stands in for the runtime (and page parts) while an extension is made: every property and call gives another stand-in.
// (A plain function, not an arrow function: extensions also use `new` on page parts.)
// eslint-disable-next-line prefer-arrow-callback
const anything = () => new Proxy(function () {}, {
    get: (t, key) => {
        if (key === Symbol.toPrimitive) return () => 0;
        if (key === 'then') return undefined;
        return anything();
    },
    apply: () => anything(),
    construct: () => anything()
});
// Blocks marked "page" may check that the page exists: give them a minimal one (nothing a pure block may change).
global.window = {location: new URL('https://studio.penguinmod.com/editor.html'), URLSearchParams, parent: null};
global.vm = anything(); // jwColor shares its colour type on the page's vm
// Only while an extension is made (its constructor may prepare page parts it uses in other blocks).
const CONSTRUCTION_ONLY = ['Audio', 'Image', 'document', 'navigator', 'addEventListener'];
// Timers that constructors start must not keep the test running after the last check.
for (const name of ['setTimeout', 'setInterval']) {
    const original = global[name];
    global[name] = (...args) => {
        const timer = original(...args);
        if (timer && timer.unref) timer.unref();
        return timer;
    };
}
// Pictures the editor's build loads as files.
require.extensions['.svg'] = module => {
    module.exports = '';
};
// While a pure block runs, any use of these throws.
const forbidden = name => new Proxy({}, {
    get: (t, key) => {
        throw new Error(`pure block used ${name}.${String(key)}`);
    },
    set: (t, key) => {
        throw new Error(`pure block changed ${name}.${String(key)}`);
    },
    has: (t, key) => {
        throw new Error(`pure block used ${name}.${String(key)}`);
    }
});

const NUMBERS = [0, -0, 1, -1, 0.5, -2.5, 2, 3, 7, 10, 12, 100, 255, 256, 1e21, -1e21, 1e-7, NaN, Infinity, -Infinity, 2 ** 31, 2 ** 53 + 2];
const STRINGS = ['', ' ', '0', '1', '-1', '12', ' 12 ', '3.5', '1e3', '0x1A', '0b101', 'Infinity', '-Infinity', 'NaN', 'abc', 'ABC def',
    'true', 'false', 'null', 'undefined', '__proto__', 'constructor', 'héllo', '😀🐧', '\n\t', '1:2', '6:4', '0:0', 'a:b:c',
    '#ff0000', '#FFF', '[1,2,3]', '[]', '{"a":1}', 'SGVsbG8=', '<b>&</b>', 'https://example.com/a/b?x=1&y=2#h', 'x'.repeat(300), '١٢'];
const BOOLEANS = [true, false, 'true', 'false', '', 0, 1];

// Inputs on which a block is known never to finish (recorded in its inventory note): left out here.
const LIMITS = {
    'pmOperatorsExpansion.isPrime': {NUM: v => Math.abs(Cast.toNumber(v)) < 1e7},
    'iygPerlin.GetNoiseV2': {OCTAVE: v => !(Number(v) > 16)}
};

const describe = v => {
    if (typeof v === 'number') return Object.is(v, -0) ? 'number -0' : `number ${v}`;
    if (typeof v === 'string') return `string ${JSON.stringify(v)}`;
    if (typeof v === 'function') return 'function';
    if (Array.isArray(v)) return `[${v.map(describe).join(', ')}]`;
    if (v && typeof v === 'object') {
        if (typeof v.then === 'function') return 'PROMISE';
        const name = v.constructor ? v.constructor.name : 'Object';
        return `${name}{${Object.keys(v).sort()
            .map(k => `${k}: ${describe(v[k])}`)
            .join(', ')}}`;
    }
    return String(v);
};
const TYPE_CHECK = {
    number: v => typeof v === 'number',
    string: v => typeof v === 'string',
    boolean: v => typeof v === 'boolean',
    object: v => v !== null && typeof v === 'object' && !Array.isArray(v),
    array: v => Array.isArray(v),
    any: () => true
};

// Small seeded random generator, so every run uses the same inputs.
const random = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

const blockList = info => (info.blocks || []).filter(b => b && typeof b === 'object' && b.opcode &&
    !['label', 'button', 'xml'].includes(b.blockType));

for (const [id, entry] of Object.entries(inventory)) {
    if (!builtinPaths[id]) continue; // gallery extensions are checked once they are built into the VM (step 3)
    test(id, t => {
        let extension;
        let info;
        const saved = CONSTRUCTION_ONLY.map(name => Object.getOwnPropertyDescriptor(global, name));
        try {
            for (const name of CONSTRUCTION_ONLY) Object.defineProperty(global, name, {value: anything(), configurable: true, writable: true});
            const Extension = require(builtinPaths[id]);
            extension = new Extension(anything());
            info = extension.getInfo();
        } catch (e) {
            const pure = Object.values(entry.blocks).filter(b => b.pure && !b.compiled);
            if (pure.length) t.fail(`could not make ${id} outside the page (${e.message}), but it has pure blocks`);
            else t.comment(`${id} needs the page to be made: block list not compared (${e.message})`);
            t.end();
            return;
        } finally {
            CONSTRUCTION_ONLY.forEach((name, i) => {
                if (saved[i]) Object.defineProperty(global, name, saved[i]);
                else delete global[name];
            });
        }
        const blocks = blockList(info);
        t.same(blocks.map(b => b.opcode).sort(), Object.keys(entry.blocks).sort(), 'inventory lists exactly the extension\'s blocks');

        const menus = info.menus || {};
        const poolFor = arg => {
            const menu = arg.menu && menus[arg.menu];
            const items = Array.isArray(menu) ? menu : menu && Array.isArray(menu.items) ? menu.items : null;
            if (items) {
                const values = items.map(x => (x && typeof x === 'object' ? x.value : x));
                // A menu that takes reporters can get anything; a plain menu only its own values.
                return menu.acceptReporters ? [...values, '', 'zzz', 0] : values;
            }
            if (arg.type === 'number' || arg.type === 'angle') return [...NUMBERS, ...STRINGS.slice(0, 16)];
            if (arg.type === 'Boolean') return BOOLEANS;
            return [...STRINGS, ...NUMBERS.slice(0, 12)];
        };

        for (const block of blocks) {
            const recorded = entry.blocks[block.opcode];
            if (!recorded || !recorded.pure) continue;
            if (recorded.compiled) {
                t.comment(`${block.opcode}: compiler code only, checked in step 4`);
                continue;
            }
            const func = typeof block.func === 'string' ? block.func : block.opcode;
            const limits = LIMITS[`${id}.${block.opcode}`] || {};
            const argNames = Object.keys(block.arguments || {});
            const pools = Object.fromEntries(argNames.map(name => [name,
                poolFor(block.arguments[name]).filter(v => !limits[name] || limits[name](v))]));
            // Every value of every input at least once; the other inputs picked at random.
            const pick = random(argNames.length * 7919 + block.opcode.length);
            const combos = [];
            if (argNames.length === 0) combos.push({});
            for (const name of argNames) {
                for (const value of pools[name]) {
                    const args = {};
                    for (const other of argNames) {
                        args[other] = other === name ? value : pools[other][Math.floor(pick() * pools[other].length)];
                    }
                    combos.push(args);
                }
            }
            const run = args => {
                const savedRuntime = extension.runtime;
                if ('runtime' in extension) extension.runtime = forbidden('runtime');
                try {
                    return describe(extension[func]({...args}, forbidden('util')));
                } catch (e) {
                    if (/^pure block (used|changed)/.test(e.message)) throw e;
                    return `throws ${e && e.message}`;
                } finally {
                    if ('runtime' in extension) extension.runtime = savedRuntime;
                }
            };
            let first;
            try {
                first = combos.map(run);
            } catch (e) {
                t.fail(`${block.opcode}: ${e.message}`);
                continue;
            }
            const second = combos.slice().reverse()
                .map(run)
                .reverse();
            const differ = combos.findIndex((c, i) => first[i] !== second[i]);
            t.equal(differ, -1, `${block.opcode}: same answers for the same inputs (${combos.length} input sets, two orders)${
                differ === -1 ? '' : ` — ${JSON.stringify(combos[differ])}: ${first[differ]} / ${second[differ]}`}`);
            const check = TYPE_CHECK[recorded.answer];
            if (check) {
                const wrong = combos.findIndex((c, i) => !first[i].startsWith('throws') &&
                    !check(extension[func]({...c}, forbidden('util'))));
                t.equal(wrong, -1, `${block.opcode}: answers are ${recorded.answer}${
                    wrong === -1 ? '' : ` — ${JSON.stringify(combos[wrong])} gave ${first[wrong]}`}`);
            }
            const throwsCount = first.filter(r => r.startsWith('throws')).length;
            if (throwsCount) t.comment(`${block.opcode}: throws an error for ${throwsCount} of ${combos.length} input sets`);
        }
        t.end();
    });
}
