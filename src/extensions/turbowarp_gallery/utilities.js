/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the TurboWarp gallery's utilities.js as its build makes it, moved into
// the VM as a built-in extension. The code is the gallery file unchanged except for section 154 (below) and section 259:
// the blocks that duplicate built-in or Network blocks are removed, and "sprite clicked?" is added (from the removed
// Lily's Toolbox), marked "Desktop fork (section 259)".
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

/* generated l10n code */Scratch.translate.setup({"de":{"_Utilities":"Verschiedene Blöcke","_[PATH] of [JSON_STRING]":"[PATH] von [JSON_STRING]"},"fi":{"_Utilities":"Työkalut","_[PATH] of [JSON_STRING]":"[PATH] JSON-koodissa [JSON_STRING]","_sprite clicked?":"napautetaanko hahmoa?"},"it":{"_Utilities":"Utilità","_[PATH] of [JSON_STRING]":"[PATH] di [JSON_STRING]","_sprite clicked?":"sprite cliccato"},"ja":{"_Utilities":"ユーティリティ","_[PATH] of [JSON_STRING]":"[JSON_STRING]の[PATH]","_sprite clicked?":"スプライトがクリックされている"},"ko":{"_Utilities":"유틸리티","_[PATH] of [JSON_STRING]":"[JSON_STRING]에서 [PATH]","_sprite clicked?":"스프라이트를 클릭했는가?"},"nb":{"_Utilities":"Verktøy"},"nl":{"_Utilities":"Utiliteiten","_[PATH] of [JSON_STRING]":"[PATH] van [JSON_STRING]","_sprite clicked?":"sprite geklikt?"},"ru":{"_Utilities":"Утилиты","_[PATH] of [JSON_STRING]":"[PATH] из [JSON_STRING]","_sprite clicked?":"спрайт нажат?"},"zh-cn":{"_Utilities":"工具","_[PATH] of [JSON_STRING]":"[JSON_STRING]中的[PATH]","_sprite clicked?":"角色被点击？"},"uk":{"_sprite clicked?":"спрайт натиснуто?"}});/* end generated l10n code */(function (Scratch) {
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
          "---",
          // Desktop fork (section 259): from the removed Lily's Toolbox
          {
            opcode: "spriteClicked",
            blockType: Scratch.BlockType.BOOLEAN,
            text: Scratch.translate("sprite clicked?"),
            filter: [Scratch.TargetType.SPRITE],
            disableMonitor: true,
          },
        ],
      };
    }

    // Desktop fork (section 259): from the removed Lily's Toolbox: the mouse is down on this sprite
    spriteClicked(args, util) {
      return (
        util.ioQuery("mouse", "getIsDown") &&
        util.target.isTouchingObject("_mouse_")
      );
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



  }

  Scratch.extensions.register(new Utilities());
})(Scratch);
});
