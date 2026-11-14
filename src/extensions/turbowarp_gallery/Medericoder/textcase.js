/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's Medericoder/textcase.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for sections 154 (below) and 259:
// its compare and convert / check case blocks are removed (built-in "=", More Operators "exactly equals" and
// Text Tools' case blocks, which took over its cases), marked "Desktop fork (section 259)".
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
module.exports = require('../../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Text Case
// ID: medericodertextcase
// Description: Change text to upper or lower case, check what case a text is in, compare texts and add glitches.
// By: Médéric NIOT
// License: Apache-2.0

/*!
 * Copyright 2023 Médéric NIOT
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(function (Scratch) {
  "use strict";
  // Desktop fork (section 259): only the "invert" case of the removed convert block is kept, for the glitch block
  function invertCase(text) {
    let x = "";
    for (let i = 0; i < text.length; i++) {
      if (text.toString()[i] === text.toString()[i].toUpperCase()) {
        x += text.toString()[i].toLowerCase();
      } else {
        x += text.toString()[i].toUpperCase();
      }
    }
    return x;
  }

  function fungetcase(args) {
    var low = 0;
    var up = 0;
    for (let i = 0; i < args.TEXT.length; i++) {
      if (
        args.TEXT.toString()[i].toLowerCase() ===
        args.TEXT.toString()[i].toUpperCase()
      ) {
        low += 0;
        up += 0;
      } else if (
        args.TEXT.toString()[i].toLowerCase() === args.TEXT.toString()[i]
      ) {
        low += 1;
      } else {
        up += 1;
      }
    }
    if (up == 0 && low == 0) {
      return "";
    } else if (up > 0 && low > 0) {
      if (up == low) {
        return "mixed";
      } else if (up > low) {
        return "mixed (upper)";
      } else {
        return "mixed (lower)";
      }
    } else if (up > low) {
      return "upper";
    } else {
      return "lower";
    }
  }

  class TextCase {
    getInfo() {
      return {
        id: "medericodertextcase",
        name: Scratch.translate("Text Case"),
        blocks: [
          {
            opcode: "getcase",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("case from [TEXT]"),
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("hello world"),
              },
            },
          },
          "---",
          {
            opcode: "glitch",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate("glitch [TEXT] level [PROBA]%"),
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: Scratch.translate("Hello"),
              },
              PROBA: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10,
              },
            },
          },
        ],
      };
    }

    getcase(args) {
      return fungetcase(args);
    }

    glitch(args) {
      var x = "";
      for (let i = 0; i < args.TEXT.toString().length; i++) {
        if (Scratch.vm.runtime.pmRandom() * 100 < args.PROBA) {
          x += invertCase(args.TEXT.toString()[i]);
        } else {
          x += args.TEXT.toString()[i];
        }
      }
      return x;
    }
  }
  Scratch.extensions.register(new TextCase());
})(Scratch);
});
