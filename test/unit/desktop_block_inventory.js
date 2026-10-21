// Desktop fork (docs/EXTENSION-ROADMAP.md step 2): checks src/extension-support/block-inventory.json against the extensions.
// - Every block of an inventoried extension is in the inventory, and nothing else is.
// - Every block marked "pure" gives the same answer for the same inputs (many tricky inputs, in two different orders),
//   touches neither `util` nor the runtime while it runs (both throw), and answers the recorded type.
// Built-in extensions come from src/extensions; gallery extensions ("source" in the inventory) from the desktop local
// test's galleries folder (or DESKTOP_GALLERIES), and are skipped when it is not there; gallery extensions moved into
// the VM (step 3, "source" in src/) from their file in the VM, run the way the gallery runs them.
// Blocks marked "compiled" only have a stub for the interpreter; their compiler code is checked in step 4.
// Run: node test/unit/desktop_block_inventory.js
const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const Cast = require('../../src/util/cast');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');
const TargetType = require('../../src/extension-support/target-type');
const inventory = require('../../src/extension-support/block-inventory.json');

// Built-in extension modules, read from the extension manager's list (the manager itself needs a page).
const managerFile = path.join(__dirname, '../../src/extension-support/extension-manager.js');
const builtinPaths = {};
for (const m of fs.readFileSync(managerFile, 'utf8').matchAll(/^\s*(\w+): \(\) => require\(["'](\.\.\/extensions\/[^"']+)["']\)/gm)) {
    builtinPaths[m[1]] = path.join(path.dirname(managerFile), m[2]);
}
const GALLERIES = process.env.DESKTOP_GALLERIES || path.join(__dirname, '../../../../../../galleries');

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
const realSetTimeout = global.setTimeout;
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
// While a pure block runs, any use of these throws (also recorded, in case the block catches the error).
let pureRunning = false;
let violation = null;
const notWhilePure = what => {
    if (!pureRunning) return;
    violation = violation || `pure block used ${what}`;
    throw new Error(violation);
};
const forbidden = name => new Proxy({}, {
    get: (t, key) => notWhilePure(`${name}.${String(key)}`),
    set: (t, key) => notWhilePure(`${name}.${String(key)} (changed)`),
    has: (t, key) => notWhilePure(`${name}.${String(key)}`)
});
// Gallery extensions get these stand-ins for the runtime and page parts: like anything(), but using one in a pure block throws.
// A stand-in is also a promise that settles with another stand-in (one that is not a promise, so awaiting it ends).
// eslint-disable-next-line prefer-arrow-callback
const guarded = (what, settled) => new Proxy(function () {}, {
    get: (t, key) => {
        notWhilePure(`${what}.${String(key)}`);
        if (key === Symbol.toPrimitive) return () => 0;
        if (key === 'then') {
            if (settled) return undefined;
            return onFulfilled => {
                if (typeof onFulfilled === 'function') {
                    Promise.resolve().then(() => onFulfilled(guarded(`await ${what}`, true)))
                        .catch(() => {});
                }
                return guarded(`${what}.then()`, true);
            };
        }
        return guarded(`${what}.${String(key)}`);
    },
    set: (t, key) => {
        notWhilePure(`${what}.${String(key)} (changed)`);
        return true;
    },
    apply: () => {
        notWhilePure(`${what}()`);
        return guarded(`${what}()`);
    },
    construct: () => {
        notWhilePure(`new ${what}`);
        return guarded(`new ${what}`);
    },
    // Not Function.prototype: libraries that patch "the prototype of a page object" would otherwise patch every object.
    getPrototypeOf: () => Object.create(Object.create(null))
});
// Names a gallery file finds outside itself: its own undeclared globals, the minimal window, Node's globals
// (except the network), and stand-ins for page parts while it loads. A pure block gets an error for page parts, as in Node.
const NOT_GIVEN = new Set(['fetch', 'XMLHttpRequest', 'WebSocket', 'navigator']);
// Node stops the whole process when its createObjectURL gets a stand-in.
class TestURL extends URL {
    static createObjectURL () {
        return 'blob:test';
    }
    static revokeObjectURL () {}
}
const makeScope = scratch => {
    const own = Object.create(null);
    const lookup = key => {
        if (key in own) return own[key];
        if (key === 'URL') return TestURL;
        if (key === 'Scratch') return scratch; // window.Scratch, globalThis.Scratch
        if (key in global && !NOT_GIVEN.has(key)) return global[key];
        if (pureRunning) throw new ReferenceError(`${String(key)} is not defined`);
        return guarded(String(key));
    };
    const windowExtras = Object.create(null);
    const win = new Proxy(windowExtras, {
        get: (t, key) => {
            if (key in t) return t[key];
            if (key in global.window) return global.window[key];
            return lookup(key);
        },
        set: (t, key, value) => {
            t[key] = value;
            return true;
        }
    });
    return new Proxy(own, {
        has: (t, key) => typeof key === 'string' && key !== 'Scratch',
        get: (t, key) => {
            if (key === Symbol.unscopables) return undefined;
            if (['window', 'self', 'globalThis'].includes(key)) return win;
            return lookup(key);
        },
        set: (t, key, value) => {
            t[key] = value;
            return true;
        }
    });
};
const makeScratch = registered => new Proxy({
    extensions: {unsandboxed: true, isPenguinMod: true, register: extension => registered.push(extension)},
    BlockType,
    ArgumentType,
    TargetType,
    Cast,
    translate: Object.assign(text => (text && typeof text === 'object' ? text.default : text), {setup: () => {}, language: 'en'}),
    fetch: () => Promise.reject(new Error('no network in this test')),
    canFetch: () => Promise.resolve(false)
}, {get: (t, key) => (key in t ? t[key] : guarded(`Scratch.${String(key)}`))});
// One run per file, as the gallery loads it (a file may register more than one extension).
// Files that load inside an async function report their errors only as unhandled rejections.
let loadError = null;
process.on('unhandledRejection', reason => {
    loadError = loadError || reason;
});
// A gallery extension moved into the VM ("source" starting with src/) wraps the gallery's code in
// `module.exports = require(<helper>)(function (Scratch, <hidden names>) {…});`: that function is run the way the gallery
// runs its file (with globalThis.Scratch set, as the helper does).
const readGalleryCode = source => {
    if (!source.startsWith('src/')) return fs.readFileSync(path.join(GALLERIES, source), 'utf8');
    const text = fs.readFileSync(path.join(__dirname, '../..', source), 'utf8');
    const start = /^module\.exports = require\([^)]*\)\((function \(Scratch[\w, ]*\) \{)\r?$/m;
    if (!start.test(text) || !/\}\);\s*$/.test(text)) throw new Error(`${source} is not a moved gallery extension`);
    // Bundled libraries are not loaded: their import() gives a stand-in.
    return text.replace(start, '($1').replace(/\}\);\s*$/, '})(Scratch);\n')
        .replace(/\bimport\(\/\* webpackIgnore: true \*\/ /g, '__bundledLibraryImport(');
};
const galleryFiles = new Map();
const loadGalleryFile = source => {
    if (!galleryFiles.has(source)) {
        galleryFiles.set(source, (async () => {
            const registered = [];
            const code = readGalleryCode(source);
            const scratch = makeScratch(registered);
            // eslint-disable-next-line no-new-func
            new Function('Scratch', '__scope', `with (__scope) {\n${code}\n}`)(scratch, makeScope(scratch));
            loadError = null;
            for (let i = 0; i < 1000 && registered.length === 0 && !loadError; i++) {
                await new Promise(resolve => realSetTimeout(resolve, 10));
            }
            if (registered.length === 0 && loadError) throw loadError;
            return registered;
        })());
    }
    return galleryFiles.get(source);
};

const NUMBERS = [0, -0, 1, -1, 0.5, -2.5, 2, 3, 7, 10, 12, 100, 255, 256, 1e21, -1e21, 1e-7, NaN, Infinity, -Infinity, 2 ** 31, 2 ** 53 + 2];
const STRINGS = ['', ' ', '0', '1', '-1', '12', ' 12 ', '3.5', '1e3', '0x1A', '0b101', 'Infinity', '-Infinity', 'NaN', 'abc', 'ABC def',
    'true', 'false', 'null', 'undefined', '__proto__', 'constructor', 'héllo', '😀🐧', '\n\t', '1:2', '6:4', '0:0', 'a:b:c',
    '#ff0000', '#FFF', '[1,2,3]', '[]', '{"a":1}', 'SGVsbG8=', '<b>&</b>', 'https://example.com/a/b?x=1&y=2#h', 'x'.repeat(300), '١٢'];
const BOOLEANS = [true, false, 'true', 'false', '', 0, 1];

// Inputs on which a block is known never to finish (recorded in its inventory note): left out here.
const LIMITS = {
    'pmOperatorsExpansion.isPrime': {NUM: v => Math.abs(Cast.toNumber(v)) < 1e7},
    'iygPerlin.GetNoiseV2': {OCTAVE: v => !(Number(v) > 16)},
    'qxsckbignumber.round': {NUM2: v => !(Number(v) < -1e6)}
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

const checkBlocks = (t, id, entry, extension, info) => {
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
        const callPure = args => {
            const savedRuntime = extension.runtime;
            if ('runtime' in extension) extension.runtime = forbidden('runtime');
            pureRunning = true;
            violation = null;
            try {
                return extension[func]({...args}, forbidden('util'));
            } finally {
                pureRunning = false;
                if ('runtime' in extension) extension.runtime = savedRuntime;
                if (violation) throw new Error(violation); // eslint-disable-line no-unsafe-finally
            }
        };
        const run = args => {
            try {
                return describe(callPure(args));
            } catch (e) {
                if (/^pure block (used|changed)/.test(e.message)) throw e;
                return `throws ${e && e.message}`;
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
            const wrong = combos.findIndex((c, i) => !first[i].startsWith('throws') && !check(callPure(c)));
            t.equal(wrong, -1, `${block.opcode}: answers are ${recorded.answer}${
                wrong === -1 ? '' : ` — ${JSON.stringify(combos[wrong])} gave ${first[wrong]}`}`);
        }
        const throwsCount = first.filter(r => r.startsWith('throws')).length;
        if (throwsCount) t.comment(`${block.opcode}: throws an error for ${throwsCount} of ${combos.length} input sets`);
    }
};

const cannotMake = (t, id, entry, message) => {
    const pure = Object.values(entry.blocks).filter(b => b.pure && !b.compiled);
    if (pure.length) t.fail(`could not make ${id} outside the page (${message}), but it has pure blocks`);
    else t.comment(`${id} needs the page to be made: block list not compared (${message})`);
};

const galleriesThere = fs.existsSync(GALLERIES);
if (!galleriesThere) test('gallery extensions', t => {
    t.comment(`skipped: no galleries folder at ${GALLERIES}`);
    t.end();
});

// DESKTOP_ONLY=<regular expression>: check only the extensions whose ID matches.
const only = process.env.DESKTOP_ONLY ? new RegExp(process.env.DESKTOP_ONLY) : null;
for (const [id, entry] of Object.entries(inventory)) {
    if (only && !only.test(id)) continue;
    if (entry.source) {
        if (!galleriesThere && !entry.source.startsWith('src/')) continue;
        test(id, async t => {
            let extension;
            let info;
            try {
                const registered = await loadGalleryFile(entry.source);
                extension = registered.find(e => e.getInfo().id === id);
                if (!extension) throw new Error(`${entry.source} registered ${registered.length} other extension(s)`);
                info = extension.getInfo();
            } catch (e) {
                cannotMake(t, id, entry, e.message);
                return;
            }
            checkBlocks(t, id, entry, extension, info);
        });
        continue;
    }
    if (!builtinPaths[id]) continue;
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
            cannotMake(t, id, entry, e.message);
            t.end();
            return;
        } finally {
            CONSTRUCTION_ONLY.forEach((name, i) => {
                if (saved[i]) Object.defineProperty(global, name, saved[i]);
                else delete global[name];
            });
        }
        checkBlocks(t, id, entry, extension, info);
        t.end();
    });
}
