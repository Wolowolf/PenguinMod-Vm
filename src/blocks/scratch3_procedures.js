const Cast = require('../util/cast');
class Scratch3ProcedureBlocks {
    constructor(runtime) {
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
    getPrimitives() {
        return {
            procedures_definition: this.definition,
            procedures_call: this.call,
            procedures_set: this.set,
            argument_reporter_string_number: this.argumentReporterStringNumber,
            argument_reporter_boolean: this.argumentReporterBoolean,
            argument_reporter_command: this.argumentReporterCommand
        };
    }

    definition() {
        // No-op: execute the blocks.
    }

    call (args, util) {
        if (!util.stackFrame.executed) {
            const procedureCode = args.mutation.proccode;
            const paramNamesIdsAndDefaults = util.getProcedureParamNamesIdsAndDefaults(procedureCode);

            // If null, procedure could not be found, which can happen if custom
            // block is dragged between sprites without the definition.
            // Match Scratch 2.0 behavior and noop.
            if (paramNamesIdsAndDefaults === null) {
                return;
            }

            const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

            // Initialize params for the current stackFrame to {}, even if the procedure does
            // not take any arguments. This is so that `getParam` down the line does not look
            // at earlier stack frames for the values of a given parameter (#1729)
            util.initParams();
            for (let i = 0; i < paramIds.length; i++) {
                if (args.hasOwnProperty(paramIds[i])) {
                    util.pushParam(paramNames[i], args[paramIds[i]]);
                } else {
                    util.pushParam(paramNames[i], paramDefaults[i]);
                }
            }

            const addonBlock = util.runtime.getAddonBlock(procedureCode);
            if (addonBlock) {
                const result = addonBlock.callback(util.thread.getAllparams(), util);
                if (util.thread.status === 1 /* STATUS_PROMISE_WAIT */) {
                    // If the addon block is using STATUS_PROMISE_WAIT to force us to sleep,
                    // make sure to not re-run this block when we resume.
                    util.stackFrame.executed = true;
                }
                return result;
            }

            util.stackFrame.executed = true;

            util.startProcedure(procedureCode);
        }
    }

    set(args, util) {
      const contain = util.thread.blockContainer;
      const block = contain.getBlock(util.thread.isCompiled ? util.thread.peekStack() : util.thread.peekStackFrame().op.id);
      if (!block) return;
      const thread = util.thread;
      const param = contain.getBlock(block.inputs.PARAM?.block);
      if (param) {
        try {
          const curParams = thread.stackFrames[0].params;
          if (curParams !== null) thread.stackFrames[0].params[param.fields.VALUE.value] = args.VALUE;
          else thread.stackFrames[0].params = { [param.fields.VALUE.value]: args.VALUE }
        } catch { /* shouldn't happen */ }
      }
    }

    argumentReporterStringNumber(args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
    }

    argumentReporterBoolean(args, util) {
        return this.argumentReporterStringNumber(args, util); // Desktop fork (section 306): the same answer
    }

    argumentReporterCommand(args, util) {
        const branchInfo = util.getParam(args.VALUE) || {};
        if (branchInfo.entry === null) return;
        const [branchId, target] = util.getBranchAndTarget(
            branchInfo.callerId,
            branchInfo.entry
        ) || [];
        if (branchId) {
            // Push branch ID to the thread's stack.
            util.thread.pushStack(branchId, target);
        } else {
            util.thread.pushStack(null);
        }
    }
}

module.exports = Scratch3ProcedureBlocks;
