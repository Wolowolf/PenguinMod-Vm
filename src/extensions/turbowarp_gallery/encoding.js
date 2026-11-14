/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's encoding.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for section 154 (below)
// and section 259: hash, character code and random text blocks removed (Cryptography, built-in and Random Tools blocks
// do the same; MD5 moved to Cryptography).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
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
        ],
        menus: {
          encode: {
            acceptReporters: true,
            items: [
              {
                text: "Base 64",
                value: "Base64",
              },
              "URL",
              {
                text: Scratch.translate("Numbers (cloud variables)"),
                value: "Numbers",
              },
            ],
          }
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
        case "Numbers":
          return decodeNumbers(string);
      }
      return "";
    }
    _btoa(unicode) {
      let bytes = new TextEncoder().encode(unicode);
      let binString = Array.from(bytes, (byte) =>
        String.fromCodePoint(byte)
      ).join("");
      return btoa(binString);
    }
    _atob(base64) {
      let binString = atob(base64);
      let bytes = Uint8Array.from(binString, (m) => m.codePointAt(0));
      return new TextDecoder().decode(bytes);
    }
  }
  Scratch.extensions.register(new Encoding());
})(Scratch);
});
