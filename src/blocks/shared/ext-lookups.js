/**
 * Desktop fork (section 304): what the extension blocks that remember a lookup in compiled scripts do, written once
 * for the interpreter (the extensions' methods call these functions) and the compiler (jsgen.js writes the text
 * inline: the IR kinds qxsck.* / lms.* of section 149, search.* of sections 195 / 196, clones.* of sections 198 / 199):
 * Variables Expanded's list, JSON and search blocks, Extra Timers, Clones+'s variable blocks and Events Expansion's
 * "is broadcast received". Format: shared/index.js; `sites` (below) are the lookups. The helpers are the extensions'
 * functions with their arguments converted as the extension manager's wrapper does (the parameters after the site in
 * the block's input order); lists are read and changed only through the Variable methods (pmGetValue, pmSetValue,
 * pmItemsChanged, pmIndexOf), so section 62's lookup tables stay right.
 * The interpreter makes a new site on every call (it looks up every time, as the extension did); a compiled script
 * makes one per block with the name or ID fixed in the block and keeps the answer while the target is the same and
 * runtime.pmVarNamesVersion has not changed (no variable added, deleted or renamed since; section 149's counter).
 * pmdName / pmdNameAny: a list found by name ("Variable and list": the sprite's first; List Tools: the stage's
 * first). pmcOneSite keeps one target's variable for an ID, pmcManySite one per position in the clone list (another
 * target at that position is looked up again); pmcPlainOne / pmcPlainMany look up on every call. pmsVariable asks
 * Variables Expanded's own findVariable, pmsWritable "look up or create" (set, swap), pmsBroadcast the stage's
 * lookupBroadcastMsg, pmsTimer Extra Timers' own get_or_create. A helper reaches a compiled script only if its source
 * names it (jsexecute.js insertRuntime): hence pmcValue(pmcFind(…), site).
 */
module.exports = {
    helpers: {
        pmdName: `class pmdName {
    constructor (runtime, type, stageFirst, name) {
        this.runtime = runtime;
        this.type = type;
        this.stageFirst = stageFirst;
        this.name = name;
        this.target = null;
        this.version = -1;
        this.variable = null;
    }
    static find (runtime, target, name, type, stageFirst) {
        if (stageFirst) {
            const variable = runtime.getTargetForStage().lookupVariableByNameAndType(name, type);
            if (variable) return variable;
            return target.lookupVariableByNameAndType(name, type) || undefined;
        }
        return target.lookupVariableByNameAndType(name, type);
    }
    get (target) {
        if (target !== this.target || this.version !== this.runtime.pmVarNamesVersion) {
            this.variable = pmdName.find(this.runtime, target, this.name, this.type, this.stageFirst);
            this.target = target;
            this.version = this.runtime.pmVarNamesVersion;
        }
        return this.variable;
    }
}`,
        pmdNameAny: `class pmdNameAny {
    constructor (runtime, type, stageFirst) {
        this.runtime = runtime;
        this.type = type;
        this.stageFirst = stageFirst;
    }
    get (target, name) {
        return pmdName.find(this.runtime, target, name, this.type, this.stageFirst);
    }
}`,
        pmcOneSite: `class pmcOneSite {
    constructor (runtime, id) {
        this.runtime = runtime;
        this.id = id;
        this.target = null;
        this.version = -1;
        this.found = null;
    }
    variable (target) {
        if (target !== this.target || this.version !== this.runtime.pmVarNamesVersion) {
            this.found = target.lookupVariableById(this.id);
            this.target = target;
            this.version = this.runtime.pmVarNamesVersion;
        }
        return this.found;
    }
}`,
        pmcManySite: `class pmcManySite {
    constructor (runtime, id) {
        this.runtime = runtime;
        this.id = id;
        this.version = -1;
        this.targets = [];
        this.found = [];
    }
    begin (clones) {
        if (this.version !== this.runtime.pmVarNamesVersion || this.targets.length > clones.length) {
            this.version = this.runtime.pmVarNamesVersion;
            this.targets.length = 0;
            this.found.length = 0;
        }
    }
    variable (clone, index) {
        if (this.targets[index] !== clone) {
            this.targets[index] = clone;
            this.found[index] = clone.lookupVariableById(this.id);
        }
        return this.found[index];
    }
}`,
        pmcPlainOne: `class pmcPlainOne {
    constructor (runtime, id) {
        this.id = id;
    }
    variable (target) {
        return target.lookupVariableById(this.id);
    }
}`,
        pmcPlainMany: `class pmcPlainMany {
    constructor (runtime, id) {
        this.id = id;
    }
    begin () {}
    variable (clone) {
        return clone.lookupVariableById(this.id);
    }
}`,
        pmcMainGet: `(target, site) => {
    const variable = site.variable(target.sprite.clones[0]);
    return variable ? variable.value : "";
}`,
        pmcMainSet: `(target, site, value) => {
    const variable = site.variable(target.sprite.clones[0]);
    if (variable) variable.value = value;
}`,
        pmcFind: `(clones, check, expected) => {
    check.begin(clones);
    for (let index = 1; index < clones.length; index++) {
        const variable = check.variable(clones[index], index);
        if (variable && globalState.Cast.compare(variable.value, expected) === 0) return clones[index];
    }
    return null;
}`,
        pmcValue: `(clone, site) => (clone ? site.variable(clone).value : "")`,
        pmcSet: `(target, edit, value, check, expected) => {
    const clones = target.sprite.clones;
    edit.begin(clones);
    check.begin(clones);
    for (let index = 1; index < clones.length; index++) {
        const variable = check.variable(clones[index], index);
        if (variable && globalState.Cast.compare(variable.value, expected) === 0) {
            const found = edit.variable(clones[index], index);
            if (found) found.value = value;
        }
    }
}`,
        pmsVariable: `class pmsVariable {
    constructor (runtime, name) {
        this.runtime = runtime;
        this.name = name;
        this.target = null;
        this.version = -1;
        this.id = "";
        this.variable = null;
    }
    find (target) {
        this.id = this.runtime.ext_DICandSPmonitorsPlus.findVariable(this.name, {target});
        this.variable = this.id ? target.lookupVariableById(this.id) : null;
        this.target = target;
        this.version = this.runtime.pmVarNamesVersion;
    }
}`,
        pmsVarValue: `(target, site) => {
    if (target !== site.target || site.version !== site.runtime.pmVarNamesVersion) site.find(target);
    return site.id ? site.variable.value : 0;
}`,
        pmsVarExists: `(target, site) => {
    if (target !== site.target || site.version !== site.runtime.pmVarNamesVersion) site.find(target);
    return globalState.Cast.toBoolean(site.id);
}`,
        pmsBroadcast: `class pmsBroadcast {
    constructor (runtime, name) {
        this.runtime = runtime;
        this.name = name;
        this.version = -1;
        this.broadcast = null;
    }
}`,
        pmsReceived: `site => {
    if (site.version !== site.runtime.pmVarNamesVersion) {
        site.broadcast = site.runtime.getTargetForStage().lookupBroadcastMsg("", site.name);
        site.version = site.runtime.pmVarNamesVersion;
    }
    return globalState.Cast.toBoolean(site.broadcast && site.broadcast.isSent);
}`,
        pmsWritable: `class pmsWritable {
    constructor (runtime, name) {
        this.runtime = runtime;
        this.name = name;
        this.target = null;
        this.version = -1;
        this.variable = null;
    }
}`,
        pmsVarWrite: `(target, site) => {
    if (target !== site.target || site.version !== site.runtime.pmVarNamesVersion) {
        site.variable = target.lookupOrCreateVariable("", site.name);
        site.target = target;
        site.version = site.runtime.pmVarNamesVersion;
    }
    return site.variable;
}`,
        pmsVarSwap: `(var1, var2) => {
    const temp = var1.value;
    var1.value = var2.value;
    var2.value = temp;
}`,
        pmsVarShowing: `(runtime, target, site) => {
    if (target !== site.target || site.version !== runtime.pmVarNamesVersion) site.find(target);
    const info = runtime.getMonitorState().get(site.id);
    return info ? (info.get("visible") !== undefined && info.get("visible") !== false) : false;
}`,
        pmsVarSlider: `(runtime, target, site, which) => {
    if (target !== site.target || site.version !== runtime.pmVarNamesVersion) site.find(target);
    const info = runtime.getMonitorState().get(site.id);
    if (info === undefined) return 0;
    return info.get(which === "min" ? "sliderMin" : "sliderMax");
}`,
        pmsVarButton: `(runtime, target, site, type) => {
    if (target !== site.target || site.version !== runtime.pmVarNamesVersion) site.find(target);
    return runtime.ext_DICandSPmonitorsPlus.pmButtonPressed(site.id, type);
}`,
        pmsTimer: `class pmsTimer {
    constructor (runtime, id, name) {
        this.runtime = runtime;
        this.id = id;
        this.name = name;
        this.target = null;
        this.version = -1;
        this.timer = null;
    }
}`,
        pmsTimerGet: `(target, site) => {
    if (target !== site.target || site.version !== site.runtime.pmVarNamesVersion) {
        site.timer = site.runtime.ext_steve0greatnesstimers.get_or_create(target, site.id, site.name);
        site.target = target;
        site.version = site.runtime.pmVarNamesVersion;
    }
    return site.timer;
}`,
        pmsTimerToggle: `timer => {
    if (timer.is_paused) timer.unpause();
    else timer.pause();
}`,
        pmsTimerStop: `timer => {
    timer.pause();
    timer.restart();
}`,
        pmdToJson: `(runtime, target, type, start) => {
    const serialized = {};
    for (const variable of Object.values(runtime.getTargetForStage().variables)) {
        if (variable.type === type && variable.name.startsWith(start)) {
            serialized[variable.name.replace(start, "")] = type === "list" ? variable.pmGetValue() : variable.value;
        }
    }
    for (const variable of Object.values(target.variables)) {
        if (variable.type === type && variable.name.startsWith(start)) {
            serialized[variable.name.replace(start, "")] = type === "list" ? variable.pmGetValue() : variable.value;
        }
    }
    return JSON.stringify(serialized);
}`,
        pmdItemOf: `(target, site, index, name) => {
    const variable = site.get(target, name);
    if (!variable) return 0;
    const position = globalState.Cast.toListIndex(index, variable.pmGetValue().length, false, target.runtime);
    if (position === "INVALID") return "";
    return variable.pmGetValue()[position - 1];
}`,
        pmdClear: `(target, site, name) => {
    const variable = site.get(target, name);
    if (variable) {
        variable.pmSetValue([]);
    }
}`,
        pmdDeleteOf: `(target, site, index, name) => {
    const variable = site.get(target, name);
    if (variable) {
        const position = globalState.Cast.toListIndex(index, variable.pmGetValue().length, true, target.runtime);
        if (position === "ALL") {
            variable.pmSetValue([]);
        } else if (position !== "INVALID") {
            variable.pmGetValue().splice(position - 1, 1);
            variable.pmItemsChanged();
        }
    }
}`,
        pmdAdd: `(target, site, value, name) => {
    const variable = site.get(target, name);
    if (variable) {
        variable.pmGetValue().push(value);
        variable._monitorUpToDate = false;
    }
}`,
        pmdReplace: `(target, site, index, name, value) => {
    const variable = site.get(target, name);
    if (variable) {
        const position = globalState.Cast.toListIndex(index, variable.pmGetValue().length, false, target.runtime);
        if (position !== "INVALID") {
            variable.pmGetValue()[position - 1] = value;
            variable.pmItemsChanged();
        }
    }
}`,
        pmdIndexesOf: `(target, site, value, name) => {
    const variable = site.get(target, name);
    if (variable) {
        const indexes = [];
        for (let i = 0; i < variable.pmGetValue().length; i++) {
            if (globalState.Cast.compare(variable.pmGetValue()[i], value) === 0) indexes.push(i + 1);
        }
        if (indexes.length > 0) return indexes.toString();
    }
    return "0";
}`,
        pmdLength: `(target, site, name) => {
    const variable = site.get(target, name);
    if (variable) {
        return variable.pmGetValue().length;
    }
    return 0;
}`,
        pmdContains: `(target, site, name, value) => {
    const variable = site.get(target, name);
    if (variable) {
        return variable.pmIndexOf(value) !== 0;
    }
    return false;
}`,
        pmdCopy: `(target, site1, site2, name1, name2) => {
    const list1 = site1.get(target, name1);
    const list2 = site2.get(target, name2);
    if (list1 && list2) {
        list2.pmSetValue(list1.pmGetValue().slice());
    }
}`,
        pmlDeleteItems: `(target, site, num1, num2, name) => {
    const list = site.get(target, name);
    if (!list) return;
    const listLength = list.pmGetValue().length;
    let first = 0;
    let last = 0;
    if (num1 > num2) {
        first = num2 - 1;
        last = num1 - 1;
    } else {
        first = num1 - 1;
        last = num2 - 1;
    }
    const listPart1 = list.pmGetValue().slice(0, first);
    const listPart2 = list.pmGetValue().slice(last + 1, listLength);
    list.pmSetValue(listPart1.concat(listPart2));
}`,
        pmlDeleteAll: `(target, site, item, name) => {
    const list = site.get(target, name);
    if (!list) return;
    const newList = list.pmGetValue().filter(model => model !== item);
    list.pmSetValue(newList);
}`,
        pmlReplaceAll: `(target, site, item1, item2, name) => {
    const list = site.get(target, name);
    if (!list) return;
    const listLength = list.pmGetValue().length;
    const newList = [];
    for (let i = 0; i < listLength; i++) {
        if (list.pmGetValue()[i] === item1) {
            newList.push(item2);
        } else {
            newList.push(list.pmGetValue()[i]);
        }
    }
    list.pmSetValue(newList);
}`,
        pmlRepeat: `(target, site1, site2, name1, num, name2) => {
    const list1 = site1.get(target, name1);
    if (!list1) return;
    const list2 = site2.get(target, name2);
    if (!list2) return;
    const currentVal = list1.pmGetValue();
    for (let i = 0; i < num; i++) {
        list2.pmSetValue(list2.pmGetValue().concat(currentVal));
    }
}`,
        pmlJoin: `(target, site, name, string) => {
    const list = site.get(target, name);
    if (!list) return "";
    return list.pmGetValue().join(string);
}`,
        pmlTimesAppears: `(target, site, item, name) => {
    const list = site.get(target, name);
    if (!list) return 0;
    return list.pmGetValue().filter(model => model == item).length;
}`,
        pmlItemIndex: `(target, site, index, item, name) => {
    const list = site.get(target, name);
    if (!list) return 0;
    const indexes = [];
    for (let i = 0; i < list.pmGetValue().length; i++) {
        if (list.pmGetValue()[i] === item) {
            indexes.push(i);
        }
    }
    switch (index) {
    case "first":
        return globalState.Cast.toNumber(indexes[0] + 1);
    case "last":
        return globalState.Cast.toNumber(indexes[indexes.length - 1] + 1);
    case "random":
        return globalState.Cast.toNumber(indexes[Math.floor(target.runtime.pmRandom() * indexes.length)] + 1);
    default:
        return globalState.Cast.toNumber(indexes[globalState.Cast.toNumber(index) - 1] + 1);
    }
}`,
        pmlOrderIs: `(target, site, name, order) => {
    const list = site.get(target, name);
    if (!list) return false;
    for (let i = 0; i < list.pmGetValue().length - 1; i++) {
        const compare = globalState.Cast.compare(list.pmGetValue()[i + 1], list.pmGetValue()[i]);
        if (compare > 0 && order === "descending") return false;
        if (compare < 0 && order === "ascending") return false;
    }
    return true;
}`,
        pmlOrder: `(target, site, name, order) => {
    const list = site.get(target, name);
    if (!list) return;
    if (order === "reversed") {
        list.pmGetValue().reverse();
    } else if (order === "randomised") {
        const randomised = list.pmGetValue()
            .map(value => ({value, sort: target.runtime.pmRandom()}))
            .sort((a, b) => a.sort - b.sort)
            .map(({value}) => value);
        list.pmSetValue(randomised);
    } else if (order === "ascending") {
        list.pmGetValue().sort(globalState.Cast.compare);
    } else if (order === "descending") {
        list.pmGetValue().sort(globalState.Cast.compare).reverse();
    }
    list.pmItemsChanged();
}`,
        pmlConcat: `(target, site1, site2, name1, name2) => {
    const list1 = site1.get(target, name1);
    if (!list1) return;
    const list2 = site2.get(target, name2);
    if (!list2) return;
    list2.pmSetValue(list2.pmGetValue().concat(list1.pmGetValue()));
}`
    },
    // Section 304: the lookups. `make` is made once per compiled script with the values fixed in the block (jsgen.js
    // gives them as literals); `plain` looks on every call (a compiled block whose name is a reporter, or the test
    // switch runtime.pmNoClonesVarRemember). The interpreter makes `plain` (or else `make`) on every call, each $value
    // from `args` (@ is the block's argument named in the block's `sites`).
    sites: {
        qxsckList: {make: 'new pmdName(runtime, "list", false, $name)', plain: 'new pmdNameAny(runtime, "list", false)'},
        lmsList: {make: 'new pmdName(runtime, "list", true, $name)', plain: 'new pmdNameAny(runtime, "list", true)'},
        variable: {make: 'new pmsVariable(runtime, $name)', args: {name: 'Cast.toString(@)'}},
        writable: {make: 'new pmsWritable(runtime, $name)', args: {name: 'Cast.toString(@)'}},
        broadcast: {make: 'new pmsBroadcast(runtime, $name)', args: {name: 'Cast.toString(@)'}},
        timer: {make: 'new pmsTimer(runtime, $id, $name)', args: {id: '@.id', name: '(@.name ?? @)'}},
        cloneOne: {make: 'new pmcOneSite(runtime, $id)', plain: 'new pmcPlainOne(runtime, $id)', args: {id: '@'}},
        cloneMany: {make: 'new pmcManySite(runtime, $id)', plain: 'new pmcPlainMany(runtime, $id)', args: {id: '@'}}
    },
    blocks: {
        // Variables Expanded: TurboWarp "Variable and list"'s blocks (section 149: qxsck.*)
        DICandSPmonitorsPlus_seriVarsToJson: {inputs: 'START:s', js: 'pmdToJson(runtime, thread.target, "", $START)'},
        DICandSPmonitorsPlus_seriListsToJson: {inputs: 'START:s', js: 'pmdToJson(runtime, thread.target, "list", $START)'},
        DICandSPmonitorsPlus_getValueOfList: {inputs: 'INDEX:s LIST:s', sites: 'SITE:qxsckList:LIST', js: 'pmdItemOf(thread.target, $SITE, $INDEX, $LIST)'},
        DICandSPmonitorsPlus_getIndexesOfList: {inputs: 'VALUE:s LIST:s', sites: 'SITE:qxsckList:LIST', js: 'pmdIndexesOf(thread.target, $SITE, $VALUE, $LIST)'},
        DICandSPmonitorsPlus_length: {inputs: 'LIST:s', sites: 'SITE:qxsckList:LIST', js: 'pmdLength(thread.target, $SITE, $LIST)'},
        DICandSPmonitorsPlus_listContains: {inputs: 'LIST:s VALUE:s', sites: 'SITE:qxsckList:LIST', js: 'pmdContains(thread.target, $SITE, $LIST, $VALUE)'},
        DICandSPmonitorsPlus_clearList: {inputs: 'LIST:s', sites: 'SITE:qxsckList:LIST', stack: 'pmdClear(thread.target, $SITE, $LIST);\n'},
        DICandSPmonitorsPlus_deleteOfList: {inputs: 'INDEX:s LIST:s', sites: 'SITE:qxsckList:LIST', stack: 'pmdDeleteOf(thread.target, $SITE, $INDEX, $LIST);\n'},
        DICandSPmonitorsPlus_addValueInList: {inputs: 'VALUE:s LIST:s', sites: 'SITE:qxsckList:LIST', stack: 'pmdAdd(thread.target, $SITE, $VALUE, $LIST);\n'},
        DICandSPmonitorsPlus_replaceOfList: {inputs: 'INDEX:s LIST:s VALUE:s', sites: 'SITE:qxsckList:LIST', stack: 'pmdReplace(thread.target, $SITE, $INDEX, $LIST, $VALUE);\n'},
        DICandSPmonitorsPlus_copyList: {inputs: 'LIST1:s LIST2:s', sites: 'SITE1:qxsckList:LIST1 SITE2:qxsckList:LIST2', stack: 'pmdCopy(thread.target, $SITE1, $SITE2, $LIST1, $LIST2);\n'},
        // Variables Expanded: List Tools' blocks (section 149: lms.*)
        DICandSPmonitorsPlus_getListJoin: {inputs: 'LIST:s STRING:s', sites: 'SITE:lmsList:LIST', js: 'pmlJoin(thread.target, $SITE, $LIST, $STRING)'},
        DICandSPmonitorsPlus_timesItemAppears: {inputs: 'ITEM:s LIST:s', sites: 'SITE:lmsList:LIST', js: 'pmlTimesAppears(thread.target, $SITE, $ITEM, $LIST)'},
        DICandSPmonitorsPlus_itemIndex: {inputs: 'INDEX:s ITEM:s LIST:s', sites: 'SITE:lmsList:LIST', js: 'pmlItemIndex(thread.target, $SITE, $INDEX, $ITEM, $LIST)'},
        DICandSPmonitorsPlus_orderIs: {inputs: 'LIST:s ORDER:s', sites: 'SITE:lmsList:LIST', js: 'pmlOrderIs(thread.target, $SITE, $LIST, $ORDER)'},
        DICandSPmonitorsPlus_deleteItems: {inputs: 'NUM1:n NUM2:n LIST:s', sites: 'SITE:lmsList:LIST', stack: 'pmlDeleteItems(thread.target, $SITE, $NUM1, $NUM2, $LIST);\n'},
        DICandSPmonitorsPlus_deleteAllOfItem: {inputs: 'ITEM:s LIST:s', sites: 'SITE:lmsList:LIST', stack: 'pmlDeleteAll(thread.target, $SITE, $ITEM, $LIST);\n'},
        DICandSPmonitorsPlus_replaceAllOfItem: {inputs: 'ITEM1:s ITEM2:s LIST:s', sites: 'SITE:lmsList:LIST', stack: 'pmlReplaceAll(thread.target, $SITE, $ITEM1, $ITEM2, $LIST);\n'},
        DICandSPmonitorsPlus_repeatList: {inputs: 'LIST1:s NUM:n LIST2:s', sites: 'SITE1:lmsList:LIST1 SITE2:lmsList:LIST2', stack: 'pmlRepeat(thread.target, $SITE1, $SITE2, $LIST1, $NUM, $LIST2);\n'},
        DICandSPmonitorsPlus_orderList: {inputs: 'LIST:s ORDER:s', sites: 'SITE:lmsList:LIST', stack: 'pmlOrder(thread.target, $SITE, $LIST, $ORDER);\n'},
        DICandSPmonitorsPlus_joinLists: {inputs: 'LIST1:s LIST2:s', sites: 'SITE1:lmsList:LIST1 SITE2:lmsList:LIST2', stack: 'pmlConcat(thread.target, $SITE1, $SITE2, $LIST1, $LIST2);\n'},
        // Variables Expanded: blocks that search by name (sections 195, 196: search.*). A name given by a reporter
        // keeps the direct call (irgen.js), so their compiled sites are always `make`.
        DICandSPmonitorsPlus_reportVal: {sites: 'SITE:variable:VARIABLE', js: 'pmsVarValue(thread.target, $SITE)'},
        DICandSPmonitorsPlus_exists: {sites: 'SITE:variable:VARIABLE', js: 'pmsVarExists(thread.target, $SITE)'},
        DICandSPmonitorsPlus_isShowing: {sites: 'SITE:variable:VARIABLE', js: 'pmsVarShowing(runtime, thread.target, $SITE)'},
        DICandSPmonitorsPlus_sliderMinMaxOfVarible: {inputs: 'MINMAX:r', sites: 'SITE:variable:VARIABLE', js: 'pmsVarSlider(runtime, thread.target, $SITE, $MINMAX)'},
        DICandSPmonitorsPlus_isButtonPressed: {inputs: 'TYPE:r', sites: 'SITE:variable:VARIABLE', js: 'pmsVarButton(runtime, thread.target, $SITE, $TYPE)'},
        DICandSPmonitorsPlus_setString: {inputs: 'STRING:r', sites: 'SITE:writable:VARIABLE', stack: 'pmsVarWrite(thread.target, $SITE).value = $STRING;\n'},
        DICandSPmonitorsPlus_swapVars: {sites: 'SITE1:writable:VAR1 SITE2:writable:VAR2', stack: 'pmsVarSwap(pmsVarWrite(thread.target, $SITE1), pmsVarWrite(thread.target, $SITE2));\n'},
        // Events Expansion (section 195)
        pmEventsExpansion_isBroadcastReceived: {sites: 'SITE:broadcast:BROADCAST', js: 'pmsReceived($SITE)'},
        // Extra Timers (section 196). The elapsed blocks skip Timer's number -> text -> number step (the same number).
        steve0greatnesstimers_getter: {sites: 'SITE:timer:TIMER', js: '(pmsTimerGet(thread.target, $SITE).elapsed * 0.001)'},
        steve0greatnesstimers_elapsed: {inputs: 'UNITS:n', sites: 'SITE:timer:TIMER', js: '(pmsTimerGet(thread.target, $SITE).elapsed * $UNITS)'},
        steve0greatnesstimers_is_paused: {sites: 'SITE:timer:TIMER', js: 'pmsTimerGet(thread.target, $SITE).is_paused'},
        steve0greatnesstimers_add: {inputs: 'TIME:n UNITS:n', sites: 'SITE:timer:TIMER', stack: 'pmsTimerGet(thread.target, $SITE).add($TIME * $UNITS);\n'},
        steve0greatnesstimers_pause: {sites: 'SITE:timer:TIMER', stack: 'pmsTimerGet(thread.target, $SITE).pause();\n'},
        steve0greatnesstimers_unpause: {sites: 'SITE:timer:TIMER', stack: 'pmsTimerGet(thread.target, $SITE).unpause();\n'},
        steve0greatnesstimers_restart: {sites: 'SITE:timer:TIMER', stack: 'pmsTimerGet(thread.target, $SITE).restart();\n'},
        steve0greatnesstimers_toggle: {sites: 'SITE:timer:TIMER', stack: 'pmsTimerToggle(pmsTimerGet(thread.target, $SITE));\n'},
        steve0greatnesstimers_stop: {sites: 'SITE:timer:TIMER', stack: 'pmsTimerStop(pmsTimerGet(thread.target, $SITE));\n'},
        // Clones+ (sections 198, 199: clones.*). The same steps as the extension: Cast.compare, the values as text
        // (the set blocks store text), "variable of clone" throws when the clone found lacks the variable.
        lmsclonesplus_getVariableOfMainSprite: {sites: 'SITE:cloneOne:INPUT', js: 'pmcMainGet(thread.target, $SITE)'},
        lmsclonesplus_setVariableOfMainSprite: {inputs: 'INPUTB:s', sites: 'SITE:cloneOne:INPUTA', stack: 'pmcMainSet(thread.target, $SITE, $INPUTB);\n'},
        lmsclonesplus_getVariableOfClone: {inputs: 'INPUTC:s', sites: 'CHECK:cloneMany:INPUTB SITE:cloneOne:INPUTA', js: 'pmcValue(pmcFind(thread.target.sprite.clones, $CHECK, $INPUTC), $SITE)'},
        lmsclonesplus_setVariableOfClone: {inputs: 'INPUTB:s INPUTD:s', sites: 'EDIT:cloneMany:INPUTA CHECK:cloneMany:INPUTC', stack: 'pmcSet(thread.target, $EDIT, $INPUTB, $CHECK, $INPUTD);\n'},
        lmsclonesplus_cloneExists: {inputs: 'INPUTB:s', sites: 'CHECK:cloneMany:INPUTA', js: '(pmcFind(thread.target.sprite.clones, $CHECK, $INPUTB) !== null)'}
    }
};
