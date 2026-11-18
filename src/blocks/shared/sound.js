/**
 * Desktop fork (section 292): what the Sound blocks do, written once for the interpreter and the compiler
 * (src/blocks/shared/index.js explains the format). Only "volume" is here: the compiled code of every other sound
 * block already calls the interpreter's own function (irgen.js coreDirectCall), or the block is interpreted only.
 */

const helpers = {};

const blocks = {
    sound_volume: {js: '(target.volume)'}
};

module.exports = {helpers, blocks};
