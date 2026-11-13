/**
 * @fileoverview Common intermediates shared amongst parts of the compiler.
 */

/**
 * An IntermediateScript describes a single script.
 * Scripts do not necessarily have hats.
 */
class IntermediateScript {
    constructor () {
        /**
         * The ID of the top block of this script.
         * @type {string}
         */
        this.topBlockId = null;

        /**
         * List of nodes that make up this script.
         * @type {Array|null}
         */
        this.stack = null;

        /**
         * Whether this script is a procedure.
         * @type {boolean}
         */
        this.isProcedure = false;

        /**
         * This procedure's code, if any.
         * @type {string}
         */
        this.procedureCode = '';

        /**
         * List of names of arguments accepted by this function, if it is a procedure.
         * @type {string[]}
         */
        this.arguments = [];

        /**
         * Whether this script should be run in warp mode.
         * @type {boolean}
         */
        this.isWarp = false;

        /**
         * pm: Whether this script should use dangerous optimizations.
         * @type {boolean}
         */
        this.isOptimized = false;

        /**
         * pm: An object containing stuff for optimization.
         * @type {object}
         */
        this.optimizationUtil = {};

        /**
         * Whether this script can `yield`
         * If false, this script will be compiled as a regular JavaScript function (function)
         * If true, this script will be compiled as a generator function (function*)
         * Desktop fork (section 253): false at first for every script. The IR generator sets it for the blocks that
         * pause or wait; for a top-level script the JS generator also sets it when the code it wrote pauses
         * (JSGenerator.compile). A top-level script that never pauses runs as a plain function (Thread.tryCompile).
         * @type {boolean}
         */
        this.yields = false;

        /**
         * Whether this script should use the "warp timer"
         * @type {boolean}
         */
        this.warpTimer = false;

        /**
         * List of procedure IDs that this script needs.
         * @readonly
         */
        this.dependedProcedures = [];

        /**
         * Cached result of compiling this script.
         * @type {Function|null}
         */
        this.cachedCompileResult = null;
        
        /**
         * Whether the top block of this script is an executable hat.
         * @type {boolean}
         */
        this.executableHat = false;
    }
}

/**
 * An IntermediateRepresentation contains scripts.
 */
class IntermediateRepresentation {
    constructor () {
        /**
         * The entry point of this IR.
         * @type {IntermediateScript}
         */
        this.entry = null;

        /**
         * Maps procedure variants to their intermediate script.
         * @type {Object.<string, IntermediateScript>}
         */
        this.procedures = {};
    }
}

module.exports = {
    IntermediateScript,
    IntermediateRepresentation
};
