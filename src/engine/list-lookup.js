// PMDESKTOP_LISTLOOKUP (section 62): lookup tables that let "item # of" and "list contains" answer
// for long lists without comparing the item with every list item.
//
// Staying up to date: list variables keep their items in `_value` (see variable.js). Engine code that
// does not hand the array to anyone uses `_value`; everyone else (extensions, the editor, engine code
// not changed for this) reads or sets `value`, which marks the list as exposed and drops its table:
// outside code may now change the array at any time without telling the engine, so an exposed list is
// searched item by item, exactly as before. Only when the engine itself puts a new array into the list
// (delete all, loading, clones...) is it unexposed again (setItems). Engine code that changes an
// unexposed array in place calls changed(), except for adding at the end, which the table picks up by
// itself (it remembers how many items it has seen).
//
// Paying off: a table is only made for lists of at least MIN_LENGTH items, and only once item-by-item
// searches since the last change have compared BUILD_FACTOR times as many items as the list has
// (making one costs about that much), so lists that change more often than they are searched never
// get one. If a list's last table was thrown away (by a change) before it had saved that much
// searching, the list waits twice as long before the next one (up to MAX_FACTOR); once one pays off,
// back to BUILD_FACTOR. Lists with an item that is not text, a number, a boolean or null get none.
//
// Matching is exactly Cast.compare / compareEqual: a value is a number unless it converts to NaN or is
// a string that converts to 0 without containing "0" or a tab (isNotActuallyZero); two numbers match by
// value, anything else matches as lower-case text. So the table has two maps: `numbers` (number -> first
// position, for every value that is a number) and `texts` (lower-case text -> first position, for
// values that are not numbers, plus booleans, null and infinities, the only numbers whose lower-case
// text does not read as a number: "true" matches true, "infinity" matches "Infinity").

const MIN_LENGTH = 32;
const BUILD_FACTOR = 3;
const MAX_FACTOR = 48;

// The same test as in Cast and the compiled scripts' runtime.
const isNotActuallyZero = val => {
    if (typeof val !== 'string') return false;
    for (let i = 0; i < val.length; i++) {
        const code = val.charCodeAt(i);
        if (code === 48 || code === 9) {
            return false;
        }
    }
    return true;
};

// Adds one item at 1-based position `index` unless an earlier item already has its key.
// Returns false for a value the table cannot hold.
const addItem = (numbers, texts, value, index) => {
    let n;
    switch (typeof value) {
    case 'number':
        n = value;
        break;
    case 'string':
        n = +value;
        if (n === 0 && isNotActuallyZero(value)) n = NaN;
        break;
    case 'boolean':
        n = value ? 1 : 0;
        break;
    default:
        if (value !== null) return false;
        n = 0;
    }
    if (n === n) {
        if (!numbers.has(n)) numbers.set(n, index);
        // A plain number is only ever matched by number.
        if (n !== Infinity && n !== -Infinity && typeof value !== 'boolean' && value !== null) return true;
    }
    const text = ('' + value).toLowerCase();
    if (!texts.has(text)) texts.set(text, index);
    return true;
};

// 1-based position of the first match, 0 when there is none, -1 for a value the table cannot answer.
const find = (numbers, texts, item) => {
    let n;
    switch (typeof item) {
    case 'number':
        n = item;
        break;
    case 'string':
        n = +item;
        if (n === 0 && isNotActuallyZero(item)) n = NaN;
        break;
    case 'boolean':
        n = item ? 1 : 0;
        break;
    default:
        if (item !== null) return -1;
        n = 0;
    }
    let found = 0;
    if (n === n) {
        found = numbers.get(n) || 0;
        if (n !== Infinity && n !== -Infinity && typeof item !== 'boolean' && item !== null) return found;
    }
    const textFound = texts.get(('' + item).toLowerCase());
    if (textFound !== undefined && (found === 0 || textFound < found)) found = textFound;
    return found;
};

// Adds the items appended since the table last saw the list.
const addNewItems = (state, items) => {
    const {numbers, texts} = state;
    for (let i = state.length; i < items.length; i++) {
        if (!addItem(numbers, texts, items[i], i + 1)) return false;
    }
    state.length = items.length;
    return true;
};

const build = (state, items, stats) => {
    state.numbers = new Map();
    state.texts = new Map();
    state.length = 0;
    state.stats = stats;
    if (!addNewItems(state, items)) {
        // Not again until the list changes.
        state.numbers = null;
        state.texts = null;
        state.work = -Infinity;
        return;
    }
    // Searching this table must save at least this much (counted in items compared) to pay off.
    stats.saved = 0;
    stats.cost = BUILD_FACTOR * items.length;
};

/**
 * The items of a list, without marking them as seen by outside code.
 * @param {Variable} list A list variable (or, in broken projects, another kind of variable).
 * @returns {*} The items.
 */
const items = list => (list._lookup === undefined ? list.value : list._value);

/**
 * Puts an array the engine just made (and nobody else has) into a list.
 * @param {Variable} list The list variable.
 * @param {Array} array The new items.
 */
const setItems = (list, array) => {
    if (list._lookup === undefined) {
        list.value = array;
        return;
    }
    list._value = array;
    list._exposed = false;
    list._lookup = null;
};

/**
 * Call after changing a list's array in place in any way other than adding at the end.
 * @param {Variable} list The list variable.
 */
const changed = list => {
    if (list._lookup) list._lookup = null;
};

/**
 * Answer from the list's table.
 * @param {Variable} list The list variable.
 * @param {Array} array Its items (from items()).
 * @param {*} item The item to look for.
 * @returns {number} 1-based position of the first match, 0 if there is none, or -1 when there is no
 * table: then search item by item and report it with searched().
 */
const lookup = (list, array, item) => {
    const state = list._lookup;
    if (!state || state.numbers === null || state.items !== array) return -1;
    if (array.length !== state.length && (array.length < state.length || !addNewItems(state, array))) {
        list._lookup = null;
        return -1;
    }
    const found = find(state.numbers, state.texts, item);
    // An item-by-item search would have compared this many items.
    if (found !== -1) state.stats.saved += found || array.length;
    return found;
};

/**
 * Reports an item-by-item search; makes a table once they add up to more than making one costs.
 * @param {Variable} list The list variable.
 * @param {Array} array Its items (from items()).
 * @param {number} compared How many items were compared.
 */
const searched = (list, array, compared) => {
    if (array.length < MIN_LENGTH || list._exposed !== false || !Array.isArray(array)) return;
    let state = list._lookup;
    if (!state || state.items !== array) {
        state = list._lookup = {items: array, length: 0, work: 0, numbers: null, texts: null};
    }
    if (state.numbers !== null) return;
    state.work += compared;
    let stats = list._lookupStats;
    if (state.work < (stats === null ? BUILD_FACTOR : stats.factor) * array.length) return;
    if (stats === null) {
        stats = list._lookupStats = {factor: BUILD_FACTOR, saved: 0, cost: 0};
    } else if (stats.cost !== 0) {
        // Did the last table save more searching than it cost to make?
        stats.factor = stats.saved < stats.cost ? Math.min(stats.factor * 2, MAX_FACTOR) : BUILD_FACTOR;
        stats.cost = 0;
        if (state.work < stats.factor * array.length) return;
    }
    build(state, array, stats);
};

module.exports = {
    MIN_LENGTH,
    items,
    setItems,
    changed,
    lookup,
    searched
};
