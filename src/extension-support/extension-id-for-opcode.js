// Desktop fork (section 306): one copy for the extension manager and the sb3 loader (both had their own).

// Block categories that are built in, not extensions.
const CORE_EXTENSIONS = [
    'argument',
    'colour',
    'control',
    'data',
    'event',
    'looks',
    'math',
    'motion',
    'operator',
    'procedures',
    'sensing',
    'sound'
];

/**
 * Get sanitized non-core extension ID for a given sb3 opcode.
 * Note that this should never return a URL. If in the future the SB3 loader supports loading extensions by URL, this
 * ID should be used to (for example) look up the extension's full URL from a table in the SB3's JSON.
 * @param {!string} opcode The opcode to examine for extension.
 * @return {?string} The extension ID, if it exists and is not a core extension.
 */
const getExtensionIdForOpcode = function (opcode) {
    // Allowed ID characters are those matching the regular expression [\w-]: A-Z, a-z, 0-9, and hyphen ("-").
    if (!(typeof opcode === 'string')) {
        console.error('invalid opcode ' + opcode);
        return '';
    }
    const index = opcode.indexOf('_');
    const forbiddenSymbols = /[^\w-]/g;
    const prefix = opcode.substring(0, index).replace(forbiddenSymbols, '-');
    if (CORE_EXTENSIONS.indexOf(prefix) === -1) {
        if (prefix !== '') return prefix;
    }
};

module.exports = getExtensionIdForOpcode;
