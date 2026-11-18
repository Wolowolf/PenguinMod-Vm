/**
 * Desktop fork (section 291): what the Variables and Lists blocks do, written once for the interpreter and the
 * compiler (src/blocks/shared/index.js explains the format). Moved here from scratch3_data.js (the interpreter's
 * functions) and jsgen.js / jsexecute.js (the compiler's code and helpers). Getting, setting and changing a
 * variable and "for each item" stay in each mode's own code: the compiler keeps variables in its own places
 * (typed locals, section 245), so there is no single piece of code both could run.
 */
const listLookupMinLength = require('../../engine/list-lookup').MIN_LENGTH;

const helpers = {
    // PMDESKTOP_LISTLOOKUP (section 62): the items of a list without marking them as seen by outside code
    // (engine/list-lookup.js). Only list variables have _lookup; broken projects can point a list block at
    // another kind of variable, which keeps using value.
    listLookup: {base: true, js: 'globalState.listLookup'},
    listItems: {base: true, js: 'list => (list._lookup === undefined ? list.value : list._value)'},
    // A Scratch list position to a JavaScript one (0-based), -1 if there is no such item. "all" is not a position.
    // (section 155: "random" uses the runtime's random numbers)
    listIndex: {base: true, extra: {listIndexSlow: `(index, length) => {
    if (index === 'last') {
        return length - 1;
    } else if (index === 'random' || index === 'any') {
        if (length > 0) {
            return (globalState.thread.target.runtime.pmRandom() * length) | 0; // section 155
        }
        return -1;
    }
    index = (+index || 0) | 0;
    if (index < 1 || index > length) {
        return -1;
    }
    return index - 1;
}`}, js: `(index, length) => {
    if (typeof index !== 'number') {
      return listIndexSlow(index, length);
    }
    index = index | 0;
    return index < 1 || index > length ? -1 : index - 1;
}`},
    // Desktop fork (section 236): listGet and listReplace handle number positions in place with listIndex's own
    // number steps, every other position still goes through listIndex.
    listGet: `(list, idx) => {
    if (typeof idx === 'number') {
        const i = (idx | 0) - 1;
        if (i >= 0) {
            const item = list[i];
            if (item !== undefined) return item;
        }
    }
    const index = listIndex(idx, list.length);
    if (index === -1) {
        return '';
    }
    return list[index];
}`,
    listReplace: `(list, idx, value) => {
    const items = listItems(list);
    if (typeof idx === 'number') {
        const i = (idx | 0) - 1;
        if (i >= 0 && i < items.length) {
            items[i] = value;
            if (list._lookup) list._lookup = null;
            list._monitorUpToDate = false;
        }
        return;
    }
    const index = listIndex(idx, items.length);
    if (index === -1) {
        return;
    }
    items[index] = value;
    if (list._lookup) list._lookup = null;
    list._monitorUpToDate = false;
}`,
    listInsert: `(list, idx, value) => {
    const items = listItems(list);
    const index = listIndex(idx, items.length + 1);
    if (index === -1) {
        return;
    }
    items.splice(index, 0, value);
    if (list._lookup) list._lookup = null;
    list._monitorUpToDate = false;
}`,
    listDelete: `(list, idx) => {
    if (idx === 'all') {
        listLookup.setItems(list, []);
        return;
    }
    const items = listItems(list);
    const index = listIndex(idx, items.length);
    if (index === -1) {
        return;
    }
    items.splice(index, 1);
    if (list._lookup) list._lookup = null;
    list._monitorUpToDate = false;
}`,
    // Scratch's "=" (compareEqual): 123 and "123" are the same item
    listContains: `(list, item) => {
    const items = listItems(list);
    if (items.length >= ${listLookupMinLength}) {
        const found = listLookup.lookup(list, items, item);
        if (found !== -1) return found !== 0;
    }
    const strictIndex = items.indexOf(item);
    if (strictIndex !== -1) {
        listLookup.searched(list, items, strictIndex + 1);
        return true;
    }
    for (let i = 0; i < items.length; i++) {
        if (compareEqual(items[i], item)) {
            listLookup.searched(list, items, i + 1);
            return true;
        }
    }
    listLookup.searched(list, items, items.length);
    return false;
}`,
    listIndexOf: `(list, item) => {
    const items = listItems(list);
    if (items.length >= ${listLookupMinLength}) {
        const found = listLookup.lookup(list, items, item);
        if (found !== -1) return found;
    }
    for (let i = 0; i < items.length; i++) {
        if (compareEqual(items[i], item)) {
            listLookup.searched(list, items, i + 1);
            return i + 1;
        }
    }
    listLookup.searched(list, items, items.length);
    return 0;
}`,
    // Whether listIndex finds an item, including its random number for "random"
    coreItemExists: `(index, length) => {
    if (typeof index !== 'number') {
        if (index === 'all') return false;
        if (index === 'last') return length > 0;
        if (index === 'random' || index === 'any') {
            if (length > 0) {
                globalState.thread.target.runtime.pmRandom(); // section 155
                return true;
            }
            return false;
        }
    }
    index = Math.floor(globalState.Cast.toNumber(index));
    return !(index < 1 || index > length);
}`,
    // The list as text: single letters joined without spaces, anything else with spaces
    coreListContents: `items => {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!(typeof item === 'string' && item.length === 1)) return items.join(' ');
    }
    return items.join('');
}`
};

const blocks = {
    data_itemoflist: {list: 'LIST', inputs: 'INDEX:r', js: 'listGet($ITEMS, $INDEX)'},
    data_itemnumoflist: {list: 'LIST', inputs: 'ITEM:r', js: 'listIndexOf($LIST, $ITEM)'},
    data_lengthoflist: {list: 'LIST', js: '$ITEMS.length'},
    data_listcontainsitem: {list: 'LIST', inputs: 'ITEM:r', js: 'listContains($LIST, $ITEM)'},
    data_listcontents: {list: 'LIST', js: 'coreListContents($ITEMS)'},
    data_itemexistslist: {list: 'LIST', inputs: 'INDEX:r', js: 'coreItemExists($INDEX, $ITEMS.length)'},
    data_listisempty: {list: 'LIST', js: '($ITEMS.length < 1)'},
    data_listarray: {list: 'LIST', js: 'JSON.stringify($ITEMS)'},
    data_addtolist: {list: 'LIST', inputs: 'ITEM:r', stack: '$ITEMS.push($ITEM);\n$LIST._monitorUpToDate = false;\n'},
    data_deleteoflist: {list: 'LIST', inputs: 'INDEX:r', stack: 'listDelete($LIST, $INDEX);\n'},
    data_deletealloflist: {list: 'LIST', stack: 'listLookup.setItems($LIST, []);\n'},
    data_insertatlist: {list: 'LIST', inputs: 'INDEX:r ITEM:r', stack: 'listInsert($LIST, $INDEX, $ITEM);\n'},
    data_replaceitemoflist: {list: 'LIST', inputs: 'INDEX:r ITEM:r', stack: 'listReplace($LIST, $INDEX, $ITEM);\n'},
    data_reverselist: {list: 'LIST', stack: '$ITEMS.reverse();\n$CHANGED$LIST._monitorUpToDate = false;\n'},
    data_showlist: {list: 'LIST', stack: 'runtime.monitorBlocks.changeBlock({ id: $ID, element: "checkbox", value: true }, runtime);\n'},
    data_hidelist: {list: 'LIST', stack: 'runtime.monitorBlocks.changeBlock({ id: $ID, element: "checkbox", value: false }, runtime);\n'},
    data_showvariable: {variable: 'VARIABLE', stack: 'runtime.monitorBlocks.changeBlock({ id: $ID, element: "checkbox", value: true }, runtime);\n'},
    data_hidevariable: {variable: 'VARIABLE', stack: 'runtime.monitorBlocks.changeBlock({ id: $ID, element: "checkbox", value: false }, runtime);\n'}
};

module.exports = {helpers, blocks};
