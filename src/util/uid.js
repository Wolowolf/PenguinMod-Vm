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

// Desktop fork (section 171): one array for all IDs, as every clone gets an ID
const length_ = 20;
const id_ = new Array(length_);

/**
 * Generate a unique ID, from Blockly.  This should be globally unique.
 * 87 characters ^ 20 length > 128 bits (better than a UUID).
 * @return {string} A globally unique ID string.
 */
const uid = function () {
    const soupLength = soup_.length;
    for (let i = 0; i < length_; i++) {
        id_[i] = soup_.charAt(Math.random() * soupLength);
    }
    return id_.join('');
};

module.exports = uid;
