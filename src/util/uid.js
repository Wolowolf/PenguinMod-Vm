/**
 * @fileoverview UID generator, from Blockly.
 */

/**
 * Legal characters for the unique ID.
 * Should be all on a US keyboard.  No XML special characters or control codes.
 * Removed $ due to issue 251.
 * @private
 */
const soup_ = '!#%()*+,-./:;=?@[]^_`{|}~' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a unique ID, from Blockly.  This should be globally unique.
 * 87 characters ^ 20 length > 128 bits (better than a UUID).
 * Desktop fork (section 254): built by concatenation, like MistWarp (faster than joining an array).
 * @return {string} A globally unique ID string.
 */
const uid = function () {
    const soupLength = soup_.length;
    let id = '';
    for (let i = 0; i < 20; i++) {
        id += soup_[(Math.random() * soupLength) | 0];
    }
    return id;
};

module.exports = uid;
