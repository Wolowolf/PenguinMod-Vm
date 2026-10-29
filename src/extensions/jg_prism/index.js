const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const beatgammit = {
    deflate: require('./beatgammit-deflate'),
    inflate: require('./beatgammit-inflate')
};
const {
    validateArray
} = require('../../util/json-block-utilities');
const ArrayBufferUtil = require('../../util/array buffer');
const BufferParser = new ArrayBufferUtil();
const Cast = require('../../util/cast');
// const Cast = require('../../util/cast');

const warningIcon = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC8SURBVDhPpZPBDYMwDEWhJw4MQzdgG0bi0APDlHuPZRv6X2xUaqJWpE8y2Pk/JkRJFVnXtVOMiqdig5yxzm1HJDZu+gWexqcZDCjuqHtcRo/gfTdRkf2yy7kGMG4i/5wlGYSXObqL9MFsRQw06C0voq9ZhxcHasH7m4cV/AUNFkuLWGgwW17EzB5wPB9Wn+aanmoysVGRJAovI5PLydAqzh7l1mWDAUV2JQE8n5P3SORo3xTxOjMWrnNVvQChGZRpEqnWPQAAAABJRU5ErkJggg==";

/**
 * Class for Prism blocks
 * @constructor
 */
class JgPrismBlocks {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        this.audioPlayer = new Audio();
        this.isJSPermissionGranted = false;
        this.isCameraScreenshotEnabled = false;

        this.mouseScrollDelta = { x: 0, y: 0, z: 0 };
        // Desktop fork (section 159): the runtime's door to the page
        this.runtime.pmPage.addEventListener("window", "wheel", e => {
            this.mouseScrollDelta.x = e.deltaX;
            this.mouseScrollDelta.y = e.deltaY;
            this.mouseScrollDelta.z = e.deltaZ;
        });
        this.runtime.pmSetInterval(() => { // Desktop fork (section 156): the runtime's timer
            this.mouseScrollDelta = { x: 0, y: 0, z: 0 };
        }, 65);

        this.encodeCharacterLength = 6;
    }


    /**
     * dummy function for reseting user provided permisions when a save is loaded
     */
    deserialize() {
        this.isJSPermissionGranted = false;
        this.isCameraScreenshotEnabled = false;
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'jgPrism',
            name: 'Prism',
            color1: '#BC7FFF',
            color2: '#AD66FF',
            blocks: [
                {
                    blockType: BlockType.LABEL,
                    text: "Data URIs"
                },
                {
                    opcode: 'screenshotStage',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.screenshotStage',
                        default: 'screenshot the stage',
                        description: 'Block that screenshots the stage and returns a Data URI of it.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'dataUriOfCostume',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.dataUriOfCostume',
                        default: 'data url of costume #[INDEX]',
                        description: 'Block that returns a Data URI of the costume at the index.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    // these blocks will be replaced in the future
                    // hideFromPalette: true,
                    arguments: {
                        INDEX: {
                            type: ArgumentType.NUMBER,
                            defaultValue: "1"
                        }
                    }
                },
                {
                    opcode: 'dataUriFromImageUrl',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.dataUriFromImageUrl',
                        default: 'data url of image at url: [URL]',
                        description: 'Block that returns a Data URI of the content fetched from the URL.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    // these blocks will be replaced in the future
                    // hideFromPalette: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "url"
                        }
                    }
                },
                {
                    opcode: 'dataUriFromArrayBuffer',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.dataUriFromArrayBuffer',
                        default: 'convert array buffer [BUFFER] to data url',
                        description: 'Block that returns a Data URI from an array buffer.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        BUFFER: {
                            type: ArgumentType.STRING,
                            defaultValue: "[72,101,108,108,111]"
                        }
                    }
                },
                {
                    opcode: 'arrayBufferFromDataUri',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.arrayBufferFromDataUri',
                        default: 'convert data url [URL] to array buffer',
                        description: 'Block that returns an array buffer from a Data URL.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        URL: {
                            type: ArgumentType.STRING,
                            defaultValue: "data:text/plain;base64,SGVsbG8="
                        }
                    }
                },
                // {
                //     blockType: BlockType.LABEL,
                //     text: "More Mouse Inputs"
                // },
                {
                    blockType: BlockType.LABEL,
                    text: "Base64"
                },
                {
                    opcode: 'base64Encode',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.base64Encode',
                        default: 'base64 encode [TEXT]',
                        description: 'Block that encodes and returns the result of it.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    }
                },
                {
                    opcode: 'base64Decode',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.base64Decode',
                        default: 'base64 decode [TEXT]',
                        description: 'Block that decodes and returns the result of it.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: "YWJj"
                        }
                    }
                },
                // {
                //     blockType: BlockType.LABEL,
                //     text: "String Character Codes"
                // },
                "---",
                "---",
                {
                    blockType: BlockType.LABEL,
                    text: "JS Deflate by BeatGammit"
                },
                {
                    opcode: 'lib_deflate_deflateArray',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.lib_deflate_deflateArray',
                        default: 'deflate [ARRAY]',
                        description: 'abc'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        ARRAY: {
                            type: ArgumentType.STRING,
                            defaultValue: "[]"
                        }
                    }
                },
                {
                    opcode: 'lib_deflate_inflateArray',
                    text: formatMessage({
                        id: 'jgRuntime.blocks.lib_deflate_inflateArray',
                        default: 'inflate [ARRAY]',
                        description: 'abc'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        ARRAY: {
                            type: ArgumentType.STRING,
                            defaultValue: "[]"
                        }
                    }
                },
                {
                    blockType: BlockType.LABEL,
                    text: "Numerical Encoding by cs2627883"
                },
                {
                    opcode: 'NumericalEncode',
                    blockType: BlockType.REPORTER,
                    text: 'encode [DATA] to number',
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello!'
                        }
                    }
                },
                {
                    opcode: 'NumericalDecode',
                    blockType: BlockType.REPORTER,
                    text: 'decode [ENCODED] from number',
                    arguments: {
                        ENCODED: {
                            type: ArgumentType.STRING,
                            defaultValue: '000072000101000108000108000111000033'
                        }
                    }
                }
            ]
        };
    }
    screenshotStage() {
        // should we look for an external canvas
        if (this.runtime.prism_screenshot_checkForExternalCanvas) {
            // if so, does one exist (this will check for more than 1 in the future)
            if (this.runtime.prism_screenshot_externalCanvas) {
                // we dont need to check camera permissions since external canvases
                // will never have the ability to get camera data
                return this.runtime.prism_screenshot_externalCanvas.toDataURL();
            }
        }
        
        // renderer will handle not capturing video data
        return new Promise(resolve => {
            vm.renderer.requestSnapshot(uri => {
                resolve(uri);
            });
        });
    }
    dataUriOfCostume(args, util) {
        const index = Number(args.INDEX);
        if (isNaN(index)) return "";
        if (index < 1) return "";

        const target = util.target;
        // eslint-disable-next-line no-undefined
        if (target.sprite.costumes[index - 1] === undefined || target.sprite.costumes[index - 1] === null) return "";
        const dataURI = target.sprite.costumes[index - 1].asset.encodeDataURI();
        return String(dataURI);
    }
    dataUriFromImageUrl(args) {
        return new Promise(resolve => {
            if (window && !window.FileReader) return resolve("");
            if (window && !window.fetch) return resolve("");
            fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(String(args.URL))}`).then(r => {
                r.blob().then(blob => {
                    const reader = new FileReader();
                    reader.onload = e => {
                        resolve(e.target.result);
                    };
                    reader.readAsDataURL(blob);
                })
                    .catch(() => {
                        resolve("");
                    });
            })
                .catch(() => {
                    resolve("");
                });
        });
    }

    dataUriFromArrayBuffer(args) {
        const array = validateArray(args.BUFFER);
        if (!array.isValid) return 'data:text/plain;base64,';
        const buffer = BufferParser.arrayToBuffer(array.array);
        let binary = '';
        let bytes = new Uint8Array(buffer);
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        // use "application/octet-stream", we have no idea what the buffer actually contains
        return `data:application/octet-stream;base64,${btoa(binary)}`;
    }
    arrayBufferFromDataUri(args) {
        const dataUrl = Cast.toString(args.URL);
        return new Promise((resolve) => {
            fetch(dataUrl).then(res => {
                res.arrayBuffer().then(buffer => {
                    const array = BufferParser.bufferToArray(buffer);
                    resolve(JSON.stringify(array));
                }).catch(() => {
                    resolve('[]');
                });
            }).catch(() => {
                resolve('[]');
            });
        });
    }

    base64Encode(args) {
        let result = "";
        try {
            result = btoa(String(args.TEXT));
        } catch {
            // what a shame
        }
        return result;
    }
    base64Decode(args) {
        let result = "";
        try {
            result = atob(String(args.TEXT));
        } catch {
            // what a shame
        }
        return result;
    }
    lib_deflate_deflateArray(args) {
        const array = validateArray(args.ARRAY).array;

        return JSON.stringify(beatgammit.deflate(array));
    }
    lib_deflate_inflateArray(args) {
        const array = validateArray(args.ARRAY).array;

        return JSON.stringify(beatgammit.inflate(array));
    }

    NumericalEncode(args) {
        const toencode = String(args.DATA);
        let encoded = "";
        for (let i = 0; i < toencode.length; ++i) {
            // Get char code of character
            let encodedchar = String(toencode.charCodeAt(i));
            // Pad encodedchar with 0s to ensure all encodedchars are the same length
            encodedchar = "0".repeat(this.encodeCharacterLength - encodedchar.length) + encodedchar;
            encoded += encodedchar;
        }
        return encoded;
    }
    NumericalDecode(args) {
        const todecode = String(args.ENCODED);
        if (todecode == "") {
            return "";
        }
        let decoded = "";
        // Create regex to split by char length
        const regex = new RegExp('.{1,' + this.encodeCharacterLength + '}', 'g');
        // Split into array of characters
        let encodedchars = todecode.match(regex);
        for (let i = 0; i < encodedchars.length; i++) {
            // Get character from char code
            let decodedchar = String.fromCharCode(encodedchars[i]);
            decoded += decodedchar;
        }
        return decoded;
    }
}

module.exports = JgPrismBlocks;
