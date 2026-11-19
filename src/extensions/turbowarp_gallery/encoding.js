/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's encoding.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for section 154 (below)
// and section 259: hash, character code and random text blocks removed (Cryptography, built-in and Random Tools blocks
// do the same; MD5 moved to Cryptography); extension merges: HTML Encode (an encode / decode option), LZ Compress and
// Prism's deflate (compress / decompress) and Base (convert, check) moved in, marked "Desktop fork (extension merges)".
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
// Desktop fork (extension merges): the libraries of the merged-in LZ Compress and Prism blocks, outside the wrapped
// gallery code (which hides require)
const LZString = require('lz-string');
const deflateBytes = require('./encoding-deflate');
const inflateBytes = require('./encoding-inflate');
const {validateArray} = require('../../util/json-block-utilities');
const pmBase64 = require('../../util/base64-util'); // Desktop fork (section 306): the shared base64 conversions
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Encoding
// ID: Encoding
// Description: Encode and decode strings into their unicode numbers, base 64, URLs, or numbers for cloud variables.
// By: -SIPC-
// By: GarboMuffin
// License: MIT AND MPL-2.0

/* generated l10n code */Scratch.translate.setup({"de":{"_Encoding":"Kodieren"},"fi":{"_Encoding":"Salaus","_decode [string] with [code]":"pura [string] [code]-salauksella","_encode [string] in [code]":"salaa [string] [code]-salauksella"},"it":{"_Encoding":"Codifica","_decode [string] with [code]":"decodifica [string] come [code]","_encode [string] in [code]":"codifica [string] come [code]"},"ja":{"_Encoding":"エンコーディング","_decode [string] with [code]":"[string]を[code]を使ってデコード","_encode [string] in [code]":"[string]を[code]でエンコード"},"ko":{"_Encoding":"인코딩","_decode [string] with [code]":"[string]을(를) [code]에서 디코딩","_encode [string] in [code]":"[string]을(를) [code](으)로 인코딩"},"nb":{"_Encoding":"Koding"},"nl":{"_Encoding":"Codering"},"ru":{"_Encoding":"Кодировка","_decode [string] with [code]":"раскодировать [string] с [code]","_encode [string] in [code]":"закодировать [string] в [code]"},"uk":{"_Encoding":"Кодування"},"zh-cn":{"_Encoding":"编码","_decode [string] with [code]":"以[code]解密[string]","_encode [string] in [code]":"以[code]加密[string]"}});/* end generated l10n code */(function (Scratch) {
  "use strict";
  const icon =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxMzcuNzk1MDYiIGhlaWdodD0iMTM0LjIzNzA3IiB2aWV3Qm94PSIwLDAsMTM3Ljc5NTA2LDEzNC4yMzcwNyI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE1Mi44OTU4NiwtMTMwLjM3OTg5KSI+PGcgZGF0YS1wYXBlci1kYXRhPSJ7JnF1b3Q7aXNQYWludGluZ0xheWVyJnF1b3Q7OnRydWV9IiBmaWxsPSJub25lIiBmaWxsLXJ1bGU9Im5vbnplcm8iIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyMCIgc3Ryb2tlLWxpbmVjYXA9ImJ1dHQiIHN0cm9rZS1saW5lam9pbj0ibWl0ZXIiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWRhc2hhcnJheT0iIiBzdHJva2UtZGFzaG9mZnNldD0iMCIgc3R5bGU9Im1peC1ibGVuZC1tb2RlOiBub3JtYWwiPjxwYXRoIGQ9Ik0xOTkuMzA5MDgsMjE5LjYyMDExdi03OS4yNDAyMmg4MS4zODE4NHY3OS4yNDAyMnoiLz48cGF0aCBkPSJNMTYyLjg5NTg2LDI1NC42MTY5NnYtNzkuMjQwMjJoODEuMzgxODR2NzkuMjQwMjJ6Ii8+PC9nPjwvZz48L3N2Zz48IS0tcm90YXRpb25DZW50ZXI6ODcuMTA0MTQwMTg0NTE2NDQ6NDkuNjIwMTA4MzQwNzA3OTYtLT4=";
  const icon2 =
    "data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSI4MS44ODUzOSIgaGVpZ2h0PSI4MC42MDMwNyIgdmlld0JveD0iMCwwLDgxLjg4NTM5LDgwLjYwMzA3Ij48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTk5LjA1NzMsLTEzOS42OTg0NikiPjxnIGRhdGEtcGFwZXItZGF0YT0ieyZxdW90O2lzUGFpbnRpbmdMYXllciZxdW90Ozp0cnVlfSIgZmlsbC1ydWxlPSJub256ZXJvIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBzdHJva2UtZGFzaGFycmF5PSIiIHN0cm9rZS1kYXNob2Zmc2V0PSIwIiBzdHlsZT0ibWl4LWJsZW5kLW1vZGU6IG5vcm1hbCI+PHBhdGggZD0iTTI4MC45NDI3LDE4MGMwLDIyLjI1NzkyIC0xOC4zMzA2Nyw0MC4zMDE1NCAtNDAuOTQyNyw0MC4zMDE1NGMtMjIuNjEyMDMsMCAtNDAuOTQyNywtMTguMDQzNjEgLTQwLjk0MjcsLTQwLjMwMTU0YzAsLTIyLjI1NzkyIDE4LjMzMDY3LC00MC4zMDE1NCA0MC45NDI3LC00MC4zMDE1NGMyMi42MTIwMywwIDQwLjk0MjcsMTguMDQzNjEgNDAuOTQyNyw0MC4zMDE1NHoiIGZpbGw9IiM2NDk1ZWQiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIi8+PHBhdGggZD0iTTIzMS44MTg3NiwxODcuOTc2MDh2LTI4Ljc2NzE1aDI5LjczNDExdjI4Ljc2NzE1eiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjYiLz48cGF0aCBkPSJNMjE4LjQ0NzEzLDIwMC43OTEwN3YtMjguNzY3MTVoMjkuNzM0MTF2MjguNzY3MTV6IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iNiIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjQwLjk0MjY5NjA1MzgwMTE0OjQwLjMwMTUzNTI2NTQ4NjcwNi0tPg==";

  // The "Numbers" encoding below is Numerical Encoding V2 by GarboMuffin (MPL-2.0).
  // It stays under MPL-2.0; the rest of this file is MIT.
  const numTextEncoder = new TextEncoder();
  const numTextDecoder = new TextDecoder();

  /**
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  const encodeNumbersBinary = (bytes) => {
    // Pre-allocating buffer seems to be much faster than string concatenation
    const buffer = new Uint8Array(Math.ceil((bytes.length * 8) / 3));
    let ptr = 0;

    for (var i = 0; i <= bytes.length - 3; i += 3) {
      // AAAAAAAA BBBBBBBB CCCCCCCC
      // 11122233 34445556 66777888
      const a = bytes[i];
      const b = bytes[i + 1];
      const c = bytes[i + 2];
      buffer[ptr++] = 49 + (a >> 5);
      buffer[ptr++] = 49 + ((a >> 2) & 0b111);
      buffer[ptr++] = 49 + (((a & 0b11) << 1) | (b >> 7));
      buffer[ptr++] = 49 + ((b >> 4) & 0b111);
      buffer[ptr++] = 49 + ((b >> 1) & 0b111);
      buffer[ptr++] = 49 + (((b & 0b1) << 2) | (c >> 6));
      buffer[ptr++] = 49 + ((c >> 3) & 0b111);
      buffer[ptr++] = 49 + (c & 0b111);
    }

    switch (bytes.length - i) {
      case 1: {
        // AAAAAAAA
        // 11122233 3
        const a = bytes[i];
        buffer[ptr++] = 49 + (a >> 5);
        buffer[ptr++] = 49 + ((a >> 2) & 0b111);
        buffer[ptr++] = 49 + ((a & 0b11) << 1);
        break;
      }

      case 2: {
        // AAAAAAAA BBBBBBBB
        // 11122233 34445556 66
        const a = bytes[i];
        const b = bytes[i + 1];
        buffer[ptr++] = 49 + (a >> 5);
        buffer[ptr++] = 49 + ((a >> 2) & 0b111);
        buffer[ptr++] = 49 + (((a & 0b11) << 1) | (b >> 7));
        buffer[ptr++] = 49 + ((b >> 4) & 0b111);
        buffer[ptr++] = 49 + ((b >> 1) & 0b111);
        buffer[ptr++] = 49 + ((b & 0b1) << 2);
        break;
      }
    }

    return numTextDecoder.decode(buffer);
  };

  /**
   * @param {string} string
   * @returns {Uint8Array}
   */
  const decodeNumbersBinary = (string) => {
    const encodedBytes = Math.floor((string.length * 3) / 8);
    const result = new Uint8Array(encodedBytes);
    let ptr = 0;

    for (var i = 0; i <= string.length - 8; i += 8) {
      // AAA BBB CCC DDD EEE FFF GGG HHH
      // 111 111 112 222 222 233 333 333
      const a = string.charCodeAt(i) - 49;
      const b = string.charCodeAt(i + 1) - 49;
      const c = string.charCodeAt(i + 2) - 49;
      const d = string.charCodeAt(i + 3) - 49;
      const e = string.charCodeAt(i + 4) - 49;
      const f = string.charCodeAt(i + 5) - 49;
      const g = string.charCodeAt(i + 6) - 49;
      const h = string.charCodeAt(i + 7) - 49;
      result[ptr++] = (a << 5) | (b << 2) | (c >> 1);
      result[ptr++] = ((c & 0b1) << 7) | (d << 4) | (e << 1) | (f >> 2);
      result[ptr++] = ((f & 0b11) << 6) | (g << 3) | h;
    }

    switch (encodedBytes - ptr) {
      case 1: {
        // AAA BBB CCC
        // 111 111 11
        const a = string.charCodeAt(i) - 49;
        const b = string.charCodeAt(i + 1) - 49;
        const c = string.charCodeAt(i + 2) - 49;
        result[ptr] = (a << 5) | (b << 2) | (c >> 1);
        break;
      }

      case 2: {
        // AAA BBB CCC DDD EEE FFF
        // 111 111 112 222 222 2
        const a = string.charCodeAt(i) - 49;
        const b = string.charCodeAt(i + 1) - 49;
        const c = string.charCodeAt(i + 2) - 49;
        const d = string.charCodeAt(i + 3) - 49;
        const e = string.charCodeAt(i + 4) - 49;
        const f = string.charCodeAt(i + 5) - 49;
        result[ptr++] = (a << 5) | (b << 2) | (c >> 1);
        result[ptr] = ((c & 0b1) << 7) | (d << 4) | (e << 1) | (f >> 2);
        break;
      }
    }

    return result;
  };

  /**
   * @param {string} text
   * @returns {string}
   */
  const encodeNumbers = (text) =>
    encodeNumbersBinary(numTextEncoder.encode(text));

  /**
   * @param {string} text
   * @returns {string}
   */
  const decodeNumbers = (text) => {
    // All characters must be in range [1, 8]
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      if (ch < 49 || ch > 56) {
        return "";
      }
    }
    return numTextDecoder.decode(decodeNumbersBinary(text));
  };

  // End of the MPL-2.0 part.

  // Desktop fork (extension merges): HTML Encode's escaping, and its reverse for decode
  const htmlEntities = { "&": "&amp;", '"': "&quot;", "'": "&apos;", ">": "&gt;", "<": "&lt;" };
  const htmlCharacters = {};
  for (const [character, entity] of Object.entries(htmlEntities)) htmlCharacters[entity] = character;
  // Desktop fork (extension merges): Base's bases 2 to 36 and their digits
  const bases = Array.from({ length: 35 }, (_, i) => String(i + 2));
  const baseChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  class Encoding {
    getInfo() {
      return {
        id: "Encoding",
        name: Scratch.translate("Encoding"),
        color1: "#6495ed",
        color2: "#739fee",
        color3: "#83aaf0",
        menuIconURI: icon2,
        blockIconURI: icon,
        blocks: [
          {
            opcode: "encode",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("encode [string] in [code]"),
            arguments: {
              string: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
              code: {
                type: Scratch.ArgumentType.STRING,
                menu: "encode",
                defaultValue: "Base64",
              },
            },
          },
          {
            opcode: "decode",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("decode [string] with [code]"),
            arguments: {
              string: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: this._btoa("apple"),
              },
              code: {
                type: Scratch.ArgumentType.STRING,
                menu: "encode",
                defaultValue: "Base64",
              },
            },
          },
          "---",
          // Desktop fork (extension merges): from LZ Compress
          {
            opcode: "compress",
            blockType: Scratch.BlockType.REPORTER,
            text: "compress [string] in [code]",
            arguments: {
              string: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Hello world!",
              },
              code: {
                type: Scratch.ArgumentType.STRING,
                menu: "compress",
                defaultValue: "Base64",
              },
            },
          },
          {
            opcode: "decompress",
            blockType: Scratch.BlockType.REPORTER,
            text: "decompress [string] with [code]",
            arguments: {
              string: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: LZString.compressToBase64("Hello world!"),
              },
              code: {
                type: Scratch.ArgumentType.STRING,
                menu: "compress",
                defaultValue: "Base64",
              },
            },
          },
          // Desktop fork (extension merges): from Prism
          {
            opcode: "deflate",
            blockShape: Scratch.BlockShape.SQUARE, // Desktop fork (section 319): type shapes, always a JSON byte list
            blockType: Scratch.BlockType.REPORTER,
            text: "compress byte list [bytes] with deflate",
            arguments: {
              bytes: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[72,101,108,108,111]",
              },
            },
          },
          {
            opcode: "inflate",
            blockShape: Scratch.BlockShape.SQUARE, // Desktop fork (section 319): type shapes, always a JSON byte list
            blockType: Scratch.BlockType.REPORTER,
            text: "decompress byte list [bytes] with deflate",
            arguments: {
              bytes: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[243,72,205,201,201,7,0]",
              },
            },
          },
          "---",
          // Desktop fork (extension merges): from Base
          {
            opcode: "convertBase",
            blockType: Scratch.BlockType.REPORTER,
            text: "convert [number] from base [from] to base [to]",
            arguments: {
              number: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "255",
              },
              from: {
                type: Scratch.ArgumentType.STRING,
                menu: "base",
                defaultValue: "10",
              },
              to: {
                type: Scratch.ArgumentType.STRING,
                menu: "base",
                defaultValue: "16",
              },
            },
          },
          {
            opcode: "isBase",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is [number] a base [base] number?",
            arguments: {
              number: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "FF",
              },
              base: {
                type: Scratch.ArgumentType.STRING,
                menu: "base",
                defaultValue: "16",
              },
            },
          },
        ],
        menus: {
          encode: {
            acceptReporters: false /* Desktop fork (section 265): only its own items work */,
            items: [
              {
                text: "Base 64",
                value: "Base64",
              },
              "URL",
              // Desktop fork (extension merges): from HTML Encode
              {
                text: "HTML-safe text",
                value: "HTML",
              },
              {
                text: Scratch.translate("Numbers (cloud variables)"),
                value: "Numbers",
              },
            ],
          },
          compress: {
            acceptReporters: false /* Desktop fork (section 265): only its own items work */,
            items: [
              {
                text: "Base 64",
                value: "Base64",
              },
              "URL",
              {
                text: "byte list",
                value: "bytes",
              },
              {
                text: "UTF-16 text",
                value: "UTF16",
              },
              {
                text: "raw text",
                value: "Raw",
              },
            ],
          },
          base: {
            acceptReporters: false /* Desktop fork (section 265): only its own items work */,
            items: bases,
          },
        },
      };
    }
    encode({ string, code }) {
      string = Scratch.Cast.toString(string);
      switch (code) {
        case "Base64":
          return this._btoa(string);
        case "URL":
          return encodeURIComponent(string);
        case "HTML":
          return string.replace(/["'&<>]/g, (a) => htmlEntities[a]);
        case "Numbers":
          return encodeNumbers(string);
      }
      return "";
    }
    decode({ string, code }) {
      string = Scratch.Cast.toString(string);
      switch (code) {
        case "Base64":
          try {
            return this._atob(string);
          } catch (error) {
            console.error("invalid base 64", error);
            return "";
          }
        case "URL":
          return decodeURIComponent(string);
        case "HTML":
          return string.replace(/&(?:amp|quot|apos|gt|lt);/g, (a) => htmlCharacters[a]);
        case "Numbers":
          return decodeNumbers(string);
      }
      return "";
    }
    // Desktop fork (extension merges): LZ Compress's blocks (lz-string); a byte list is a JSON array of bytes
    compress({ string, code }) {
      const text = Scratch.Cast.toString(string);
      switch (code) {
        case "Raw":
          return LZString.compress(text);
        case "Base64":
          return LZString.compressToBase64(text);
        case "URL":
          return LZString.compressToEncodedURIComponent(text);
        case "bytes":
          return JSON.stringify(Array.from(LZString.compressToUint8Array(text)));
        case "UTF16":
          return LZString.compressToUTF16(text);
      }
      return "";
    }
    decompress({ string, code }) {
      try {
        const text = Scratch.Cast.toString(string);
        switch (code) {
          case "Raw":
            return LZString.decompress(text) || "";
          case "Base64":
            return LZString.decompressFromBase64(text) || "";
          case "URL":
            return LZString.decompressFromEncodedURIComponent(text) || "";
          case "bytes": {
            const array = validateArray(text);
            if (!array.isValid) return "";
            return LZString.decompressFromUint8Array(Uint8Array.from(array.array)) || "";
          }
          case "UTF16":
            return LZString.decompressFromUTF16(text) || "";
        }
      } catch (e) {
        console.error("decompress error", e);
      }
      return "";
    }
    // Desktop fork (extension merges): Prism's deflate / inflate (JS Deflate by BeatGammit)
    deflate({ bytes }) {
      return JSON.stringify(deflateBytes(validateArray(bytes).array));
    }
    inflate({ bytes }) {
      return JSON.stringify(inflateBytes(validateArray(bytes).array));
    }
    // Desktop fork (extension merges): Base's blocks
    convertBase({ number, from, to }) {
      const text = Scratch.Cast.toString(number);
      const fromBase = Scratch.Cast.toString(from);
      const toBase = Scratch.Cast.toString(to);
      if (!bases.includes(fromBase) || !bases.includes(toBase)) return "0";
      if (!new RegExp("^[" + baseChars.substring(0, Number(fromBase)) + "]+$").test(text)) return "0";
      // "0" because toString() always answers text
      return parseInt(text, Number(fromBase)).toString(Number(toBase)).toUpperCase() || "0";
    }
    isBase({ number, base }) {
      const baseText = Scratch.Cast.toString(base);
      if (!bases.includes(baseText)) return false;
      return new RegExp("^[" + baseChars.substring(0, Number(baseText)) + "]+$").test(
        Scratch.Cast.toString(number)
      );
    }
    _btoa(unicode) {
      return pmBase64.uint8ArrayToBase64(new TextEncoder().encode(unicode));
    }
    _atob(base64) {
      return new TextDecoder().decode(pmBase64.base64ToUint8Array(base64));
    }
  }
  Scratch.extensions.register(new Encoding());
})(Scratch);
});
