/**
 * @fileoverview
 * Object representing a Scratch variable.
 */

const uid = require('../util/uid');
const xmlEscape = require('../util/xml-escape');
const listLookup = require('./list-lookup');

// PMDESKTOP_LISTLOOKUP (section 62): a list keeps its items in _value; reading or setting value marks
// them as seen by outside code, which turns off the list's lookup table (see list-lookup.js).
function getListValue () {
    this._exposed = true;
    this._lookup = null;
    return this._value;
}
function setListValue (value) {
    this._value = value;
    this._exposed = true;
    this._lookup = null;
}

class Variable {
    /**
     * @param {string} id Id of the variable.
     * @param {string} name Name of the variable.
     * @param {string} type Type of the variable, one of '' or 'list'
     * @param {boolean} isCloud Whether the variable is stored in the cloud.
     * @constructor
     */
    constructor (id, name, type, isCloud) {
        this.id = id || uid();
        this.name = name;
        this.type = type;
        this.isCloud = isCloud;
        switch (this.type) {
        case Variable.SCALAR_TYPE:
            this.value = 0;
            break;
        case Variable.LIST_TYPE:
            Object.defineProperties(this, {
                _value: {value: [], writable: true, configurable: true},
                _exposed: {value: false, writable: true, configurable: true},
                _lookup: {value: null, writable: true, configurable: true},
                _lookupStats: {value: null, writable: true, configurable: true},
                value: {get: getListValue, set: setListValue, enumerable: true, configurable: true}
            });
            break;
        case Variable.BROADCAST_MESSAGE_TYPE:
            this.value = this.name;
            break;
        default:
            console.warn(`Invalid variable type: ${this.type}`);
        }
    }

    toXML (isLocal) {
        isLocal = (isLocal === true);
        return `<variable type="${this.type}" id="${this.id}" islocal="${isLocal
        }" iscloud="${this.isCloud}">${xmlEscape(this.name)}</variable>`;
    }

    // PMDESKTOP_LISTLOOKUP (section 125, step 5e): the way for extensions to use a variable's value without
    // turning off a list's lookup table (reading or setting `value` still works, as the fallback).

    /**
     * The value; for a list its items array, without marking it as seen by outside code. Read it or
     * change it in place, then call itemsChanged() unless items were only added at the end. Don't keep it.
     * @returns {*} The value.
     */
    pmGetValue () {
        return listLookup.items(this);
    }

    /**
     * Sets the value; for a list, a new items array that nobody else keeps.
     * @param {*} value The new value.
     */
    pmSetValue (value) {
        if (this.type === Variable.LIST_TYPE) {
            listLookup.setItems(this, value);
            this._monitorUpToDate = false;
        } else {
            this.value = value;
        }
    }

    /**
     * Call after changing a list's items array (from pmGetValue) in place.
     */
    pmItemsChanged () {
        listLookup.changed(this);
        this._monitorUpToDate = false;
    }

    /**
     * Position of the first list item equal to `item` (Cast.compare), using the list's lookup table.
     * @param {*} item The item to look for.
     * @returns {number} 1-based position, 0 when there is none.
     */
    pmIndexOf (item) {
        return listLookup.indexOf(this, item);
    }

    /**
     * Type representation for scalar variables.
     * This is currently represented as ''
     * for compatibility with blockly.
     * @const {string}
     */
    static get SCALAR_TYPE () {
        return ''; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get LIST_TYPE () {
        return 'list'; // used by compiler
    }

    /**
     * Type representation for list variables.
     * @const {string}
     */
    static get BROADCAST_MESSAGE_TYPE () {
        return 'broadcast_msg';
    }
}

module.exports = Variable;
