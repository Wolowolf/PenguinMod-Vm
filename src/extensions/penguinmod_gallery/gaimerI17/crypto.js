/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the PenguinMod gallery's gaimerI17/crypto.js, moved into
// the VM as a built-in extension. The code is the gallery file, except where marked "Desktop fork (section 259)": MD5 in the
// hash menu (moved from Encoding), ECDH key pairs and a shared AES key from them (from the removed End-to-End Encryption),
// and "public / private key from" no longer named RSA, as they read either kind of key pair.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
(function(Scratch) {
    'use strict';

    function bufToHex(buffer) {
        const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer)
            : buffer instanceof Uint8Array ? buffer
            : new Uint8Array(buffer);
        return Array.prototype.map.call(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }

    function hexToBuf(hex) {
        const clean = String(hex).replace(/[^0-9a-f]/gi, '').toLowerCase();
        if (clean.length % 2 !== 0) throw new Error('Invalid hex string');
        const out = new Uint8Array(clean.length / 2);
        for (let i = 0; i < out.length; i++) {
            out[i] = parseInt(clean.substr(i * 2, 2), 16);
        }
        return out.buffer;
    }

    // Desktop fork (section 259): MD5, from TurboWarp's Encoding extension (the hash block there is removed)
    /*!
    This md5 function is based on https://github.com/blueimp/JavaScript-MD5/blob/master/js/md5.js
    which is licensed under:

    MIT License

    Copyright © 2011 Sebastian Tschan, https://blueimp.net

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software is furnished to do so,
    subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
    FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
    COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
    IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    */
    const md5 = (function () {
      /**
       * Add integers, wrapping at 2^32.
       * This uses 16-bit operations internally to work around bugs in interpreters.
       *
       * @param {number} x First integer
       * @param {number} y Second integer
       * @returns {number} Sum
       */
      function safeAdd(x, y) {
        var lsw = (x & 0xffff) + (y & 0xffff);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xffff);
      }

      /**
       * Bitwise rotate a 32-bit number to the left.
       *
       * @param {number} num 32-bit number
       * @param {number} cnt Rotation count
       * @returns {number} Rotated number
       */
      function bitRotateLeft(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
      }

      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} q q
       * @param {number} a a
       * @param {number} b b
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5cmn(q, a, b, x, s, t) {
        return safeAdd(
          bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s),
          b
        );
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5ff(a, b, c, d, x, s, t) {
        return md5cmn((b & c) | (~b & d), a, b, x, s, t);
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5gg(a, b, c, d, x, s, t) {
        return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5hh(a, b, c, d, x, s, t) {
        return md5cmn(b ^ c ^ d, a, b, x, s, t);
      }
      /**
       * Basic operation the algorithm uses.
       *
       * @param {number} a a
       * @param {number} b b
       * @param {number} c c
       * @param {number} d d
       * @param {number} x x
       * @param {number} s s
       * @param {number} t t
       * @returns {number} Result
       */
      function md5ii(a, b, c, d, x, s, t) {
        return md5cmn(c ^ (b | ~d), a, b, x, s, t);
      }

      /**
       * Calculate the MD5 of an array of little-endian words, and a bit length.
       *
       * @param {Array} x Array of little-endian words
       * @param {number} len Bit length
       * @returns {Array<number>} MD5 Array
       */
      function binlMD5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var i;
        var olda;
        var oldb;
        var oldc;
        var oldd;
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;

        for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;

          a = md5ff(a, b, c, d, x[i], 7, -680876936);
          d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
          c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
          b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
          a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
          d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
          c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
          b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
          a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
          d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
          c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
          b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
          a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
          d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
          c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
          b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

          a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
          d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
          c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
          b = md5gg(b, c, d, a, x[i], 20, -373897302);
          a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
          d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
          c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
          b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
          a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
          d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
          c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
          b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
          a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
          d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
          c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
          b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

          a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
          d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
          c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
          b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
          a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
          d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
          c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
          b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
          a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
          d = md5hh(d, a, b, c, x[i], 11, -358537222);
          c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
          b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
          a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
          d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
          c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
          b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

          a = md5ii(a, b, c, d, x[i], 6, -198630844);
          d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
          c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
          b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
          a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
          d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
          c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
          b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
          a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
          d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
          c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
          b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
          a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
          d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
          c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
          b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);

          a = safeAdd(a, olda);
          b = safeAdd(b, oldb);
          c = safeAdd(c, oldc);
          d = safeAdd(d, oldd);
        }
        return [a, b, c, d];
      }

      /**
       * Convert an array of little-endian words to a string
       *
       * @param {Array<number>} input MD5 Array
       * @returns {string} MD5 string
       */
      function binl2rstr(input) {
        var i;
        var output = "";
        var length32 = input.length * 32;
        for (i = 0; i < length32; i += 8) {
          output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xff);
        }
        return output;
      }

      /**
       * Convert a raw string to an array of little-endian words
       * Characters >255 have their high-byte silently ignored.
       *
       * @param {string} input Raw input string
       * @returns {Array<number>} Array of little-endian words
       */
      function rstr2binl(input) {
        var i;
        var output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
          output[i] = 0;
        }
        var length8 = input.length * 8;
        for (i = 0; i < length8; i += 8) {
          output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << (i % 32);
        }
        return output;
      }

      /**
       * Calculate the MD5 of a raw string
       *
       * @param {string} s Input string
       * @returns {string} Raw MD5 string
       */
      function rstrMD5(s) {
        return binl2rstr(binlMD5(rstr2binl(s), s.length * 8));
      }

      /**
       * Calculates the HMAC-MD5 of a key and some data (raw strings)
       *
       * @param {string} key HMAC key
       * @param {string} data Raw input string
       * @returns {string} Raw MD5 string
       */
      function rstrHMACMD5(key, data) {
        var i;
        var bkey = rstr2binl(key);
        var ipad = [];
        var opad = [];
        var hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
          bkey = binlMD5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5c5c5c5c;
        }
        hash = binlMD5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binlMD5(opad.concat(hash), 512 + 128));
      }

      /**
       * Convert a raw string to a hex string
       *
       * @param {string} input Raw input string
       * @returns {string} Hex encoded string
       */
      function rstr2hex(input) {
        var hexTab = "0123456789abcdef";
        var output = "";
        var x;
        var i;
        for (i = 0; i < input.length; i += 1) {
          x = input.charCodeAt(i);
          output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f);
        }
        return output;
      }

      /**
       * Encode a string as UTF-8
       *
       * @param {string} input Input string
       * @returns {string} UTF8 string
       */
      function str2rstrUTF8(input) {
        return unescape(encodeURIComponent(input));
      }

      /**
       * Encodes input string as raw MD5 string
       *
       * @param {string} s Input string
       * @returns {string} Raw MD5 string
       */
      function rawMD5(s) {
        return rstrMD5(str2rstrUTF8(s));
      }
      /**
       * Encodes input string as Hex encoded string
       *
       * @param {string} s Input string
       * @returns {string} Hex encoded string
       */
      function hexMD5(s) {
        return rstr2hex(rawMD5(s));
      }
      /**
       * Calculates the raw HMAC-MD5 for the given key and data
       *
       * @param {string} k HMAC key
       * @param {string} d Input string
       * @returns {string} Raw MD5 string
       */
      function rawHMACMD5(k, d) {
        return rstrHMACMD5(str2rstrUTF8(k), str2rstrUTF8(d));
      }
      /**
       * Calculates the Hex encoded HMAC-MD5 for the given key and data
       *
       * @param {string} k HMAC key
       * @param {string} d Input string
       * @returns {string} Raw MD5 string
       */
      function hexHMACMD5(k, d) {
        return rstr2hex(rawHMACMD5(k, d));
      }

      /**
       * Calculates MD5 value for a given string.
       * If a key is provided, calculates the HMAC-MD5 value.
       * Returns a Hex encoded string unless the raw argument is given.
       *
       * @param {string} string Input string
       * @param {string} [key] HMAC key
       * @param {boolean} [raw] Raw output switch
       * @returns {string} MD5 output
       */
      function md5(string, key, raw) {
        if (!key) {
          if (!raw) {
            return hexMD5(string);
          }
          return rawMD5(string);
        }
        if (!raw) {
          return hexHMACMD5(key, string);
        }
        return rawHMACMD5(key, string);
      }

      return md5;
    })();

    const menuIconURI = 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwLDAsMzAwLDMwMCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE1MCwwKSI+PGcgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMTUwLDMwMHYtMzAwaDMwMHYzMDB6IiBmaWxsPSIjNjc2NzY3IiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMC41Ii8+PHBhdGggZD0iTTE1MCwzMDB2LTMwMGgzMDBsLTExOS4wOTA1LDE3Ny4wMzY2M3oiIGZpbGw9IiM0NTQ1NDUiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48cGF0aCBkPSJNMzExLjM3NzUzLDE0OS45OTk5OWMwLC0yMS40NjQyMSAxNy40MDAxOSwtMzguODY0MzkgMzguODY0NCwtMzguODY0MzljMjEuNDY0MjEsMCAzOC44NjQ0LDE3LjQwMDE4IDM4Ljg2NDQsMzguODY0NGMwLDIxLjQ2NDIxIC0xNy40MDAxOSwzOC44NjQ0IC0zOC44NjQzOSwzOC44NjQ0Yy0yMS40NjQyMSwwIC0zOC44NjQzOSwtMTcuNDAwMTggLTM4Ljg2NDM5LC0zOC44NjQzOXpNMzUwLjI0MTk0LDE3OS4xNDE4NGMxNi4wOTQ2LDAgMjkuMTQxODUsLTEzLjA0NzI2IDI5LjE0MTg1LC0yOS4xNDE4NWMwLC0xNi4wOTQ1OSAtMTMuMDQ3MjYsLTI5LjE0MTg1IC0yOS4xNDE4NSwtMjkuMTQxODVjLTE2LjA5NDYsMCAtMjkuMTQxODUsMTMuMDQ3MjYgLTI5LjE0MTg1LDI5LjE0MTg1YzAsMTYuMDk0NTkgMTMuMDQ3MjUsMjkuMTQxODUgMjkuMTQxODUsMjkuMTQxODV6IiBmaWxsPSIjZmY5OTAwIiBzdHJva2U9IiNmZjk5MDAiIHN0cm9rZS13aWR0aD0iNyIvPjxwYXRoIGQ9Ik0yMTAuODkzNjcsMTU2LjE3NzI4di0xMi4zNTQ1N2gxMDYuODk5NDR2MTIuMzU0NTd6IiBmaWxsPSIjZmY5OTAwIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMCIvPjxwYXRoIGQ9Ik0yMTAuODkzNjcsMTc5LjEwODM0di0zNS4yODU2M2gxMy4yMzIxMXYzNS4yODU2M3oiIGZpbGw9IiNmZjk5MDAiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PHBhdGggZD0iTTI0OS41MTY3MSwxNjcuODA1NXYtMjMuMjU2NDRoOC4wMTk0NnYyMy4yNTY0NHoiIGZpbGw9IiNmZjk5MDAiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6MTUwOjE1MC0tPg==';

    class Extension {
        getInfo() {
            return {
                id: "gaimeriCryptoExtension",
                name: "Cryptography",
                color1: "#676767",
                color2: "#444444",
                color3: "#222222",
                menuIconURI,
                blocks: [
                    { blockType: Scratch.BlockType.LABEL, text: 'Random' },
                    {
                        opcode: 'randomUUID',
                        text: 'random UUID',
                        blockType: Scratch.BlockType.REPORTER,
                        disableMonitor: true
                    },
                    {
                        opcode: 'randomValues',
                        text: '[SCALE] of [AMOUNT] random values',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            AMOUNT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
                            SCALE: { type: Scratch.ArgumentType.STRING, menu: 'TYPED_ARRAYS', allowReporters: false }
                        }
                    },

                    '---',
                    { blockType: Scratch.BlockType.LABEL, text: 'Hashing' },
                    {
                        opcode: 'digest',
                        text: 'hash [VALUE] with [ALGORITHM]',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            ALGORITHM: { type: Scratch.ArgumentType.STRING, menu: 'ALGORITHM' }
                        }
                    },

                    '---',
                    { blockType: Scratch.BlockType.LABEL, text: 'HMAC' },
                    {
                        opcode: 'generateSignKey',
                        text: 'generate HMAC key',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        disableMonitor: true
                    },
                    {
                        opcode: 'signValue',
                        text: 'HMAC sign [VALUE] with key [KEY]',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                    {
                        opcode: 'verifySignature',
                        text: 'HMAC verify signature [SIGNATURE] of [VALUE] with key [KEY]',
                        blockType: Scratch.BlockType.BOOLEAN,
                        arguments: {
                            SIGNATURE: { type: Scratch.ArgumentType.STRING, defaultValue: 'signature' },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },

                    '---',
                    { blockType: Scratch.BlockType.LABEL, text: 'AES-GCM Encryption' },
                    {
                        opcode: 'generateAESKey',
                        text: 'generate AES-GCM key (256-bit)',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        disableMonitor: true
                    },
                    {
                        opcode: 'encryptAES',
                        text: 'encrypt [PLAINTEXT] with AES key [KEY]',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            PLAINTEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                    {
                        opcode: 'decryptAES',
                        text: 'decrypt [CIPHERTEXT] with AES key [KEY]',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            CIPHERTEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'encrypted' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },

                    '---',
                    { blockType: Scratch.BlockType.LABEL, text: 'RSA-PSS' },
                    {
                        opcode: 'generateRSAKey',
                        text: 'generate RSA-PSS keypair',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        disableMonitor: true
                    },
                    {
                        opcode: 'rsaSign',
                        text: 'RSA sign [VALUE] with private key [KEY]',
                        blockType: Scratch.BlockType.REPORTER,
                        arguments: {
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                    {
                        opcode: 'rsaVerify',
                        text: 'RSA verify [SIGNATURE] of [VALUE] with public key [KEY]',
                        blockType: Scratch.BlockType.BOOLEAN,
                        arguments: {
                            SIGNATURE: { type: Scratch.ArgumentType.STRING, defaultValue: 'signature' },
                            VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' },
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                    {
                        opcode: 'rsaPublicKey',
                        text: 'public key from [KEY]', // Desktop fork (section 259): was 'RSA public key from [KEY]'
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                    {
                        opcode: 'rsaPrivateKey',
                        text: 'private key from [KEY]', // Desktop fork (section 259): was 'RSA private key from [KEY]'
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        arguments: {
                            KEY: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },

                    // Desktop fork (section 259): key exchange, from the removed End-to-End Encryption extension. Both
                    // users make a key pair and send each other the public key; each gets the same AES key from their own
                    // private key and the other's public key, for "encrypt / decrypt with AES key".
                    '---',
                    { blockType: Scratch.BlockType.LABEL, text: 'ECDH key exchange' },
                    {
                        opcode: 'generateECDHKey',
                        text: 'generate ECDH keypair',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        disableMonitor: true
                    },
                    {
                        opcode: 'ecdhSharedKey',
                        text: 'shared AES key from my private key [PRIVATE] and their public key [PUBLIC]',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        arguments: {
                            PRIVATE: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL },
                            PUBLIC: { type: Scratch.ArgumentType.EMPTY, shape: Scratch.BlockShape.OCTAGONAL }
                        }
                    },
                ],

                menus: {
                    ALGORITHM: { items: ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512', 'MD5'] }, // Desktop fork (section 259): MD5
                    TYPED_ARRAYS: ['Uint8Array','Uint16Array','Uint32Array','Int8Array','Int16Array','Int32Array']
                }
            };
        }

        randomUUID() {
            return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : '';
        }

        randomValues(args) {
            const typedArrayConstructors = {
                Uint8Array: Uint8Array,
                Uint16Array: Uint16Array,
                Uint32Array: Uint32Array,
                Int8Array: Int8Array,
                Int16Array: Int16Array,
                Int32Array: Int32Array
            };

            const TypedArrayConstructor = typedArrayConstructors[args.SCALE];
            if (!TypedArrayConstructor) throw new Error('Unsupported TypedArray type specified.');

            let amt = Number(args.AMOUNT) || 0;
            amt = Math.max(0, Math.floor(amt));
            if (amt > 1000000) amt = 1000000;

            const arr = new TypedArrayConstructor(amt);
            crypto.getRandomValues(arr);
            return JSON.stringify(Array.from(arr));
        }

        async digest(args) {
            const algo = typeof args.ALGORITHM === 'string' ? args.ALGORITHM : 'SHA-256';
            if (algo === 'MD5') return md5(String(args.VALUE)); // Desktop fork (section 259)
            const bytes = new TextEncoder().encode(String(args.VALUE));
            const hash = await crypto.subtle.digest(algo, bytes);
            return bufToHex(hash);
        }

        async generateSignKey() {
            const key = await crypto.subtle.generateKey({
                name: 'HMAC',
                hash: { name: 'SHA-512' }
            }, true, ['sign', 'verify']);
            const jwk = await crypto.subtle.exportKey('jwk', key);
            return JSON.stringify(jwk);
        }

        async signValue(args) {
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, {
                name: 'HMAC',
                hash: { name: 'SHA-512' }
            }, false, ['sign']);
            const data = new TextEncoder().encode(String(args.VALUE));
            const sig = await crypto.subtle.sign('HMAC', key, data);
            return bufToHex(sig);
        }

        async verifySignature(args) {
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, {
                name: 'HMAC',
                hash: { name: 'SHA-512' }
            }, false, ['verify']);
            const data = new TextEncoder().encode(String(args.VALUE));
            try {
                return await crypto.subtle.verify('HMAC', key, hexToBuf(args.SIGNATURE), data);
            } catch (e) {
                return false;
            }
        }

        async generateAESKey() {
            const key = await crypto.subtle.generateKey({
                name: 'AES-GCM',
                length: 256
            }, true, ['encrypt', 'decrypt']);
            const jwk = await crypto.subtle.exportKey('jwk', key);
            return JSON.stringify(jwk);
        }

        async encryptAES(args) {
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = new TextEncoder().encode(String(args.PLAINTEXT));
            const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
            return JSON.stringify({
                iv: bufToHex(iv),
                ct: bufToHex(ciphertext)
            });
        }

        async decryptAES(args) {
            let obj;
            try {
                obj = JSON.parse(String(args.CIPHERTEXT));
            } catch {
                return '';
            }
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, { name: 'AES-GCM' }, false, ['decrypt']);
            try {
                const plaintextBuf = await crypto.subtle.decrypt({
                    name: 'AES-GCM',
                    iv: new Uint8Array(hexToBuf(String(obj.iv)))
                }, key, hexToBuf(String(obj.ct)));
                return new TextDecoder().decode(plaintextBuf);
            } catch {
                return '';
            }
        }

        async generateRSAKey() {
            const keyPair = await crypto.subtle.generateKey({
                name: 'RSA-PSS',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: { name: 'SHA-256' }
            }, true, ['sign', 'verify']);

            const ret = {
                publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
                privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey)
            };
            return JSON.stringify(ret);
        }

        async rsaSign(args) {
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-PSS', hash: { name: 'SHA-256' } }, false, ['sign']);
            const data = new TextEncoder().encode(String(args.VALUE));
            const sig = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, key, data);
            return bufToHex(sig);
        }

        async rsaVerify(args) {
            let jwk;
            try {
                jwk = JSON.parse(String(args.KEY));
            } catch {
                return '';
            }
            const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSA-PSS', hash: { name: 'SHA-256' } }, false, ['verify']);
            const data = new TextEncoder().encode(String(args.VALUE));
            try {
                return await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: 32 }, key, hexToBuf(args.SIGNATURE), data);
            } catch {
                return false;
            }
        }

        // Desktop fork (section 259): an ECDH (P-256) key pair, as JSON {publicKey, privateKey} like generateRSAKey
        async generateECDHKey() {
            const keyPair = await crypto.subtle.generateKey({
                name: 'ECDH',
                namedCurve: 'P-256'
            }, true, ['deriveKey', 'deriveBits']);
            return JSON.stringify({
                publicKey: await crypto.subtle.exportKey('jwk', keyPair.publicKey),
                privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey)
            });
        }

        // Desktop fork (section 259): the AES-GCM key (JWK, as generateAESKey) both sides get from their own private
        // key and the other's public key; '' when a key is not an ECDH key
        async ecdhSharedKey(args) {
            try {
                const privateKey = await crypto.subtle.importKey('jwk', JSON.parse(String(args.PRIVATE)), {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                }, false, ['deriveKey']);
                const publicKey = await crypto.subtle.importKey('jwk', JSON.parse(String(args.PUBLIC)), {
                    name: 'ECDH',
                    namedCurve: 'P-256'
                }, false, []);
                const shared = await crypto.subtle.deriveKey({
                    name: 'ECDH',
                    public: publicKey
                }, privateKey, {
                    name: 'AES-GCM',
                    length: 256
                }, true, ['encrypt', 'decrypt']);
                return JSON.stringify(await crypto.subtle.exportKey('jwk', shared));
            } catch {
                return '';
            }
        }

        // these two key methods have more validation (i cried while making them)
        async rsaPublicKey(args) {
            if (typeof args.KEY !== 'string') return '';
            try {
                const key = JSON.parse(args.KEY);
                if (key && key.publicKey) {
                    return JSON.stringify(key.publicKey);
                }
                return '';
            } catch (error) {
                return '';
            }
        }

        async rsaPrivateKey(args) {
            if (typeof args.KEY !== 'string') return '';
            try {
                const key = JSON.parse(args.KEY);
                if (key && key.privateKey) {
                    return JSON.stringify(key.privateKey);
                }
                return '';
            } catch (error) {
                return '';
            }
        }
    }

    Scratch.extensions.register(new Extension());
})(Scratch);
});
