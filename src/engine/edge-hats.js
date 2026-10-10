/**
 * @fileoverview
 * PMDESKTOP_EDGEHATS (section 63): edge-activated hats are only checked again when their answer can have changed.
 *
 * Every frame the engine starts a thread for every edge-activated hat ("when <>", "when timer >", ...) in every
 * sprite and clone, only to evaluate its condition; the script runs when the answer turns from false to true.
 * For two kinds of hats this file can tell, without that thread, that the answer would be the same as at the last
 * check, so the check would change nothing (the stored answer stays the same and the script does not start):
 * - "when <condition>" whose condition only uses numbers and text, variables, x position, y position, direction
 *   and operators without side effects: the hat remembers the values it read at its last check and is checked
 *   again as soon as one of them differs, however it was changed (blocks, extensions, the editor). Variables
 *   holding objects (extension types) are always checked, since an object can change without a new value.
 * - "when timer > value" where value is a number or one variable: the timer is read and compared directly. The
 *   timer only changes once per frame (it uses the frame's clock), so the answer is the one the check would give.
 * Everything else (touching, loudness, mouse, keys, lists, "of" blocks, random, extension hats and blocks, ...)
 * is checked every frame as before.
 */

const Cast = require('../util/cast');

// Blocks that are fixed values (a number or text typed into an input).
const CONSTANT_OPCODES = new Set([
    'math_number', 'math_positive_number', 'math_whole_number', 'math_integer', 'math_angle', 'text'
]);
// Operators whose answer depends only on their inputs.
const PURE_OPCODES = new Set([
    'operator_add', 'operator_subtract', 'operator_multiply', 'operator_divide', 'operator_power', 'operator_mod',
    'operator_round', 'operator_mathop', 'operator_lt', 'operator_equals', 'operator_notequal', 'operator_gt',
    'operator_ltorequal', 'operator_gtorequal', 'operator_and', 'operator_or', 'operator_not', 'operator_nand',
    'operator_nor', 'operator_xor', 'operator_xnor', 'operator_join', 'operator_letter_of', 'operator_length',
    'operator_contains'
]);
// Reporters that read one field of the sprite itself.
const TARGET_FIELDS = {
    motion_xposition: 'x',
    motion_yposition: 'y',
    motion_direction: 'direction'
};
const MAX_BLOCKS = 100;
const NOT_ELIGIBLE = false;

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isPrimitive = value => value === null || (typeof value !== 'object' && typeof value !== 'function');

/**
 * Adds what a condition block and its inputs read to the plan.
 * @returns {boolean} false if the block may read anything else.
 */
const collect = (blocks, blockId, plan, budget) => {
    if (--budget.left < 0) return false;
    const block = blocks.getBlock(blockId);
    if (!block) return false;
    const opcode = block.opcode;
    if (CONSTANT_OPCODES.has(opcode)) return true;
    if (opcode === 'data_variable') {
        const field = block.fields.VARIABLE;
        if (!field || typeof field.id !== 'string') return false;
        if (plan.varIds.indexOf(field.id) === -1) plan.varIds.push(field.id);
        return true;
    }
    if (hasOwn(TARGET_FIELDS, opcode)) {
        const name = TARGET_FIELDS[opcode];
        if (plan.fields.indexOf(name) === -1) plan.fields.push(name);
        return true;
    }
    if (!PURE_OPCODES.has(opcode)) return false;
    for (const name in block.inputs) {
        const input = block.inputs[name];
        if (!input || !input.block) continue; // empty input: a fixed value
        if (!collect(blocks, input.block, plan, budget)) return false;
    }
    return true;
};

const makePlan = (blocks, hatId) => {
    const hat = blocks.getBlock(hatId);
    if (!hat) return NOT_ELIGIBLE;
    const plan = {timer: false, value: 0, valueVarId: null, varIds: [], fields: []};
    if (hat.opcode === 'event_whenanything') {
        for (const name in hat.inputs) {
            const input = hat.inputs[name];
            if (!input || !input.block) continue;
            if (name !== 'ANYTHING') return NOT_ELIGIBLE;
            if (!collect(blocks, input.block, plan, {left: MAX_BLOCKS})) return NOT_ELIGIBLE;
        }
        return plan;
    }
    if (hat.opcode === 'event_whengreaterthan') {
        const menu = hat.fields.WHENGREATERTHANMENU;
        if (!menu || Cast.toString(menu.value).toLowerCase() !== 'timer') return NOT_ELIGIBLE;
        plan.timer = true;
        const input = hat.inputs.VALUE;
        if (!input || !input.block) return plan; // empty: 0
        const block = blocks.getBlock(input.block);
        if (!block) return NOT_ELIGIBLE;
        if (CONSTANT_OPCODES.has(block.opcode)) {
            const names = Object.keys(block.fields);
            if (names.length !== 1) return NOT_ELIGIBLE;
            plan.value = Cast.toNumber(block.fields[names[0]].value);
            return plan;
        }
        if (block.opcode === 'data_variable' && block.fields.VARIABLE && typeof block.fields.VARIABLE.id === 'string') {
            plan.valueVarId = block.fields.VARIABLE.id;
            return plan;
        }
        return NOT_ELIGIBLE;
    }
    return NOT_ELIGIBLE;
};

/**
 * What a hat's condition reads, or false if it has to be checked every frame. Kept on the engine's cached entry
 * for the script (blocks-runtime-cache.js), which is made again whenever a block changes.
 * @param {RuntimeScriptCache} script The hat's script, from BlocksRuntimeCache.getScripts.
 * @returns {object|boolean} Plan, or false.
 */
const getPlan = script => {
    let plan = script.edgeHatPlan;
    if (typeof plan === 'undefined') plan = script.edgeHatPlan = makePlan(script.container, script.blockId);
    return plan;
};

/**
 * The variable the engine reads for this id: the sprite's own or the stage's. Null when there is none, when both
 * exist (scripts compiled for another clone may read the other one) or when it is not a plain variable.
 */
const findVariable = (target, stage, id) => {
    const own = hasOwn(target.variables, id);
    const global = !target.isStage && !!stage && hasOwn(stage.variables, id);
    if (own === global) return null;
    const variable = own ? target.variables[id] : stage.variables[id];
    return variable && variable.type === '' ? variable : null;
};

// target -> {hat id -> values read at the last check}
const memos = new WeakMap();

/**
 * Whether checking this hat now would give the same answer as its last check (so it can be skipped).
 * @param {object} plan From getPlan.
 * @param {Target} target The sprite or clone.
 * @param {string} hatId The hat block.
 * @param {Runtime} runtime The runtime.
 * @returns {boolean} true if the check can be skipped.
 */
const isUnchanged = (plan, target, hatId, runtime) => {
    if (!target.hasEdgeActivatedValue(hatId)) return false;
    if (plan.timer) {
        let value = plan.value;
        if (plan.valueVarId !== null) {
            const variable = findVariable(target, runtime.getTargetForStage(), plan.valueVarId);
            if (!variable || !isPrimitive(variable.value)) return false;
            value = Cast.toNumber(variable.value);
        }
        return target._edgeActivatedHatValues[hatId] === (runtime.ioDevices.clock.projectTimer() > value);
    }
    const targetMemos = memos.get(target);
    const memo = targetMemos && targetMemos[hatId];
    if (!memo || memo.plan !== plan) return false;
    if (plan.varIds.length) {
        const stage = runtime.getTargetForStage();
        for (let i = 0; i < plan.varIds.length; i++) {
            const variable = findVariable(target, stage, plan.varIds[i]);
            if (variable !== memo.variables[i] || !Object.is(variable.value, memo.values[i])) return false;
        }
    }
    for (let i = 0; i < plan.fields.length; i++) {
        if (!Object.is(target[plan.fields[i]], memo.fields[i])) return false;
    }
    return true;
};

/**
 * Remembers the values a hat's condition is about to read (called just before the engine checks it).
 * @param {object} plan From getPlan.
 * @param {Target} target The sprite or clone.
 * @param {string} hatId The hat block.
 * @param {Runtime} runtime The runtime.
 */
const remember = (plan, target, hatId, runtime) => {
    if (plan.timer) return;
    let targetMemos = memos.get(target);
    if (!targetMemos) {
        targetMemos = Object.create(null);
        memos.set(target, targetMemos);
    }
    const memo = {plan, variables: [], values: [], fields: []};
    const stage = runtime.getTargetForStage();
    for (let i = 0; i < plan.varIds.length; i++) {
        const variable = findVariable(target, stage, plan.varIds[i]);
        if (!variable || !isPrimitive(variable.value)) {
            delete targetMemos[hatId];
            return;
        }
        memo.variables.push(variable);
        memo.values.push(variable.value);
    }
    for (let i = 0; i < plan.fields.length; i++) {
        const value = target[plan.fields[i]];
        if (!isPrimitive(value)) {
            delete targetMemos[hatId];
            return;
        }
        memo.fields.push(value);
    }
    targetMemos[hatId] = memo;
};

module.exports = {
    getPlan,
    isUnchanged,
    remember
};
