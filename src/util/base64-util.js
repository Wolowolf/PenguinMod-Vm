const atob = require('atob');
// Desktop fork (section 306): the browser's own btoa where there is one (same text for byte strings, faster)
const btoa = typeof globalThis.btoa === 'function' ? globalThis.btoa : require('btoa');

class Base64Util {

    /**
     * Convert a base64 encoded string to a Uint8Array.
     * @param {string} base64 - a base64 encoded string.
     * @return {Uint8Array} - a decoded Uint8Array.
     */
    static base64ToUint8Array (base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            array[i] = binaryString.charCodeAt(i);
        }
        return array;
    }

    /**
     * Convert a Uint8Array to a base64 encoded string.
     * @param {Uint8Array} array - the array to convert.
     * @return {string} - the base64 encoded string.
     */
    static uint8ArrayToBase64 (array) {
        // Desktop fork (section 306): 32 KB at a time (shared by the extensions; same text, faster for big data)
        let binary = '';
        for (let i = 0; i < array.length; i += 0x8000) {
            binary += String.fromCharCode.apply(null, array.subarray(i, i + 0x8000));
        }
        return btoa(binary);
    }

    /**
    * Convert an array buffer to a base64 encoded string.
    * @param {array} buffer - an array buffer to convert.
    * @return {string} - the base64 encoded string.
    */
    static arrayBufferToBase64 (buffer) {
        return Base64Util.uint8ArrayToBase64(new Uint8Array(buffer));
    }

}

module.exports = Base64Util;
