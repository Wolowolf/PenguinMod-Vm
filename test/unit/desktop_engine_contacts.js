// Desktop fork (docs/EXTENSION-INTEGRATION.md "Engine contacts"): lists where each inventoried extension touches what a
// future engine change would have to give it in another way, and checks that src/extension-support/engine-contacts.json
// is exactly that list, so a new contact cannot come in unnoticed (and a removed one is struck off).
// - random: Math.random, crypto.getRandomValues / randomUUID, Cast.toListIndex / MathUtil.inclusiveRandIntWithout
//   called without the runtime (deterministic mode, replays)
// - clock: Date.now, new Date(), performance, timers and animation frames, starting or stopping them (rewind,
//   fixed-step runs); `typeof setTimeout` and the like only ask whether the page has them
//   Not contacts: the runtime's shared entry points for them (section 154: runtime.pmRandom, pmDateNow, pmPerfNow;
//   section 156: pmSetTimeout, pmClearTimeout, pmSetInterval, pmClearInterval, pmRequestAnimationFrame,
//   pmCancelAnimationFrame); --report counts their uses.
// - page: what only the page has (document, window, storage, dialogs, page types and events, navigator's page parts)
//   and the stage canvas or its WebGL context (engine in a worker)
//   Not contacts: the runtime's door to the page (section 159: runtime.pmPage, src/engine/page-door.js); --report
//   counts the uses of each of its functions.
// - internals: members named with "_" that the VM or renderer define, used on something other than `this`, and writes
//   to members of the vm, runtime, renderer, block library or a prototype (engine updates, hooks)
// Found by reading the code, not running it: an extension's main file and the files of its own that it requires. A name
// reached another way (a renamed copy of `Math`, `window['document']`, a runtime kept under another name) is not seen;
// an extension's own "_" member with the same name as an engine one is counted.
// Run: node test/unit/desktop_engine_contacts.js [--write] [--report]
const test = require('tap').test;
const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const inventory = require('../../src/extension-support/block-inventory.json');

const VM_ROOT = path.join(__dirname, '../..');
const CONTACTS_FILE = path.join(VM_ROOT, 'src/extension-support/engine-contacts.json');
const EXTENSIONS_DIR = path.join(VM_ROOT, 'src/extensions');
const CATEGORIES = ['random', 'clock', 'page', 'internals'];

const RANDOM_MEMBERS = new Map([['Math', ['random']], ['crypto', ['getRandomValues', 'randomUUID']]]);
const CLOCK_GLOBALS = new Set([
    'setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback',
    'clearTimeout', 'clearInterval', 'cancelAnimationFrame', 'cancelIdleCallback'
]);
const ENTRY_POINTS = new Set([
    'pmRandom', 'pmDateNow', 'pmPerfNow', 'pmSetTimeout', 'pmClearTimeout', 'pmSetInterval', 'pmClearInterval',
    'pmRequestAnimationFrame', 'pmCancelAnimationFrame'
]);
const RUNTIME_RANDOM_HELPERS = new Set(['toListIndex', 'inclusiveRandIntWithout']);
const PAGE_GLOBALS = new Set([
    'document', 'window', 'localStorage', 'sessionStorage', 'alert', 'confirm', 'prompt', 'Image', 'Audio',
    'AudioContext', 'webkitAudioContext', 'OfflineAudioContext', 'AudioWorkletNode', 'MediaRecorder', 'MediaStream',
    'RTCPeerConnection', 'RTCSessionDescription', 'RTCIceCandidate', 'SpeechSynthesisUtterance', 'speechSynthesis',
    'SpeechRecognition', 'webkitSpeechRecognition', 'getComputedStyle', 'matchMedia', 'MutationObserver',
    'ResizeObserver', 'IntersectionObserver', 'DOMParser', 'XMLSerializer', 'Option', 'screen', 'history', 'location',
    'parent', 'top', 'opener', 'frames', 'open', 'print', 'devicePixelRatio', 'innerWidth', 'innerHeight', 'outerWidth',
    'outerHeight', 'scrollX', 'scrollY', 'visualViewport', 'addEventListener', 'removeEventListener', 'dispatchEvent',
    'Element', 'Node', 'Document', 'Window', 'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'TouchEvent', 'WheelEvent',
    'DragEvent', 'DataTransfer', 'ClipboardItem', 'ClipboardEvent', 'CSS', 'CSSStyleSheet', 'Range', 'getSelection',
    'customElements'
]);
const PAGE_TYPE = /^(HTML|SVG)\w*Element$/;
// What a worker's navigator has too.
const WORKER_NAVIGATOR = new Set([
    'userAgent', 'userAgentData', 'language', 'languages', 'hardwareConcurrency', 'deviceMemory', 'onLine', 'platform',
    'appVersion', 'appName', 'product', 'storage', 'locks', 'permissions', 'gpu', 'mediaCapabilities', 'connection'
]);
// Names for the page's global object; only `window` is missing in a worker.
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);
const WRITE_ROOTS = new Set(['vm', 'runtime', 'renderer', 'ScratchBlocks', 'Blockly']);

// The "_" names the VM (without its extensions) and the renderer use: a superset of their private members.
const enginePrivate = new Set();
const addPrivateNames = dir => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (file !== EXTENSIONS_DIR) addPrivateNames(file);
        } else if (entry.name.endsWith('.js')) {
            for (const m of fs.readFileSync(file, 'utf8').matchAll(/\b_[A-Za-z$][\w$]*/g)) enginePrivate.add(m[0]);
        }
    }
};
addPrivateNames(path.join(VM_ROOT, 'src'));
addPrivateNames(path.join(path.dirname(require.resolve('scratch-render/package.json', {paths: [VM_ROOT]})), 'src'));

// Each extension's main file: gallery ones from the inventory's "source", built-in ones from the extension manager.
const managerFile = path.join(VM_ROOT, 'src/extension-support/extension-manager.js');
const builtinPaths = {};
const builtinRequire = /^\s*(\w+): \(\) => require\(["'](\.\.\/extensions\/[^"']+)["']\)/gm;
for (const m of fs.readFileSync(managerFile, 'utf8').matchAll(builtinRequire)) {
    builtinPaths[m[1]] = path.join(path.dirname(managerFile), m[2]);
}
const resolveFile = p => [p, `${p}.js`, path.join(p, 'index.js')]
    .find(c => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
const mainFiles = {};
for (const [id, extension] of Object.entries(inventory)) {
    mainFiles[id] = extension.source ? resolveFile(path.join(VM_ROOT, extension.source)) :
        (builtinPaths[id] ? resolveFile(builtinPaths[id]) : null);
}
const allMainFiles = new Set(Object.values(mainFiles).filter(Boolean));

const parse = (file, code) => babelParser.parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    allowAwaitOutsideFunction: true,
    errorRecovery: true
});

const SKIP_KEYS = new Set(['loc', 'start', 'end', 'extra', 'range', 'comments', 'leadingComments', 'trailingComments',
    'innerComments', 'errors', 'tokens']);
const walk = (node, visit, parent = null) => {
    if (!node || typeof node.type !== 'string') return;
    visit(node, parent);
    for (const key of Object.keys(node)) {
        if (SKIP_KEYS.has(key)) continue;
        const value = node[key];
        if (Array.isArray(value)) {
            for (const child of value) walk(child, visit, node);
        } else if (value && typeof value.type === 'string') {
            walk(value, visit, node);
        }
    }
};

const patternNames = (node, out) => {
    if (!node) return;
    switch (node.type) {
    case 'Identifier': out.add(node.name); break;
    case 'ObjectPattern':
        for (const p of node.properties) patternNames(p.type === 'RestElement' ? p : p.value, out);
        break;
    case 'ArrayPattern': for (const e of node.elements) patternNames(e, out); break;
    case 'RestElement': patternNames(node.argument, out); break;
    case 'AssignmentPattern': patternNames(node.left, out); break;
    }
};
const declaredNames = ast => {
    const names = new Set();
    walk(ast, node => {
        if (node.type === 'VariableDeclarator') patternNames(node.id, names);
        if (/Function|ClassMethod|ObjectMethod/.test(node.type)) {
            if (node.id && node.type !== 'ClassMethod') patternNames(node.id, names);
            for (const p of node.params || []) patternNames(p, names);
        }
        if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) names.add(node.id.name);
        if (node.type === 'CatchClause') patternNames(node.param, names);
        if (/^Import(Default|Namespace)?Specifier$/.test(node.type)) names.add(node.local.name);
    });
    return names;
};

const isMember = node => node && (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression');
const propertyName = member => {
    if (!member.computed && member.property.type === 'Identifier') return member.property.name;
    if (member.computed && member.property.type === 'StringLiteral') return member.property.value;
    return null;
};
// Whether an identifier is a name read where it stands (not a property, key or label).
const isReference = (node, parent) => {
    if (!parent) return true;
    if (isMember(parent) && parent.property === node && !parent.computed) return false;
    if (/Property|Method/.test(parent.type) && parent.key === node && !parent.computed) return false;
    if (/Labeled|Break|Continue/.test(parent.type)) return false;
    if (/Specifier$/.test(parent.type) || parent.type === 'MetaProperty') return false;
    return true;
};
// The member chain on the left of a write, e.g. this.runtime.foo.bar -> ['this', 'runtime', 'foo', 'bar'].
const chainOf = node => {
    if (node.type === 'Identifier') return [node.name];
    if (node.type === 'ThisExpression') return ['this'];
    if (isMember(node)) {
        const object = chainOf(node.object);
        return object && object.concat(propertyName(node) || '[]');
    }
    return null;
};
// Strips the ways extensions reach the engine (this.runtime, Scratch.vm.runtime, util.runtime, vm.renderer, ...).
const normaliseChain = chain => {
    const c = chain.slice();
    while (c.length > 1 && (c[0] === 'this' || c[0] === 'Scratch' || c[0] === 'util')) c.shift();
    while (c.length > 1 && (c[0] === 'vm' || c[0] === 'runtime') && (c[1] === 'runtime' || c[1] === 'renderer')) {
        c.shift();
    }
    return c;
};

// The "_" members an extension defines itself (on `this`, as class or object members, on its own prototypes): its own
// objects, not the engine's, also in the libraries some extensions bundle.
const ownPrivateNames = (ast, out) => {
    const declared = declaredNames(ast);
    walk(ast, node => {
        if (/^(Class(Private)?(Method|Property)|ObjectMethod|ObjectProperty)$/.test(node.type) && !node.computed &&
            node.key.type === 'Identifier' && node.key.name.startsWith('_')) {
            out.add(node.key.name);
        }
        if (node.type === 'AssignmentExpression' && isMember(node.left)) {
            const name = propertyName(node.left);
            const chain = chainOf(node.left);
            if (!name || !name.startsWith('_') || !chain) return;
            const p = chain.indexOf('prototype');
            if ((chain.length === 2 && chain[0] === 'this') || (p === 1 && declared.has(chain[0]))) out.add(name);
        }
    });
};

const contactsOfFile = (ast, add, ownPrivate) => {
    const declared = declaredNames(ast);
    walk(ast, (node, parent) => {
        if (node.type === 'Identifier' && !declared.has(node.name) && isReference(node, parent)) {
            const name = node.name;
            const member = isMember(parent) && parent.object === node ? propertyName(parent) : null;
            if (GLOBAL_OBJECTS.has(name)) {
                if (name === 'window') add('page', member ? `window.${member}` : 'window');
                if (member && CLOCK_GLOBALS.has(member)) add('clock', `${name}.${member}`);
                if (member && name !== 'window' && (PAGE_GLOBALS.has(member) || PAGE_TYPE.test(member))) {
                    add('page', `${name}.${member}`);
                }
            } else if (RANDOM_MEMBERS.has(name)) {
                if (RANDOM_MEMBERS.get(name).includes(member)) add('random', `${name}.${member}`);
            } else if (name === 'Date') {
                if (member === 'now') add('clock', 'Date.now');
                if ((parent.type === 'NewExpression' || parent.type === 'CallExpression') && parent.callee === node &&
                    (parent.type === 'CallExpression' || parent.arguments.length === 0)) {
                    add('clock', parent.type === 'NewExpression' ? 'new Date()' : 'Date()');
                }
            } else if (name === 'performance') {
                add('clock', member ? `performance.${member}` : 'performance');
            } else if (CLOCK_GLOBALS.has(name)) {
                if (parent.type !== 'UnaryExpression' || parent.operator !== 'typeof') add('clock', name);
            } else if (name === 'navigator') {
                if (!WORKER_NAVIGATOR.has(member)) add('page', member ? `navigator.${member}` : 'navigator');
            } else if (PAGE_GLOBALS.has(name) || PAGE_TYPE.test(name)) {
                add('page', member ? `${name}.${member}` : name);
            }
        }
        // section 155: without a runtime as 4th argument these fall back to Math.random
        if (node.type === 'CallExpression' && isMember(node.callee) && node.arguments.length < 4 &&
            RUNTIME_RANDOM_HELPERS.has(propertyName(node.callee))) {
            add('random', `${propertyName(node.callee)} without runtime`);
        }
        if (isMember(node)) {
            const name = propertyName(node);
            if (ENTRY_POINTS.has(name)) add('entry points', name);
            if (isMember(node.object) && propertyName(node.object) === 'pmPage') add('entry points', `pmPage.${name}`);
            if (name && !node.computed && name.startsWith('_') && node.object.type !== 'ThisExpression' &&
                enginePrivate.has(name) && !ownPrivate.has(name)) {
                add('internals', `.${name}`);
            }
            if ((name === 'canvas' || name === 'gl') &&
                ((node.object.type === 'Identifier' && node.object.name === 'renderer') ||
                 (isMember(node.object) && propertyName(node.object) === 'renderer'))) {
                add('page', `renderer.${name}`);
            }
        }
        const target = node.type === 'AssignmentExpression' ? node.left :
            (node.type === 'UpdateExpression' ? node.argument : null);
        if (target && isMember(target)) {
            const chain = chainOf(target);
            if (chain) {
                const c = normaliseChain(chain);
                if (c.length >= 2 && WRITE_ROOTS.has(c[0])) add('internals', `write ${c[0]}.${c[1]}`);
                // a prototype the file does not define itself: a page or engine type
                const p = c.indexOf('prototype');
                if (p > 0 && p < c.length - 1 && !(p === 1 && declared.has(c[0]))) {
                    add('internals', `write ${c[p - 1]}.prototype.${c[p + 1]}`);
                }
            }
        }
    });
};

// Relative requires and imports of a file that stay inside src/extensions and are not another extension's main file.
const ownRequires = (file, ast) => {
    const found = [];
    walk(ast, node => {
        let spec = null;
        if (node.type === 'CallExpression' && node.arguments.length && node.arguments[0].type === 'StringLiteral' &&
            ((node.callee.type === 'Identifier' && node.callee.name === 'require') || node.callee.type === 'Import')) {
            spec = node.arguments[0].value;
        }
        if (/^(Import|ExportAll|ExportNamed)Declaration$/.test(node.type) && node.source) spec = node.source.value;
        if (!spec || !spec.startsWith('.')) return;
        const resolved = resolveFile(path.resolve(path.dirname(file), spec));
        if (resolved && resolved.endsWith('.js') && resolved.startsWith(EXTENSIONS_DIR + path.sep) &&
            !allMainFiles.has(resolved)) {
            found.push(resolved);
        }
    });
    return found;
};

const problems = [];
const scanned = {};
const computed = {};
const entryPointUses = {};
for (const [id, main] of Object.entries(mainFiles)) {
    if (!main) {
        problems.push(`${id}: main file not found`);
        continue;
    }
    const counts = {};
    const add = (category, token) => {
        counts[category] = counts[category] || {};
        counts[category][token] = (counts[category][token] || 0) + 1;
    };
    const queue = [main];
    const seen = new Set(queue);
    const asts = [];
    while (queue.length) {
        const file = queue.shift();
        let ast;
        try {
            ast = parse(file, fs.readFileSync(file, 'utf8'));
        } catch (e) {
            problems.push(`${id}: ${path.relative(VM_ROOT, file)} cannot be read: ${e.message}`);
            continue;
        }
        if (ast.errors && ast.errors.length) {
            problems.push(`${id}: ${path.relative(VM_ROOT, file)}: ${ast.errors[0].message}`);
        }
        asts.push(ast);
        for (const next of ownRequires(file, ast)) {
            if (!seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
    const ownPrivate = new Set();
    for (const ast of asts) ownPrivateNames(ast, ownPrivate);
    for (const ast of asts) contactsOfFile(ast, add, ownPrivate);
    scanned[id] = [...seen].map(f => path.relative(VM_ROOT, f).replace(/\\/g, '/'));
    const sorted = {};
    for (const category of CATEGORIES) {
        if (!counts[category]) continue;
        sorted[category] = {};
        for (const token of Object.keys(counts[category]).sort()) sorted[category][token] = counts[category][token];
    }
    computed[id] = sorted;
    if (counts['entry points']) entryPointUses[id] = counts['entry points'];
}

if (process.argv.includes('--write')) {
    fs.writeFileSync(CONTACTS_FILE, `${JSON.stringify(computed, null, 4)}\n`);
}
if (process.argv.includes('--report')) {
    const entryTotals = {};
    for (const uses of Object.values(entryPointUses)) {
        for (const [name, n] of Object.entries(uses)) entryTotals[name] = (entryTotals[name] || 0) + n;
    }
    // eslint-disable-next-line no-console
    const totals = Object.entries(entryTotals).map(([name, n]) => `${name} ${n}`);
    // eslint-disable-next-line no-console
    console.log(`entry points (not contacts): ${Object.keys(entryPointUses).length} extensions, ${totals.join(', ')}`);
    for (const category of CATEGORIES) {
        const tokens = {};
        let extensions = 0;
        let uses = 0;
        for (const [id, contacts] of Object.entries(computed)) {
            if (!contacts[category]) continue;
            extensions++;
            for (const [token, n] of Object.entries(contacts[category])) {
                uses += n;
                tokens[token] = tokens[token] || {uses: 0, ids: []};
                tokens[token].uses += n;
                tokens[token].ids.push(id);
            }
        }
        // eslint-disable-next-line no-console
        console.log(`${category}: ${extensions} extensions, ${uses} uses, ${Object.keys(tokens).length} kinds`);
        const top = Object.entries(tokens).sort((a, b) => b[1].ids.length - a[1].ids.length || b[1].uses - a[1].uses);
        for (const [token, info] of top.slice(0, 12)) {
            // eslint-disable-next-line no-console
            console.log(`  ${token}: ${info.ids.length} extensions, ${info.uses} uses`);
        }
    }
}

test('every inventoried extension is found and read', t => {
    t.same(problems, []);
    t.end();
});

test('engine-contacts.json lists exactly the contacts in the code', t => {
    const expected = fs.existsSync(CONTACTS_FILE) ? JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')) : {};
    t.same(Object.keys(expected), Object.keys(computed), 'one entry per inventoried extension, in inventory order');
    for (const [id, contacts] of Object.entries(computed)) {
        // A new contact: send it through the engine's entry point for it, or, when it is meant, run with --write.
        t.same(contacts, expected[id], `${id} (${scanned[id].join(', ')})`);
    }
    t.end();
});
