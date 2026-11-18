/**
 * Desktop fork (section 293): what the Control blocks without branches or waits do, written once for the interpreter
 * and the compiler (src/blocks/shared/index.js explains the format). Moved here from scratch3_control.js (the
 * interpreter's functions) and jsgen.js. Not here: every block with a branch, a loop, a wait or a stop (the compiler
 * writes them as JavaScript loops, yields and returns, the interpreter as stack frames), "delete this clone" (it ends
 * the script), "throw error" (a JavaScript throw), and "delete clones of", "stop sprite", "back to green flag"
 * (compiled through the interpreter's own function).
 */

const helpers = {};

const blocks = {
    control_get_counter: {js: 'runtime.ext_scratch3_control._counter'},
    control_set_counter: {inputs: 'VALUE:n', stack: 'runtime.ext_scratch3_control._counter = $VALUE;\n'},
    control_clear_counter: {stack: 'runtime.ext_scratch3_control._counter = 0;\n'},
    control_incr_counter: {stack: 'runtime.ext_scratch3_control._counter++;\n'},
    control_decr_counter: {stack: 'runtime.ext_scratch3_control._counter--;\n'},
    control_error: {js: 'runtime.ext_scratch3_control._error'},
    // (compiled, only the chosen value is worked out: section 281)
    control_if_return_else_return: {inputs: 'boolean:b TEXT1:r TEXT2:r', js: '($boolean ? $TEXT1 : $TEXT2)'},
    control_create_clone_of: {inputs: 'CLONE_OPTION:s',
        stack: 'runtime.ext_scratch3_control._createClone($CLONE_OPTION, target);\n'}
};

module.exports = {helpers, blocks};
