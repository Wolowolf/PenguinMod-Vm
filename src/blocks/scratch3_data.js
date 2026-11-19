// PMDESKTOP_LISTLOOKUP (section 62): list blocks use the engine's own item storage (listLookup.items)
// so that lists keep their lookup table; see engine/list-lookup.js.
const listLookup = require('../engine/list-lookup');
const { validateArray } = require('../util/json-block-utilities');
// Desktop fork (section 291): what most Variables and Lists blocks do is in shared/data.js, used by the compiler too
const SharedBlocks = require('./shared');

class Scratch3DataBlocks {
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
            data_variable: this.getVariable,
            data_setvariableto: this.setVariableTo,
            data_changevariableby: this.changeVariableBy,
            data_listcontents: this.getListContents,
            data_arraylist: this.data_arraylist,
            data_listforeachnum: this.data_listforeachnum,
            data_listforeachitem: this.data_listforeachitem
        };
        for (const opcode of Object.keys(this._shared)) {
            if (opcode.startsWith('data_') && !primitives[opcode]) primitives[opcode] = this._shared[opcode];
        }
        return primitives;
    }

    getVariable (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        return variable.value;
    }

    setVariableTo (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        variable.value = args.VALUE;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, args.VALUE]);
        }
    }

    changeVariableBy (args, util) {
        const variable = util.target.lookupOrCreateVariable(
            args.VARIABLE.id, args.VARIABLE.name);
        // (section 291: the "+" block's own function, as the compiler builds this block from it)
        const newValue = this._shared.operator_add({NUM1: variable.value, NUM2: args.VALUE});
        variable.value = newValue;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, newValue]);
        }
    }

    getListContents (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // If block is running for monitors, return copy of list as an array if changed.
        if (util.thread.updateMonitor) {
            // Return original list value if up-to-date, which doesn't trigger monitor update.
            if (list._monitorUpToDate) return listLookup.items(list);
            // If value changed, reset the flag and return a copy to trigger monitor update.
            // Because monitors use Immutable data structures, only new objects trigger updates.
            list._monitorUpToDate = true;
            return listLookup.items(list).slice();
        }
        return this._shared.data_listcontents(args, util);
    }

    data_arraylist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // Desktop fork (section 320): no block gives arrays or objects any more; only JSON text is read.
        const array = validateArray(args.VALUE).array.map(v => {
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v);
        });
        listLookup.setItems(list, array);
    }
    // Desktop fork (section 211): "for each index / value in list" interpreted like the compiled blocks: front to back,
    // the item's number from 1 (or the item) in the block's VARIABLE field, the list read as it is at each round. They
    // read a field that doesn't exist (INDEX), so they stopped interpreted scripts with an error, and went from the back
    // with numbers from 0. Interpreted they pause after each round, like other loops (compiled: no pause).
    _pmListForEach (args, util, num) {
        const list = util.target.lookupOrCreateList(args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        const index = util.stackFrame.pmIndex || 0;
        if (index < items.length) {
            util.stackFrame.pmIndex = index + 1;
            this.setVariableTo({VARIABLE: args.VARIABLE, VALUE: num ? index + 1 : items[index]}, util);
            util.startBranch(1, true);
        }
    }
    data_listforeachnum (args, util) {
        this._pmListForEach(args, util, true);
    }
    data_listforeachitem (args, util) {
        this._pmListForEach(args, util, false);
    }
    
    _listFilterItem = [""]
    _listFilterIndex = [0]
}

module.exports = Scratch3DataBlocks;
