const Cast = require('../util/cast');
// PMDESKTOP_LISTLOOKUP (section 62): list blocks use the engine's own item storage (listLookup.items)
// so that lists keep their lookup table; see engine/list-lookup.js.
const listLookup = require('../engine/list-lookup');
const { validateArray } = require('../util/json-block-utilities');

class Scratch3DataBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            data_variable: this.getVariable,
            data_setvariableto: this.setVariableTo,
            data_changevariableby: this.changeVariableBy,
            data_hidevariable: this.hideVariable,
            data_showvariable: this.showVariable,
            data_listcontents: this.getListContents,
            data_addtolist: this.addToList,
            data_deleteoflist: this.deleteOfList,
            data_deletealloflist: this.deleteAllOfList,
            data_insertatlist: this.insertAtList,
            data_replaceitemoflist: this.replaceItemOfList,
            data_itemoflist: this.getItemOfList,
            data_itemnumoflist: this.getItemNumOfList,
            data_lengthoflist: this.lengthOfList,
            data_listcontainsitem: this.listContainsItem,
            data_hidelist: this.hideList,
            data_showlist: this.showList,
            data_reverselist: this.data_reverselist,
            data_itemexistslist: this.data_itemexistslist,
            data_listisempty: this.data_listisempty,
            data_listarray: this.data_listarray,
            data_arraylist: this.data_arraylist,
            data_listforeachnum: this.data_listforeachnum,
            data_listforeachitem: this.data_listforeachitem
        };
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
        const castedValue = Cast.toNumber(variable.value);
        const dValue = Cast.toNumber(args.VALUE);
        const newValue = castedValue + dValue;
        variable.value = newValue;

        if (variable.isCloud) {
            util.ioQuery('cloud', 'requestUpdateVariable', [variable.name, newValue]);
        }
    }

    changeMonitorVisibility (id, visible) {
        // Send the monitor blocks an event like the flyout checkbox event.
        // This both updates the monitor state and changes the isMonitored block flag.
        this.runtime.monitorBlocks.changeBlock({
            id: id, // Monitor blocks for variables are the variable ID.
            element: 'checkbox', // Mimic checkbox event from flyout.
            value: visible
        }, this.runtime);
    }

    showVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, true);
    }

    hideVariable (args) {
        this.changeMonitorVisibility(args.VARIABLE.id, false);
    }

    showList (args) {
        this.changeMonitorVisibility(args.LIST.id, true);
    }

    hideList (args) {
        this.changeMonitorVisibility(args.LIST.id, false);
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
        const items = listLookup.items(list);

        // Determine if the list is all single letters.
        // If it is, report contents joined together with no separator.
        // If it's not, report contents joined together with a space.
        let allSingleLetters = true;
        for (let i = 0; i < items.length; i++) {
            const listItem = items[i];
            if (!((typeof listItem === 'string') &&
                  (listItem.length === 1))) {
                allSingleLetters = false;
                break;
            }
        }
        if (allSingleLetters) {
            return items.join('');
        }
        return items.join(' ');

    }

    addToList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        listLookup.items(list).push(args.ITEM);
        list._monitorUpToDate = false;
    }

    deleteOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        const index = Cast.toListIndex(args.INDEX, items.length, true);
        if (index === Cast.LIST_INVALID) {
            return;
        } else if (index === Cast.LIST_ALL) {
            listLookup.setItems(list, []);
            return;
        }
        items.splice(index - 1, 1);
        listLookup.changed(list);
        list._monitorUpToDate = false;
    }

    deleteAllOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        listLookup.setItems(list, []);
        return;
    }

    insertAtList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        const index = Cast.toListIndex(args.INDEX, items.length + 1, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        items.splice(index - 1, 0, item);
        listLookup.changed(list);
        list._monitorUpToDate = false;
    }

    replaceItemOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        const index = Cast.toListIndex(args.INDEX, items.length, false);
        if (index === Cast.LIST_INVALID) {
            return;
        }
        items[index - 1] = item;
        listLookup.changed(list);
        list._monitorUpToDate = false;
    }

    getItemOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        const index = Cast.toListIndex(args.INDEX, items.length, false);
        if (index === Cast.LIST_INVALID) {
            return '';
        }
        return items[index - 1];
    }

    getItemNumOfList (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        const items = listLookup.items(list);
        if (items.length >= listLookup.MIN_LENGTH) {
            const found = listLookup.lookup(list, items, item);
            if (found !== -1) return found;
        }

        // Go through the list items one-by-one using Cast.compare. This is for
        // cases like checking if 123 is contained in a list [4, 7, '123'] --
        // Scratch considers 123 and '123' to be equal.
        for (let i = 0; i < items.length; i++) {
            if (Cast.compare(items[i], item) === 0) {
                listLookup.searched(list, items, i + 1);
                return i + 1;
            }
        }
        listLookup.searched(list, items, items.length);

        // We don't bother using .indexOf() at all, because it would end up with
        // edge cases such as the index of '123' in [4, 7, 123, '123', 9].
        // If we use indexOf(), this block would return 4 instead of 3, because
        // indexOf() sees the first occurence of the string 123 as the fourth
        // item in the list. With Scratch, this would be confusing -- after all,
        // '123' and 123 look the same, so one would expect the block to say
        // that the first occurrence of '123' (or 123) to be the third item.

        // Default to 0 if there's no match. Since Scratch lists are 1-indexed,
        // we don't have to worry about this conflicting with the "this item is
        // the first value" number (in JS that is 0, but in Scratch it's 1).
        return 0;
    }

    lengthOfList (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return listLookup.items(list).length;
    }

    listContainsItem (args, util) {
        const item = args.ITEM;
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const items = listLookup.items(list);
        if (items.length >= listLookup.MIN_LENGTH) {
            const found = listLookup.lookup(list, items, item);
            if (found !== -1) return found !== 0;
        }
        const strictIndex = items.indexOf(item);
        if (strictIndex >= 0) {
            listLookup.searched(list, items, strictIndex + 1);
            return true;
        }
        // Try using Scratch comparison operator on each item.
        // (Scratch considers the string '123' equal to the number 123).
        for (let i = 0; i < items.length; i++) {
            if (Cast.compare(items[i], item) === 0) {
                listLookup.searched(list, items, i + 1);
                return true;
            }
        }
        listLookup.searched(list, items, items.length);
        return false;
    }

    data_reverselist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        listLookup.items(list).reverse();
        listLookup.changed(list);
        list._monitorUpToDate = false;
    }
    data_itemexistslist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        const index = Cast.toListIndex(args.INDEX, listLookup.items(list).length, false);
        if (index === Cast.LIST_INVALID) {
            return false;
        }
        return true;
    }
    data_listisempty (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return listLookup.items(list).length < 1;
    }
    data_listarray (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        return JSON.stringify(listLookup.items(list));
    }
    data_arraylist (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);

        // with modern extensions, we could be receiving an actual array
        // if so, no need for string validation
        const arrayArg = args.VALUE;
        let array;
        if (typeof arrayArg === 'object') {
            if (Array.isArray(arrayArg)) {
                list.value = arrayArg;
                return;
            } else {
                if (arrayArg.constructor?.name !== "Object") {
                    // potential custom return API
                    if (typeof arrayArg.toJSON === 'function') {
                        array = arrayArg.toJSON();
                        if (Array.isArray(array)) {
                            list.value = array;
                            return;
                        }
                    }

                    array = arrayArg.toString();
                }
            }
        }

        array = validateArray(arrayArg).array.map(v => {
            if (typeof v === 'object') return JSON.stringify(v);
            return String(v);
        });
        listLookup.setItems(list, array);
    }
    data_listforeachnum (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = listLookup.items(list).length;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            this.setVariableTo({
                VARIABLE: args.INDEX,
                VALUE: util.stackFrame.loopCounter
            }, util);
            util.startBranch(1, true);
        }
    }
    data_listforeachitem (args, util) {
        const list = util.target.lookupOrCreateList(
            args.LIST.id, args.LIST.name);
        if (typeof util.stackFrame.loopCounter === 'undefined') {
            util.stackFrame.loopCounter = listLookup.items(list).length;
        }
        // Only execute once per frame.
        // When the branch finishes, `repeat` will be executed again and
        // the second branch will be taken, yielding for the rest of the frame.
        // Decrease counter
        util.stackFrame.loopCounter--;
        // If we still have some left, start the branch.
        if (util.stackFrame.loopCounter >= 0) {
            this.setVariableTo({
                VARIABLE: args.INDEX,
                VALUE: listLookup.items(list)[util.stackFrame.loopCounter]
            }, util);
            util.startBranch(1, true);
        }
    }
    
    _listFilterItem = [""]
    _listFilterIndex = [0]
}

module.exports = Scratch3DataBlocks;
