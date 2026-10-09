const uid = require('./uid');
const alwaysUnsafe = [
    "jgPrism_evaluate",
    "jgPrism_evaluate2",
    "jgPrism_evaluate3",
    "videoSensing_videoToggle",
    "jgPrism_screenshotStage"
];

/**
 * gets if the current save contains any of the listed blocks
 * @param {array} blockOpcodes a list of blocks to check for
 * @param {array} targets all the current targets in the save
 * @returns {boolean} if any of the listed blocks are in save
 */
const workspaceContains = (blockOpcodes, targets) => {
    for (const target of targets) {
        for (const block of Object.keys(target.blocks._blocks)) {
            if (blockOpcodes.includes(block.opcode)) return true;
        }
    }
    return false;
};

/**
 * asks a user if they agree to something
 * @param {string} msg the what to ask the user for
 * @param {array} targets all of the current targets
 * @returns {boolean} if the user agreed to it or not
 */
const ask = (msg, targets) => {
    if (workspaceContains(alwaysUnsafe, targets)) {
        const confirmId = uid();
        const userAccepts = prompt(
            `${msg}\nto confirm type "${confirmId}"`, 
            `to confirm type the text above`
        );
        return userAccepts === confirmId;
    }
    const userAccepts = prompt(msg, 'i decline');
    return userAccepts === 'yes' || userAccepts === 'i accept';
};

module.exports = ask;
