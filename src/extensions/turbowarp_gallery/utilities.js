/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's utilities.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for section 154 (below).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Utilities
// ID: utilities
// Description: A bunch of interesting blocks.
// Original: Sheep_maker <https://scratch.mit.edu/users/Sheep_maker/>
// License: MIT AND MPL-2.0

/*!
 * This is based on:
 * https://github.com/SheepTester/sheeptester.github.io/blob/master/javascripts/utilities.js
 *
 * Original license:
 * MIT License
 *
 * Copyright (c) 2021 Sean
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/* generated l10n code */Scratch.translate.setup({"de":{"_Utilities":"Verschiedene Blöcke","_[PATH] of [JSON_STRING]":"[PATH] von [JSON_STRING]"},"fi":{"_Utilities":"Työkalut","_[PATH] of [JSON_STRING]":"[PATH] JSON-koodissa [JSON_STRING]","_content from [URL]":"sisältö URL-osoitteesta [URL]","_if [A] then [B] else [C]":"jos [A], niin [B] tai muuten [C]","_letters [START] to [END] of [STRING]":"merkkijonon [STRING] merkit [START] – [END]","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"korvaa [REGEX] merkkijonolla [NEWSTRING] merkkijonossa [STRING]"},"it":{"_Utilities":"Utilità","_[PATH] of [JSON_STRING]":"[PATH] di [JSON_STRING]","_content from [URL]":"contenuto di [URL]","_if [A] then [B] else [C]":"se [A] allora [B] altrimenti [C]","_letters [START] to [END] of [STRING]":"lettere da [START] a [END] di [STRING]","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"sostituisci [REGEX] in [STRING] con [NEWSTRING]"},"ja":{"_Utilities":"ユーティリティ","_[PATH] of [JSON_STRING]":"[JSON_STRING]の[PATH]","_content from [URL]":"[URL]からのコンテンツ","_if [A] then [B] else [C]":"もし[A]なら[B]でなければ[C]","_letters [START] to [END] of [STRING]":"[STRING]の[START]から[END]番目","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"[STRING]の[REGEX]を[NEWSTRING]に置き換える"},"ko":{"_Utilities":"유틸리티","_[PATH] of [JSON_STRING]":"[JSON_STRING]에서 [PATH]","_content from [URL]":"[URL]의 내용","_if [A] then [B] else [C]":"[A] (이)라면 [B] 아니면 [C]","_letters [START] to [END] of [STRING]":"[STRING]의 [START]부터 [END]까지의 글자"},"nb":{"_Utilities":"Verktøy"},"nl":{"_Utilities":"Utiliteiten","_[PATH] of [JSON_STRING]":"[PATH] van [JSON_STRING]","_if [A] then [B] else [C]":"als [A] dan [B] anders [C]","_letters [START] to [END] of [STRING]":"letters [START] t/m [END] van [STRING]","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"vervang [STRING] met regel [REGEX] door [NEWSTRING]"},"ru":{"_Utilities":"Утилиты","_[PATH] of [JSON_STRING]":"[PATH] из [JSON_STRING]","_content from [URL]":"контент из [URL]","_if [A] then [B] else [C]":"если [A] тогда [B] иначе [C]","_letters [START] to [END] of [STRING]":"буквы с [START] до [END] в строке [STRING]","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"заменить [STRING] используя правило [REGEX] с [NEWSTRING]"},"zh-cn":{"_Utilities":"工具","_[PATH] of [JSON_STRING]":"[JSON_STRING]中的[PATH]","_content from [URL]":"来自[URL]的内容","_if [A] then [B] else [C]":"[A]？[B]：[C]","_letters [START] to [END] of [STRING]":"[STRING]的第[START]到第[END]位","_replace [STRING] using the rule [REGEX] with [NEWSTRING]":"以规则[REGEX]替换[STRING]为[NEWSTRING]"}});/* end generated l10n code */(function (Scratch) {
  "use strict";

  const icon =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAADTUlEQVRIS63VTWgUZxgH8P+7Mzsf+2U2SrPJKBoEA1WKUMzupaKHpgoetadCnaBN9FRaLLRQEW17KKIed1V21dJLbU/FRqiixx219NDaVi+NmnWNZT+cze7Ozsf7yoxEYpnMRJI5DQzP+5v3P8/7DEHANVHM7iXAVyAkwQCNgZYjDp3KH7jzZ1DdwmckBLirrE29KQgcTNOBZTrQdYP2es631LSPnp34zQqDlgTIcvTlOowxNBsG6o3uHw6he899eOt+EBIGeBHxUW5ElDjEYwKSKdFbzzAsVB61/q4lWlsvv3/XXAwJBOaL9pe29slE3MgoOSHF+N0DAwnwfASNehe1WudkYVw7sixgYfFkMXtSikU/VZQU3LhmHjVZ17Sz59Tbt/2QJe3glUIGMnEhe3PgjcR2Ny5dN/Df0873ebX8gS/wshUBUMK+PKveuhzWGZPF0fdiceHq4FAK3a6FyoyuFca13GKA14ruw8qM/ldhXNscBnz03duDUSY83jCchu04ePBvs5ZXtTW+wGQpW12/IZ1xP9r0dAM9g2bOH9Rmg5DDpW0ZwvFVD7CpW1ctqNqQP1DM/ZJRErvdFqw+bqHdMccKqvZr4AEsbdsVj4lTbkTttolqtXWloGp7FtlB7uv+1fIX6bSM9pyJJ9W5a3m1PAYC5ou4H7mUvT44mNwZTwio17to1Dsn8qp21Bc4cGl0WCLcP+vW9wkRQrxddNrW6cyw9NmxnTfthUX7ftgs9LcTP8dkfmxIWeW16cOHTdO22EheLU8v2qYTxezn6bT8zeo1MS/T2dk5GB3rHgNOMd6+SsFxnE3eJcAnohwdUZQkQAjqtTYadePHwri2L/CgHbuxg3/ywPhdUZJbJOnF3GnpPS9fw7ABAkgij3h8flS46REYPRvVig5KoebV8oXAg3bw4ugmjkV+6u+Xt/T1SSDE/wy6sTxrdiHHBYgCH4q8ssqLjOPHZYk/kkiKEUHg4Y5qBgbLpDBNG62W5Rhde4rjsGdISUEUgxHf1zx0MfsWdTBGCHIAeQeABbAyBdPmfziTpdz+SASlMOT1Z9GCoJeCLAtwrTBk2UAYsiKAH+JN2YreXDHg/wilzJ3Oz1YUmEcYY2fce0LIx88BFi6vvp70RPYAAAAASUVORK5CYII=";

  class Utilities {
    getInfo() {
      return {
        id: "utilities",
        name: Scratch.translate("Utilities"),

        color1: "#8BC34A",
        color2: "#7CB342",
        color3: "#689F38",

        menuIconURI: icon,

        blocks: [
          {
            opcode: "ternaryOperator",

            blockType: Scratch.BlockType.REPORTER,

            text: Scratch.translate("if [A] then [B] else [C]"),
            arguments: {
              A: {
                type: Scratch.ArgumentType.BOOLEAN,
              },
              B: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "banana",
              },
              C: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
            },
            allowDropAnywhere: true,
          },
          {
            opcode: "letters",

            blockType: Scratch.BlockType.REPORTER,

            text: Scratch.translate("letters [START] to [END] of [STRING]"),
            arguments: {
              START: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 5,
              },
              END: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 7,
              },
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "red apple",
              },
            },
          },
          {
            opcode: "fetchFrom",

            blockType: Scratch.BlockType.REPORTER,

            text: Scratch.translate("content from [URL]"),
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://extensions.turbowarp.org/hello.txt",
              },
            },
          },
          {
            opcode: "parseJSON",

            blockType: Scratch.BlockType.REPORTER,

            text: Scratch.translate({
              default: "[PATH] of [JSON_STRING]",
              description:
                'PATH is a string like "fruit/apples" and JSON_STRING is an object like {"fruit":{"apples":3}}. 3 would be reported in this example.',
            }),
            arguments: {
              PATH: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "fruit/apples",
              },
              JSON_STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue:
                  '{"fruit": {"apples": 2, "bananas": 3}, "total_fruit": 5}',
              },
            },
          },
          {
            opcode: "stringToBoolean",

            blockType: Scratch.BlockType.BOOLEAN,

            // eslint-disable-next-line extension/should-translate
            text: "[STRING]",
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "true",
              },
            },
          },
          {
            opcode: "regexReplace",

            blockType: Scratch.BlockType.REPORTER,

            text: Scratch.translate(
              "replace [STRING] using the rule [REGEX] with [NEWSTRING]"
            ),
            arguments: {
              STRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "bananas are awesome. i like bananas.",
              },
              REGEX: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "banana",
              },
              NEWSTRING: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "apple",
              },
            },
          },
        ],
      };
    }








    ternaryOperator({ A, B, C }) {
      return A ? B : C;
    }

    letters({ STRING, START, END }) {
      const str = Scratch.Cast.toString(STRING);
      return str.slice(Math.max(1, START) - 1, Math.min(str.length, END));
    }



    fetchFrom({ URL }) {
      return Scratch.fetch(URL)
        .then((res) => res.text())
        .catch((err) => "");
    }

    parseJSON({ PATH, JSON_STRING }) {
      try {
        const path = PATH.toString()
          .split("/")
          .map((prop) => decodeURIComponent(prop));
        if (path[0] === "") path.splice(0, 1);
        if (path[path.length - 1] === "") path.splice(-1, 1);
        let json;
        try {
          // Desktop fork (section 196): fixed text comes parsed (irgen.js fixedJsonInputs)
          json = JSON_STRING.pmFixedJson || JSON.parse(" " + JSON_STRING);
        } catch (e) {
          return e.message;
        }

        for (const prop of path) {
          if (!Object.prototype.hasOwnProperty.call(json, prop)) {
            return "";
          }
          json = json[prop];
        }

        if (json === null) return "null";
        else if (json === undefined) return "";
        else if (typeof json === "object") return JSON.stringify(json);
        else return json.toString();
      } catch (err) {
        return "";
      }
    }


    stringToBoolean({ STRING }) {
      return Scratch.Cast.toBoolean(STRING);
    }

    regexReplace({ STRING, REGEX, NEWSTRING }) {
      return STRING.toString().replace(new RegExp(REGEX, "gi"), NEWSTRING);
    }
  }

  Scratch.extensions.register(new Utilities());
})(Scratch);
});
