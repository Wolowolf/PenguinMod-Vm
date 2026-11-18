
/* eslint-disable no-unused-vars */
/* eslint-disable prefer-template */
/* eslint-disable valid-jsdoc */
/* eslint-disable max-len */

const globalState = {
    Timer: require('../util/timer'),
    Cast: require('../util/cast'),
    log: require('../util/log'),
    blockUtility: require('./compat-block-utility'),
    // PMDESKTOP_LISTLOOKUP (section 62)
    listLookup: require('../engine/list-lookup'),
    thread: null,
    // Desktop fork (section 253): what a custom block throws after it ended the script ("delete this clone",
    // "stop all"); the top-level script's catch takes it (JSGenerator.retire, createScriptFactory).
    pmRetired: Object.freeze({toString: () => 'script ended inside a custom block'})
};

let baseRuntime = '';
const listLookupMinLength = require('../engine/list-lookup').MIN_LENGTH;
// Desktop fork (section 291)
const SharedBlocks = require('../blocks/shared');
const runtimeFunctions = {};

/**
 * Determine whether the current tick is likely stuck.
 * This implements similar functionality to the warp timer found in Scratch.
 * @returns {boolean} true if the current tick is likely stuck.
 */
baseRuntime += `let stuckCounter = 0;
const isStuck = () => {
    // The real time is not checked on every call for performance.
    stuckCounter++;
    if (stuckCounter === 100) {
        stuckCounter = 0;
        return globalState.thread.target.runtime.sequencer.timer.timeElapsed() > 500;
    }
    return false;
};`;

/**
 * Alternative for nullish Coalescing
 * @param {string} name The variable to get
 * @returns {any} The value of the temp var or an empty string if its nullish
 */
runtimeFunctions.nullish = `const nullish = (check, alt) => {
    if (!check) {
        if (val === undefined) return alt
        if (val === null) return alt
        return check
    } else {
        return check
    }
}`;

/**
 * Start hats by opcode.
 * @param {string} requestedHat The opcode of the hat to start.
 * @param {*} optMatchFields Fields to match.
 * @returns {Array} A list of threads that were started.
 */
runtimeFunctions.startHats = `const startHats = (requestedHat, optMatchFields) => {
    const thread = globalState.thread;
    const threads = thread.target.runtime.startHats(requestedHat, optMatchFields);
    return threads;
}`;

/**
 * Implements "thread waiting", where scripts are halted until all the scripts have finished executing.
 * @param {Array} threads The list of threads.
 */
runtimeFunctions.waitThreads = `const waitThreads = function*(threads) {
    const thread = globalState.thread;
    const runtime = thread.target.runtime;

    while (true) {
        // determine whether any threads are running
        let anyRunning = false;
        for (let i = 0; i < threads.length; i++) {
            if (runtime.threads.indexOf(threads[i]) !== -1) {
                anyRunning = true;
                break;
            }
        }
        if (!anyRunning) {
            // all threads are finished, can resume
            return;
        }

        let allWaiting = true;
        for (let i = 0; i < threads.length; i++) {
            if (!runtime.isWaitingThread(threads[i])) {
                allWaiting = false;
                break;
            }
        }
        if (allWaiting) {
            thread.status = 3; // STATUS_YIELD_TICK
        }

        yield;
    }
}`;

/**
 * waitPromise: Wait until a Promise resolves or rejects before continuing.
 * @param {Promise} promise The promise to wait for.
 * @returns {*} the value that the promise resolves to, otherwise undefined if the promise rejects
 */
runtimeFunctions.waitPromise = `
const waitPromise = function*(promise) {
    const thread = globalState.thread;
    let returnValue;
    let errorReturn;

    promise
        .then(value => {
            returnValue = value;
            thread.status = 0; // STATUS_RUNNING
        })
        .catch(error => {
            errorReturn = error;
            // i realized, i dont actually know what would happen if we never do this but throw and exit anyways
            thread.status = 0; // STATUS_RUNNING
        });

    // enter STATUS_PROMISE_WAIT and yield
    // this will stop script execution until the promise handlers reset the thread status
    thread.status = 1; // STATUS_PROMISE_WAIT
    yield;

    // throw the promise error if ee got one
    if (errorReturn) throw errorReturn
    return returnValue;
}`;

/**
 * executeInCompatibilityLayer: Execute a scratch-vm primitive.
 * @param {*} inputs The inputs to pass to the block.
 * @param {function} blockFunction The primitive's function.
 * @param {boolean} useFlags Whether to set flags (hasResumedFromPromise)
 * @param {string} blockId Block ID to set on the emulated block utility.
 * @param {*|null} branchInfo Extra information object for CONDITIONAL and LOOP blocks. See createBranchInfo().
 * @returns {*} the value returned by the block, if any.
 */
runtimeFunctions.executeInCompatibilityLayer = `let hasResumedFromPromise = false;

const isPromise = value => (
    // see engine/execute.js
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
);
const executeInCompatibilityLayer = function*(inputs, blockFunction, isWarp, useFlags, blockId, branchInfo, visualReport) {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    const stackFrame = branchInfo ? branchInfo.stackFrame : {};
    const finish = (returnValue) => {
        if (branchInfo) {
            if (typeof returnValue === 'undefined' && blockUtility._startedBranch) {
                branchInfo.isLoop = blockUtility._startedBranch[1];
                return blockUtility._startedBranch[0];
            }
            branchInfo.isLoop = branchInfo.defaultIsLoop;
            return returnValue;
        }
        return returnValue;
    };

    // reset the stackframe
    // we only ever use one stackframe at a time, so this shouldn't cause issues
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);

    const executeBlock = () => {
        blockUtility.init(thread, blockId, stackFrame, branchInfo);
        return blockFunction(inputs, blockUtility, visualReport);
    };

    let returnValue = executeBlock();
    if (isPromise(returnValue)) {
        returnValue = finish(yield* waitPromise(returnValue));
        if (useFlags) hasResumedFromPromise = true;
        return returnValue;
    }

    if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
        // Something external is forcing us to stop
        yield;
        // Make up a return value because whatever is forcing us to stop can't specify one
        return '';
    }

    while (thread.status === 2 /* STATUS_YIELD */ || thread.status === 3 /* STATUS_YIELD_TICK */) {
        // Yielded threads will run next iteration.
        if (thread.status === 2 /* STATUS_YIELD */) {
            thread.status = 0; // STATUS_RUNNING
            // Yield back to the event loop when stuck or not in warp mode.
            if (!isWarp || isStuck()) {
                yield;
            }
        } else {
            // status is STATUS_YIELD_TICK, always yield to the event loop
            yield;
        }

        returnValue = executeBlock();
        if (isPromise(returnValue)) {
            returnValue = finish(yield* waitPromise(returnValue));
            if (useFlags) hasResumedFromPromise = true;
            return returnValue;
        }

        if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
            yield;
            return finish('');
        }
    }
    return finish(returnValue);
}`;

/**
 * Desktop fork (section 130): an extension command, reporter or Boolean called without the compatibility layer's
 * generator (jsgen.js generateDirectExtensionCall). guardedExtensionCall does what executeInCompatibilityLayer does
 * before and for its first call of the block (reset the top stack frame, point the block utility at the thread and
 * block, call the block; here its function without the extension manager's wrapper, `pmDirect`, with arguments
 * already converted as the wrapper would). When the block returned a promise or changed the thread's status,
 * extensionCallUnfinished is true and the compiled code continues with finishExtensionCall, which does exactly what
 * executeInCompatibilityLayer does after its first call (wait for the promise, yield, call the block again with the
 * same arguments and stack frame object). The state is handed over in variables because nothing runs between the
 * two; finishExtensionCall takes it before it yields.
 * Uses isPromise, waitPromise and hasResumedFromPromise of executeInCompatibilityLayer (insertRuntime adds it).
 */
runtimeFunctions.guardedExtensionCall = `let extensionAnswer;
let extensionCallUnfinished = false;
let extensionCallState = null;
const guardedExtensionCall = (inputs, direct, isWarp, blockId) => {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    const stackFrame = {};
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    blockUtility.init(thread, blockId, stackFrame, null);
    const returnValue = direct.call(inputs, blockUtility);
    extensionCallUnfinished = thread.status !== 0 /* STATUS_RUNNING */ || isPromise(returnValue);
    if (extensionCallUnfinished) extensionCallState = [thread, inputs, direct, blockId, stackFrame, returnValue];
    return returnValue;
};
// Desktop fork (section 191): the two halves of guardedExtensionCall around a block function that jsgen.js calls at the
// block's own place in the compiled script (generateDirectExtensionCall): the same setup, after the arguments were
// worked out, and the same check, which answers true when the compiled code must continue with finishExtensionCall.
const guardedExtensionCallSetup = (inputs, stackFrame, isWarp, blockId) => {
    const thread = globalState.thread;
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    globalState.blockUtility.init(thread, blockId, stackFrame, null);
    return inputs;
};
const guardedExtensionCallCheck = (thread, inputs, direct, blockId, frame, returnValue) => {
    if (thread.status === 0 /* STATUS_RUNNING */ && !isPromise(returnValue)) return false;
    extensionCallState = [thread, inputs, direct, blockId, frame, returnValue];
    return true;
};
const finishExtensionCall = function*(isWarp, useFlags) {
    const [thread, inputs, direct, blockId, stackFrame, firstValue] = extensionCallState;
    extensionCallState = null;
    extensionCallUnfinished = false;
    const blockUtility = globalState.blockUtility;
    let returnValue = firstValue;
    if (isPromise(returnValue)) {
        returnValue = yield* waitPromise(returnValue);
        if (useFlags) hasResumedFromPromise = true;
        return returnValue;
    }
    if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
        yield;
        return '';
    }
    while (thread.status === 2 /* STATUS_YIELD */ || thread.status === 3 /* STATUS_YIELD_TICK */) {
        if (thread.status === 2 /* STATUS_YIELD */) {
            thread.status = 0; // STATUS_RUNNING
            if (!isWarp || isStuck()) {
                yield;
            }
        } else {
            yield;
        }
        blockUtility.init(thread, blockId, stackFrame, null);
        returnValue = direct.call(inputs, blockUtility);
        if (isPromise(returnValue)) {
            returnValue = yield* waitPromise(returnValue);
            if (useFlags) hasResumedFromPromise = true;
            return returnValue;
        }
        if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
            yield;
            return '';
        }
    }
    return returnValue;
}`;

/**
 * Desktop fork (section 132): a direct extension call without the check (jsgen.js generateDirectExtensionCall, for
 * the blocks in direct-blocks.json, which never return a promise, yield, change a thread's status or read stack
 * frames): the same stack frame reset, block utility and call as guardedExtensionCall, nothing handed over, so a
 * script made only of such calls need not be a generator.
 */
runtimeFunctions.directExtensionCall = `const directExtensionCall = (inputs, direct, isWarp, blockId) => {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    blockUtility.init(thread, blockId, {}, null);
    return direct.call(inputs, blockUtility);
}`;

/**
 * Desktop fork (section 160): the setup of a plain call (section 132) whose block function jsgen.js calls at the
 * block's own place in the compiled script (generateDirectExtensionCall): the same stack frame reset and block utility
 * as directExtensionCall, after the arguments were worked out; gives the arguments object back for the call.
 */
runtimeFunctions.directExtensionSetup = `const directExtensionSetup = (inputs, isWarp, blockId) => {
    const thread = globalState.thread;
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    globalState.blockUtility.init(thread, blockId, {}, null);
    return inputs;
};
// Desktop fork (section 183): the setup of a plain call right after another one (jsgen.js descendStack): what the first
// one wrote is still in place, only the block ID changes. Starting a hat can run another script at once
// (Runtime.startHats, executableHat), which leaves the block utility pointing at that script's thread: then all of it.
const directExtensionSetupKept = (inputs, isWarp, blockId) => {
    const thread = globalState.thread;
    if (globalState.blockUtility.thread !== thread) return directExtensionSetup(inputs, isWarp, blockId);
    thread.stack[0] = blockId;
    return inputs;
};
// (tests only, runtime.pmSetupAudit) the same, and records in runtime.pmSetupAuditFails anything the full setup would
// have changed
const directExtensionSetupAudit = (inputs, isWarp, blockId) => {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    if (blockUtility.thread === thread) {
        const frame = thread.stackFrames[thread.stackFrames.length - 1];
        const wrong = [];
        if (blockUtility._startedBranch !== null) wrong.push('_startedBranch');
        if (blockUtility._branchInfo !== null) wrong.push('_branchInfo');
        if (blockUtility.sequencer !== thread.target.runtime.sequencer) wrong.push('sequencer');
        const stackFrame = thread.compatibilityStackFrame;
        if (!stackFrame || Object.keys(stackFrame).length) wrong.push('compatibilityStackFrame');
        if (frame.warpMode !== Boolean(isWarp)) wrong.push('warpMode');
        for (const field of ['isLoop', 'justReported', 'reported', 'waitingReporter', 'params', 'executionContext', 'op']) {
            if (frame[field] !== (field === 'isLoop' ? false : null)) wrong.push(field);
        }
        if (wrong.length) {
            const runtime = thread.target.runtime;
            (runtime.pmSetupAuditFails = runtime.pmSetupAuditFails || []).push(blockId + ': ' + wrong.join(' '));
        }
    }
    return directExtensionSetupKept(inputs, isWarp, blockId);
}`;

/**
 * Desktop fork (section 152): an extension branch or loop block (CONDITIONAL, LOOP) called without the
 * compatibility layer's generator (jsgen.js, irgen.js getBranchCallKind 'direct'), like guardedExtensionCall: the
 * first call does what executeInCompatibilityLayer does before and for its first call with the branch info (stack
 * frame, block utility; arguments converted as the wrapper would), and answers the branch to run as its `finish`
 * does. When the block returned a promise or changed the thread's status, extensionCallUnfinished is true and the
 * compiled code continues with finishExtensionCallBranch, which does exactly what executeInCompatibilityLayer does
 * after its first call (the branch started is read after the wait, as there). Uses guardedExtensionCall's
 * variables (insertRuntime adds it: the name contains it).
 */
runtimeFunctions.guardedExtensionCallBranch = `const startedExtensionBranch = (branchInfo, returnValue) => {
    const blockUtility = globalState.blockUtility;
    if (typeof returnValue === 'undefined' && blockUtility._startedBranch) {
        branchInfo.isLoop = blockUtility._startedBranch[1];
        return blockUtility._startedBranch[0];
    }
    branchInfo.isLoop = branchInfo.defaultIsLoop;
    return returnValue;
};
const guardedExtensionCallBranch = (inputs, direct, isWarp, blockId, branchInfo) => {
    const thread = globalState.thread;
    const blockUtility = globalState.blockUtility;
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    blockUtility.init(thread, blockId, branchInfo.stackFrame, branchInfo);
    const returnValue = direct.call(inputs, blockUtility);
    extensionCallUnfinished = thread.status !== 0 /* STATUS_RUNNING */ || isPromise(returnValue);
    if (extensionCallUnfinished) {
        extensionCallState = [thread, inputs, direct, blockId, branchInfo, returnValue];
        return;
    }
    return startedExtensionBranch(branchInfo, returnValue);
};
// Desktop fork (section 191): guardedExtensionCallBranch's setup, for a call at the block's own place (jsgen.js)
const guardedExtensionCallBranchSetup = (inputs, isWarp, blockId, branchInfo) => {
    const thread = globalState.thread;
    thread.stackFrames[thread.stackFrames.length - 1].reuse(isWarp);
    globalState.blockUtility.init(thread, blockId, branchInfo.stackFrame, branchInfo);
    return inputs;
};
const finishExtensionCallBranch = function*(isWarp) {
    const [thread, inputs, direct, blockId, branchInfo, firstValue] = extensionCallState;
    extensionCallState = null;
    extensionCallUnfinished = false;
    const blockUtility = globalState.blockUtility;
    let returnValue = firstValue;
    if (isPromise(returnValue)) {
        return startedExtensionBranch(branchInfo, yield* waitPromise(returnValue));
    }
    if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
        yield;
        return '';
    }
    while (thread.status === 2 /* STATUS_YIELD */ || thread.status === 3 /* STATUS_YIELD_TICK */) {
        if (thread.status === 2 /* STATUS_YIELD */) {
            thread.status = 0; // STATUS_RUNNING
            if (!isWarp || isStuck()) {
                yield;
            }
        } else {
            yield;
        }
        blockUtility.init(thread, blockId, branchInfo.stackFrame, branchInfo);
        returnValue = direct.call(inputs, blockUtility);
        if (isPromise(returnValue)) {
            return startedExtensionBranch(branchInfo, yield* waitPromise(returnValue));
        }
        if (thread.status === 1 /* STATUS_PROMISE_WAIT */ || thread.status === 4 /* STATUS_DONE */) {
            yield;
            return startedExtensionBranch(branchInfo, '');
        }
    }
    return startedExtensionBranch(branchInfo, returnValue);
}`;

/**
 * Desktop fork (section 152): the inline code of Extra Controls' branch and loop blocks (irgen.js BRANCH_INLINE).
 * Each does exactly what the extension manager's wrapper (argument conversion by type) and then the block's
 * function in Extra-Controls.js do, with the branch info's stack frame as `util.stackFrame`, and answers like
 * executeInCompatibilityLayer's `finish`: the branch started (setting isLoop), else undefined. Parameters in the
 * block's input order, so the inputs are worked out in the same order.
 */
runtimeFunctions.pmBranchInline = `const pmBranchString = value => (typeof value === 'string' ? value : globalState.Cast.toString(value));
const pmBranchBoolean = value => (typeof value === 'boolean' ? value : globalState.Cast.toBoolean(value));
const pmBranchStart = (branchInfo, isLoop) => {
    branchInfo.isLoop = isLoop;
    return 1;
};
const pmBranchNone = branchInfo => {
    branchInfo.isLoop = branchInfo.defaultIsLoop;
};
const pmBranchStartTimer = (stackFrame, duration) => {
    const runtime = globalState.thread.target.runtime;
    stackFrame.timer = new globalState.Timer({now: () => runtime.currentMSecs});
    stackFrame.timer.start();
    stackFrame.duration = duration;
    runtime.requestRedraw();
};
const pmBranchInline_ifPart = (branchInfo, CON, ID, extension) => {
    const Cast = globalState.Cast;
    CON = pmBranchBoolean(CON);
    ID = pmBranchString(ID);
    const con = Cast.toBoolean(CON);
    extension.pmConditionStorage[Cast.toString(ID)] = con;
    if (con) return pmBranchStart(branchInfo, false);
    pmBranchNone(branchInfo);
};
const pmBranchInline_elsePart = (branchInfo, ID, extension) => {
    ID = pmBranchString(ID);
    const conditionStorage = extension.pmConditionStorage;
    const id = globalState.Cast.toString(ID);
    if (conditionStorage[id] !== undefined && conditionStorage[id] === false) return pmBranchStart(branchInfo, false);
    pmBranchNone(branchInfo);
};
const pmBranchSecUntil = (branchInfo, NUM, CON) => {
    const Cast = globalState.Cast;
    const stackFrame = branchInfo.stackFrame;
    const con = Cast.toBoolean(CON);
    if (con) return pmBranchNone(branchInfo);
    if (!stackFrame.timer) {
        pmBranchStartTimer(stackFrame, Math.max(0, 1000 * Cast.toNumber(NUM)));
        return pmBranchStart(branchInfo, true);
    } else if (stackFrame.timer.timeElapsed() < stackFrame.duration && !con) {
        return pmBranchStart(branchInfo, true);
    }
    pmBranchNone(branchInfo);
};
const pmBranchInline_repeatSecUntil = (branchInfo, NUM, CON) =>
    pmBranchSecUntil(branchInfo, pmBranchString(NUM), pmBranchBoolean(CON));
const pmBranchInline_waitChanged = (branchInfo, THING) => {
    const Cast = globalState.Cast;
    const stackFrame = branchInfo.stackFrame;
    const input = Cast.toString(THING);
    if (stackFrame.SPwaitChange === undefined) stackFrame.SPwaitChange = input;
    if (Cast.compare(stackFrame.SPwaitChange, input) === 0) return pmBranchStart(branchInfo, true);
    pmBranchNone(branchInfo);
};
const pmBranchInline_repeatForUntil = (branchInfo, NUM, CON) => {
    const Cast = globalState.Cast;
    const stackFrame = branchInfo.stackFrame;
    NUM = pmBranchString(NUM);
    CON = pmBranchBoolean(CON);
    if (typeof stackFrame.loopCounter === 'undefined') stackFrame.loopCounter = Math.round(Cast.toNumber(NUM));
    stackFrame.loopCounter--;
    if (!Cast.toBoolean(CON) && stackFrame.loopCounter >= 0) return pmBranchStart(branchInfo, true);
    pmBranchNone(branchInfo);
};
const pmBranchInline_spayedCondition = (branchInfo, CON1, CON2) => {
    const Cast = globalState.Cast;
    const stackFrame = branchInfo.stackFrame;
    CON1 = pmBranchBoolean(CON1);
    CON2 = pmBranchBoolean(CON2);
    if (typeof stackFrame.index === 'undefined') stackFrame.index = true;
    if (!Cast.toBoolean(CON1) && stackFrame.index) return pmBranchNone(branchInfo);
    if (!Cast.toBoolean(CON2)) {
        stackFrame.index = false;
        return pmBranchStart(branchInfo, true);
    }
    stackFrame.index = true;
    pmBranchNone(branchInfo);
}`;

/**
 * @param {boolean} isLoop True if the block is a LOOP by default (can be overridden by startBranch() call)
 * @returns {unknown} Branch info object for compatibility layer.
 */
runtimeFunctions.createBranchInfo = `const createBranchInfo = (isLoop) => ({
    defaultIsLoop: isLoop,
    isLoop: false,
    branch: 0,
    stackFrame: {},
    onEnd: [],
});`;

/**
 * End the current script.
 */
runtimeFunctions.retire = `const retire = () => {
    const thread = globalState.thread;
    thread.target.runtime.sequencer.retireThread(thread);
}`;

/**
 * Scratch cast to boolean.
 * Similar to Cast.toBoolean()
 * @param {*} value The value to cast
 * @returns {boolean} The value cast to a boolean
 */
runtimeFunctions.toBoolean = `const toBoolean = value => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value === '' || value === '0' || value.toLowerCase() === 'false') {
            return false;
        }
        return true;
    }
    return !!value;
}`;

// Desktop fork (section 291): the helpers of the shared block definitions (src/blocks/shared: Operators, Variables
// and Lists; Motion, Looks, Sound, section 292; Sensing, Control, section 293; section 294: the Operators, Motion and
// Sensing Expansion helpers pmx… and the small pure extension blocks' pmi…; section 304: the lookup blocks' pmd…, pml…,
// pms…, pmc…), the same source text the interpreter's functions are made from.
baseRuntime += SharedBlocks.baseSource();
Object.assign(runtimeFunctions, SharedBlocks.helperSources());

/**
 * Desktop fork (section 138): helpers for other core blocks that used the compatibility layer (jsgen.js, irgen.js
 * descendCoreInlineInput). Each is the block's function from src/blocks with its inputs already converted where
 * the block converts them; the parameters are in the block's input order. Those in PURE_HELPER_NAMES read nothing
 * but their parameters.
 */
// Desktop fork (section 187): sin and cos of whole numbers from the premade table, a 0 worked out (it may be -0)
// Desktop fork (section 243): the table only for whole numbers within 100 turns. The table reduces the angle exactly
// (% 360), the interpreter's formula does not: from 66,021 on the two differ in the 10th decimal, and for huge
// numbers (1e37) completely. Within 36,000 they are equal for every whole number (checked); beyond it the formula
// (section 291: the shared definition's).
runtimeFunctions.coreSin = `const coreSin = (runtime, value) => {
    if (value >= -36000 && value <= 36000 && Number.isInteger(value)) {
        const known = runtime.optimizationUtil.sin[((value % 360) + 360) % 360];
        if (known !== 0) return known;
    }
    return ${SharedBlocks.inline('operator_mathop', {NUM: 'value'}, 'sin')};
}`;
runtimeFunctions.coreCos = `const coreCos = (runtime, value) => {
    if (value >= -36000 && value <= 36000 && Number.isInteger(value)) {
        const known = runtime.optimizationUtil.cos[((value % 360) + 360) % 360];
        if (known !== 0) return known;
    }
    return ${SharedBlocks.inline('operator_mathop', {NUM: 'value'}, 'cos')};
}`;
// Desktop fork (section 185): the util of a block function called directly that asks an I/O device (BlockUtility.ioQuery)
runtimeFunctions.coreIoUtil = `const coreIoUtil = (runtime, target) => ({
    target,
    ioQuery: (device, func, args) => {
        const object = runtime.ioDevices[device];
        if (object && object[func]) return object[func].apply(object, args);
    }
})`;

/**
 * Generate a random integer.
 * @param {number} low Lower bound
 * @param {number} high Upper bound
 * @returns {number} A random integer between low and high, inclusive.
 */
// Desktop fork (section 155): random numbers and the clock come from the runtime (runtime.pmRandom,
// runtime.pmDateNow) in the core block helpers here and below
runtimeFunctions.randomInt = `const randomInt = (runtime, low, high) => low + Math.floor(runtime.pmRandom() * ((high + 1) - low))`;

/**
 * Generate a random float.
 * @param {number} low Lower bound
 * @param {number} high Upper bound
 * @returns {number} A random floating point number between low and high.
 */
runtimeFunctions.randomFloat = `const randomFloat = (runtime, low, high) => (runtime.pmRandom() * (high - low)) + low`;

/**
 * Create and start a timer.
 * @returns {Timer} A started timer
 */
runtimeFunctions.timer = `const timer = () => {
    const t = new globalState.Timer({
        now: () => globalState.thread.target.runtime.currentMSecs
    });
    t.start();
    return t;
}`;

/**
 * Get a value from a list.
 * @param {Array} list The list
 * @param {*} idx The 1-indexed index in the list.
 * @returns {*} The list item, otherwise empty string if it does not exist.
 */

/**
 * pm: Returns whether a list contains a value, using Array.some
 * @param {!Variable} list The list.
 * @param {*} item The value to search for.
 * @returns {boolean} True if the list contains the item
 */
runtimeFunctions.listContainsFastest = `const listContainsFastest = (list, item) => {
    const items = listItems(list);
    if (items.length < ${listLookupMinLength}) return items.some(litem => compareEqual(litem, item));
    const found = listLookup.lookup(list, items, item);
    if (found !== -1) return found !== 0;
    let compared = 0;
    const result = items.some(litem => (compared++, compareEqual(litem, item)));
    listLookup.searched(list, items, compared);
    return result;
}`;

runtimeFunctions.resolveImageURL = `const resolveImageURL = imgURL => 
    typeof imgURL === 'object' && imgURL.type === 'canvas'
        ? Promise.resolve(imgURL.canvas)
        : new Promise(async resolve => {
            if (!await vm.securityManager.canFetch(imgUrl)) return resolve();
            const image = new Image();
            image.crossOrigin = "anonymous";
            image.onload = resolve(image);
            image.onerror = resolve; // ignore loading errors lol!
            image.src = ''+imgURL;
        })`;

runtimeFunctions.parseJSONSafe = `const parseJSONSafe = json => {
    try return JSON.parse(json)
    catch return {}
}`;

runtimeFunctions._resolveKeyPath = `const _resolveKeyPath = (obj, keyPath) => {
    if (!keyPath) return [obj, keyPath];
    const path = keyPath.matchAll(/(\\.|^)(?<key>[^.[]+)|\\[(?<litkey>(\\\\\\]|\\\\|[^]])+)\\]/g);
    let top = obj;
    let pre;
    let tok;
    let key;
    while (!(tok = path.next()).done) {
        key = tok.value.groups.key ?? tok.value.groups.litKey.replaceAll('\\\\\\\\', '\\\\').replaceAll('\\\\]', ']');
        pre = top;
        top = top?.get?.(key) ?? top?.[key];
        if (top === undefined) return [obj, keyPath];
    }
    return [pre, key];
}`;

runtimeFunctions.get = `const get = (obj, keyPath) => {
    const [root, key] = _resolveKeyPath(obj, keyPath);
    if ((Object.getPrototypeOf(root) !== Object && Object.getPrototypeOf(root) !== null) && typeof root.get !== 'function') return '';
    return typeof root === 'undefined' 
        ? '' 
        : root.get?.(key) ?? root[key];
}`;

runtimeFunctions.set = `const set = (obj, keyPath, val) => {
    const [root, key] = _resolveKeyPath(obj, keyPath);
    if ((Object.getPrototypeOf(root) !== Object && Object.getPrototypeOf(root) !== null) && typeof root.set !== 'function') return '';
    return typeof root === 'undefined' 
        ? '' 
        : root.set?.(key, val) ?? (root[key] = val);
}`;

runtimeFunctions.remove = `const remove = (obj, keyPath) => {
    const [root, key] = _resolveKeyPath(obj, keyPath);
    if ((Object.getPrototypeOf(root) !== Object && Object.getPrototypeOf(root) !== null) && typeof root.remove !== 'function' && typeof root.delete !== 'function') return '';
    return typeof root === 'undefined' 
        ? '' 
        : root.delete?.(key) ?? root.remove?.(key) ?? (delete root[key]);
}`;

runtimeFunctions.includes = `const includes = (obj, keyPath) => {
    const [root, key] = _resolveKeyPath(obj, keyPath);
    if ((Object.getPrototypeOf(root) !== Object && Object.getPrototypeOf(root) !== null) && typeof root.has !== 'function') return '';
    return typeof root === 'undefined' 
        ? '' 
        : root.has?.(key) ?? (key in root);
}`;

/**
 * Step a compiled thread.
 * @param {Thread} thread The thread to step.
 */
const execute = thread => {
    globalState.thread = thread;
    // Desktop fork (section 253): a script that never pauses is a plain function, run once to its end
    const compiledFunction = thread.compiledFunction;
    if (compiledFunction) compiledFunction();
    else thread.generator.next();
};

const threadStack = [];
const saveGlobalState = () => {
    threadStack.push(globalState.thread);
};
const restoreGlobalState = () => {
    globalState.thread = threadStack.pop();
};

const insertRuntime = source => {
    let result = baseRuntime;
    for (const functionName of Object.keys(runtimeFunctions)) {
        // Desktop fork (section 130): guarded extension calls use the compatibility layer's helpers
        if (source.includes(functionName) ||
            (functionName === 'executeInCompatibilityLayer' && source.includes('guardedExtensionCall')) ||
            // (section 152: inline branch code after which the loop checks hasResumedFromPromise)
            (functionName === 'executeInCompatibilityLayer' && source.includes('hasResumedFromPromise'))) {
            result += `${runtimeFunctions[functionName]};`;
        }
    }
    if (result.includes('executeInCompatibilityLayer') && !result.includes('const waitPromise')) {
        result = result.replace('let hasResumedFromPromise = false;', `let hasResumedFromPromise = false;\n${runtimeFunctions.waitPromise}`);
    }
    if (result.includes('_resolveKeyPath') && !result.includes('const _resolveKeyPath')) {
        result = runtimeFunctions._resolveKeyPath + ';' + result;
    }
    result += `return ${source}`;
    return result;
};

/**
 * Evaluate arbitrary JS in the context of the runtime.
 * @param {string} source The string to evaluate.
 * @returns {*} The result of evaluating the string.
 */
const scopedEval = source => {
    const withRuntime = insertRuntime(source);
    try {
        return new Function('globalState', withRuntime)(globalState);
    } catch (e) {
        globalState.log.error('was unable to compile script', withRuntime);
        console.log(e);
        throw e;
    }
};

// PMDESKTOP_FOLD (section 44): evaluates an expression that uses no project state (only the runtime helpers
// below, which are the very same source text compiled scripts get) while a script is being compiled.
// The helpers and the evaluating function are made once; each call is a plain eval of the expression.
const PURE_HELPER_NAMES = ["toBoolean", "compareGreaterThan", "compareLessThan", "mod", "tan",
    // section 138
    "coreNumber", "coreConstrain", "coreLerp", "coreRoot", "coreLog", "coreIndexOf", "coreLastIndexOf", "coreCountIn",
    "coreHasLetterFrom", "coreLetters", "coreLine", "coreIsNumber", "coreDistanceTo",
    // section 187
    "coreSin", "coreCos",
    // section 140 (section 294: from src/blocks/shared/ext-expansions.js)
    "pmxIsInteger", "pmxIsPrime", "pmxBetween", "pmxPartOfRatio", "pmxSimplifyRatio", "pmxTextAfter", "pmxTextBefore"];
let pureEvaluator = null;
const evalPure = (source, runtime) => {
    if (pureEvaluator === null) {
        let helpers = baseRuntime;
        for (const name of PURE_HELPER_NAMES) helpers += `${runtimeFunctions[name]};`;
        // (section 234) the in-place "mod" with a fixed modulus keeps its remainder here
        helpers += "let modTemp;";
        helpers += "return (runtime, source) => eval(source);";
        pureEvaluator = new Function("globalState", helpers)(globalState);
    }
    return pureEvaluator(runtime, source);
};

execute.scopedEval = scopedEval;
execute.evalPure = evalPure;
execute.runtimeFunctions = runtimeFunctions;
execute.saveGlobalState = saveGlobalState;
execute.restoreGlobalState = restoreGlobalState;
// not actually used, this is an export for extensions
execute.globalState = globalState;

module.exports = execute;
