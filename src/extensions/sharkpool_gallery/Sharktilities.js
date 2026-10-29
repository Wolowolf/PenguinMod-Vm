/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the SharkPool gallery's Sharktilities.js, moved into
// the VM as a built-in extension. The code is the gallery file, changed only where marked "Desktop fork (section 123)"
// (docs/EXTENSION-ROADMAP.md step 5d): "old value" is dragged as a copy through the block's canDragDuplicate
// instead of replacing ScratchBlocks.scratchBlocksUtils.isShadowArgumentReporter. "when [] is changed" is checked only
// when what its input reads changed (`pmEdgeHat`; section 128, roadmap step 6b; marked "Desktop fork (section 128)").
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
// Desktop fork (section 159): its dialogs, localStorage and window / document event listeners go through
// Scratch.vm.runtime.pmPage, the runtime's door to the page (marked by the name).
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Sharktilities
// ID: SharkPoolSharktilities
// Description: Various Utility Blocks for Various Operations
// By: SharkPool
// License: MIT

// Version V.3.4.15

(function (Scratch) {
  "use strict";
  if (!Scratch.extensions.unsandboxed) throw new Error("Sharktilities must run unsandboxed");

  const menuIconURI =
"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMzUuMzYzIiBoZWlnaHQ9IjEzNS4zNjMiIHZpZXdCb3g9IjAgMCAxMzUuMzYzIDEzNS4zNjMiPjxnIHN0cm9rZS1taXRlcmxpbWl0PSIxMCI+PHBhdGggZD0iTTAgNjcuNjgxQzAgMzAuMzAxIDMwLjMwMiAwIDY3LjY4MSAwYzM3LjM4IDAgNjcuNjgyIDMwLjMwMiA2Ny42ODIgNjcuNjgxIDAgMzcuMzgtMzAuMzAzIDY3LjY4Mi02Ny42ODIgNjcuNjgyUzAgMTA1LjA2IDAgNjcuNjgxIiBmaWxsPSIjMzNiNmZmIi8+PHBhdGggZD0iTTMyLjM0OCA5NC45ODRzMTIuNTU4IDYuNDEzIDE1LjM0OS04LjQ0N2M0LjA1NC0yMS41OTItMi41NzMtNDAuMzM0LTYuMzQ0LTQ4LjcwOC0xLjM0OS0yLjk5My0uMDAyLTQuMjU4IDMuNjUtMy40MDQgOS4yMyAyLjE1NyAyNi45MDcgNy4xOSAzNi44MTYgMTUuODYgMTUuMjEzIDEzLjMxMyAxNS41NDUgMzQuMDcgMTguNTEyIDM5Ljk2OCAyLjQyNyA0LjgyNCA5LjU5NCAyLjYyIDkuNTk0IDIuNjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI3LjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvZz48L3N2Zz4=";

  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const regenReporters = ["SharkPoolSharktilities_changeV"];
  var lastValues = {};

  runtime.on("BEFORE_EXECUTE", () => runtime.startHats("SharkPoolSharktilities_whenChanged"));
  // Desktop fork (section 123): the block's canDragDuplicate makes the block library treat it like an argument reporter

  // This function was taken from Looks+ by LilyMakesThings
  const packageTest = (blockName) => {
    if (runtime.isPackaged) {
      Scratch.vm.runtime.pmPage.alert(`For SharkTilities to work, the creator of the packaged project must uncheck "Remove raw asset data after loading to save RAM" under advanced settings in the packager.`);
      return true;
    }
    return false;
  };

  class Sharktilities {
    getInfo() {
      return {
        id: "SharkPoolSharktilities",
        name: "Sharktilities",
        color1: "#33B6FF",
        menuIconURI,
        blocks: [
          { blockType: Scratch.BlockType.LABEL, text: "Management" },
          {
            opcode: "penLayer",
            blockType: Scratch.BlockType.REPORTER,
            text: "get pen layer",
            disableMonitor: true
          },
          {
            opcode: "getText", blockType: Scratch.BlockType.REPORTER,
            text: "what is [SPRITE] saying",
            arguments: {
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "TARGETS2" }
            }
          },
          {
            opcode: "costumeInfo",
            blockType: Scratch.BlockType.REPORTER,
            text: "[INFO] of costume #[NUM] in [SPRITE]",
            arguments: {
              INFO: { type: Scratch.ArgumentType.STRING, menu: "cosInfo" },
              NUM: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "TARGETS" }
            }
          },
          {
            opcode: "setTargetCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: "set costume of [SPRITE] to [NUM]",
            arguments: {
              NUM: { type: Scratch.ArgumentType.STRING, defaultValue: 1 },
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "TARGETS" }
            }
          },
          "---",
          {
            opcode: "cloudCode",
            blockType: Scratch.BlockType.REPORTER,
            text: "☁ cloud [CODE] string [TEXT]",
            arguments: {
              CODE: { type: Scratch.ArgumentType.STRING, menu: "encoder" },
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "SharkPool" }
            }
          },
          { blockType: Scratch.BlockType.XML, xml: `<block type="SharkPoolSharktilities_whenChanged"><value name="CHANGE"><shadow type="SharkPoolSharktilities_changeV"></shadow></value></block>` },
          {
            opcode: "whenChanged", blockType: Scratch.BlockType.HAT,
            text: "when [INPUT] is changed [CHANGE]",
            isEdgeActivated: false, hideFromPalette: true,
            pmEdgeHat: { ignore: ["CHANGE"] }, // Desktop fork (section 128): "old value" does not change the answer
            arguments: { INPUT: { type: null }, CHANGE: {} }
          },
          {
            opcode: "changeV", blockType: Scratch.BlockType.REPORTER,
            hideFromPalette: true, text: "old value", canDragDuplicate: true // Desktop fork (section 123)
          },
          {
            opcode: "isChanged",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[INPUT] changed",
            arguments: {
              INPUT: { type: null }
            }
          },
          {
            opcode: "broadcastRun",
            blockType: Scratch.BlockType.LOOP,
            text: "broadcast [MSG] and repeat while waiting",
            arguments: {
              MSG: { type: Scratch.ArgumentType.STRING, defaultValue: "message1" }
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Color and Effects" },
          {
            opcode: "setSpriteEffect",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [EFFECT] to [VALUE] of [SPRITE]",
            arguments: {
              EFFECT: { type: Scratch.ArgumentType.STRING, menu: "EFFECT_MENU" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "TARGETS" }
            }
          },
          {
            opcode: "hexBrightness",
            blockType: Scratch.BlockType.REPORTER,
            text: "change brightness of [COLOR] by [CHANGE]",
            arguments: {
              COLOR: { type: Scratch.ArgumentType.COLOR },
              CHANGE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 }
            }
          },
          {
            opcode: "removeThorns",
            blockType: Scratch.BlockType.REPORTER,
            text: "remove vector thorns from [SVG]",
            arguments: {
              SVG: { type: Scratch.ArgumentType.STRING, defaultValue: "<svg>" }
            }
          },
          {
            opcode: "genShape",
            blockType: Scratch.BlockType.REPORTER,
            text: "make [TYPE] shape with points [POINTS] filled [COLOR] width [WIDTH] height [HEIGHT] x [X] y [Y] curve [LINE]",
            arguments: {
              POINTS: { type: Scratch.ArgumentType.STRING, defaultValue: "0,0 200,0 100, 200" },
              COLOR: { type: Scratch.ArgumentType.COLOR },
              WIDTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 },
              HEIGHT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 200 },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              LINE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "RETURN" }
            }
          },
          "---",
          {
            opcode: "unboundSound",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [EFFECT] of [SPRITE] to [VALUE] unclamped",
            arguments: {
              EFFECT: { type: Scratch.ArgumentType.STRING, menu: "SOUND" },
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "TARGETS" },
              VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Math" },
          {
            opcode: "randomSingleInteger",
            blockType: Scratch.BlockType.REPORTER,
            text: "pick random single integer",
            disableMonitor: true
          },
          "---",
          {
            opcode: "smoothing",
            blockType: Scratch.BlockType.REPORTER,
            text: "smooth [MATH] at speed [SPEED] and limit [LIMIT]",
            arguments: {
              MATH: { type: Scratch.ArgumentType.STRING, menu: "mathMenu" },
              SPEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              LIMIT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 25 }
            }
          },
          {
            opcode: "smoothing2",
            blockType: Scratch.BlockType.REPORTER,
            text: "smooth [MATH] [NUM] at speed [SPEED] and limit [LIMIT]",
            arguments: {
              MATH: { type: Scratch.ArgumentType.STRING, menu: "mathMenu" },
              NUM: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              SPEED: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              LIMIT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 25 }
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Strings" },
          {
            opcode: "typeString",
            blockType: Scratch.BlockType.REPORTER,
            text: "[STRING1] [TYPE] [STRING2]",
            arguments: {
              STRING1: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              STRING2: { type: Scratch.ArgumentType.STRING, defaultValue: "value" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "STRING" }
            }
          },
          {
            opcode: "shuffleArray",
            blockType: Scratch.BlockType.REPORTER,
            text: "organize array [WORDS] by [SHUFFLE_OPTION]",
            arguments: {
              WORDS: { type: Scratch.ArgumentType.STRING, defaultValue: "[\"word1\", \"word2\", \"word3\"]" },
              SHUFFLE_OPTION: { type: Scratch.ArgumentType.STRING, menu: "shuffleOption" }
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Experimental" },
          {
            opcode: "stepInter",
            blockType: Scratch.BlockType.COMMAND,
            text: "step interpolation",
          },
          {
            opcode: "refresh",
            blockType: Scratch.BlockType.COMMAND,
            text: "refresh extensions",
            isTerminal: true
          },
          {
            opcode: "request",
            blockType: Scratch.BlockType.COMMAND,
            text: "request [THING]",
            arguments: {
              THING: { type: Scratch.ArgumentType.STRING, menu: "reqMenu" }
            }
          },
          /* Deprecation Marker */
          /* Marker End */
        ],
        menus: {
          TARGETS: { acceptReporters: true, items: this._getTargets(true) },
          TARGETS2: { acceptReporters: true, items: this._getTargets(false) },
          ROUND_MENU: { acceptReporters: true, items: ["whole number", "tenths", "hundredths", "thousandths"] },
          LETTER_TYPE_MENU: { acceptReporters: true, items: ["lowercase", "uppercase"] },
          reqMenu: {
            acceptReporters: true,
            items: ["redraw", "project step", "toolbox update", "block refresh"]
          },
          EFFECT_MENU: {
            acceptReporters: true,
            items: ["color", "fisheye", "whirl", "pixelate", "mosaic", "brightness", "ghost"]
          },
          mathMenu: { acceptReporters: true, items: ["sin", "cos"] },
          OPERATOR_MENU: ["+", "-", "*", "/"],
          OPERATORS: [">", "<", "="],
          STRING: ["||", "??"],
          SOUND: ["volume", "pitch", "pan"],
          RETURN: ["svg", "encoded svg", "png"],
          encoder: ["encode", "decode"],
          cosInfo: {
            acceptReporters: true,
            items: [
              "name", "width", "height", "type", "rotation center x",
              "rotation center y", "content", "data.uri"
            ]
          },
          shuffleOption: {
            acceptReporters: true,
            items: [
              "random", "ascending", "descending",
              "ascending by length", "descending by length",
              "most common", "least common"
            ]
          }
        },
      };
    }

    _getTargets(ind) {
      const spriteNames = [{ text: "myself", value: "_myself_" }];
      if (ind) spriteNames.push({ text: "Stage", value: "_stage_" });
      const targets = runtime.targets;
      for (let index = 1; index < targets.length; index++) {
        const target = targets[index];
        if (target.isOriginal) spriteNames.push({ text: target.getName(), value: target.getName() });
      }
      return spriteNames.length > 0 ? spriteNames : [""];
    }

    whenChanged(args, util) {
      if (typeof util.thread.sharktilsPars === "undefined") util.thread.stackFrames[0].sharktilsPars = {};
      const blockId = `${util.target.id}${util.thread.peekStack()}`;
      const input = args.INPUT;
      if (!lastValues[blockId]) lastValues[blockId] = input;
      if (lastValues[blockId] !== input) {
        util.thread.stackFrames[0].sharktilsPars.diff = lastValues[blockId];
        lastValues[blockId] = input;
        return true;
      }
      return false;
    }
    changeV(args, util) {
      const stack = util.thread.stackFrames;
      if (typeof stack === "undefined") return "";
      const params = stack[0].sharktilsPars;
      if (typeof params === "undefined") return "";
      return params.diff || "";
    }

    isChanged(args, util) {
      const thisID = util.thread.isCompiled ? util.thread.peekStack() : util.thread.peekStackFrame().op.id;
      const input = args.INPUT;
      if (!util.thread.stackFrames[0].oldVal) util.thread.stackFrames[0].oldVal = {};
      const oldVal = util.thread.stackFrames[0].oldVal[thisID];
      const con = oldVal !== input && oldVal !== undefined;
      util.thread.stackFrames[0].oldVal[thisID] = input;
      return con;
    }

    randomSingleInteger() { return Scratch.vm.runtime.pmRandom() < 0.5 ? -1 : 1 }

    setSpriteEffect(args, util) {
      let target = args.SPRITE;
      target = target === "_myself_" ? util.target : target === "_stage_" ? runtime.getTargetForStage() : runtime.getSpriteTargetByName(target);
      if (!target) return;
      target.setEffect(args.EFFECT, Scratch.Cast.toNumber(args.VALUE));
    }

    shuffleArray(args) {
      let words = args.WORDS;
      try {
        words = JSON.parse(words);
      } catch { return "Invalid Array" }
      if (!Array.isArray(words)) return "Invalid Array";
      const sortFreq = (array, mostComm) => {
        const freqMap = {};
        array.forEach(i => { freqMap[i] = (freqMap[i] || 0) + 1 });
        return array.sort((a, b) => {
          if (mostComm) return freqMap[b] - freqMap[a] || array.indexOf(a) - array.indexOf(b);
          else return freqMap[a] - freqMap[b] || array.indexOf(a) - array.indexOf(b);
        });
      }
      switch (args.SHUFFLE_OPTION) {
        case "ascending": return JSON.stringify(words.sort((a, b) => a - b));
        case "descending": return JSON.stringify(words.sort((a, b) => b - a));
        case "descending by length": return JSON.stringify(words.sort((a, b) => b.length - a.length));
        case "ascending by length": return JSON.stringify(words.sort((a, b) => a.length - b.length));
        case "most common": return JSON.stringify(sortFreq(words, true));
        case "least common": return JSON.stringify(sortFreq(words, false));
        default:
          for (let i = words.length - 1; i > 0; i--) {
            const j = Math.floor(Scratch.vm.runtime.pmRandom() * (i + 1));
            [words[i], words[j]] = [words[j], words[i]];
          }
          return JSON.stringify(words);
      }
    }

    hexBrightness(args) {
      const brightness = Scratch.Cast.toNumber(args.CHANGE);
      let rgb = Scratch.Cast.toRgbColorList(args.COLOR).map((channel) => {
        return Math.min(255, channel + brightness);
      });
      return `#${(1 << 24 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16).slice(1)}`;
    }

    smooth(spd, lim, type, num) {
      type = type === "sin" ? "sin" : type === "cos" ? "cos" : "tan";
      const speed = Scratch.Cast.toNumber(spd) / 10;
      const limit = Scratch.Cast.toNumber(lim);
      return Math[type](num * speed) * limit || 0;
    }
    smoothing(args, util) { return this.smooth(args.SPEED, args.LIMIT, args.MATH, util.ioQuery("clock", "projectTimer")) }
    smoothing2(args) { return this.smooth(args.SPEED, args.LIMIT, args.MATH, Scratch.Cast.toNumber(args.NUM)) }

    refresh() { vm.extensionManager.refreshBlocks() }
    async request(args) {
      if (args.THING === "redraw") runtime.requestRedraw();
      else if (args.THING === "block refresh") vm.extensionManager.refreshBlocks();
      else if (args.THING === "project step") await this.ignoreError(() => runtime._step()); // Desktop fork (section 146)
      else runtime.requestToolboxExtensionsUpdate();
    }
    async stepInter() { await this.ignoreError(() => runtime.frameLoop.stepCallback()) } // Desktop fork (section 146)
    // Desktop fork (section 146): the extra engine step runs right after the step this block runs in (a microtask:
    // an engine step is one synchronous call). Run inside it, it re-entered the running script ("Generator is
    // already running" compiled, a stack overflow interpreted), and the step's result was passed instead of a
    // function. The block's script waits for the extra step and goes on in the next frame; its errors are ignored.
    ignoreError(call) {
      return new Promise((resolve) => {
        queueMicrotask(() => {
          try { call(); } catch {}
          resolve();
        });
      });
    }

    costumeInfo(args, util) {
      let target = args.SPRITE;
      target = target === "_myself_" ? util.target : target === "_stage_" ? runtime.getTargetForStage() : runtime.getSpriteTargetByName(target);
      if (!target) return "";
      const targetInfo = target.getCostumes();
      if (args.OVERRIDE !== undefined) return target.sprite.costumes.length;
      let index = Math.round(Math.abs(Scratch.Cast.toString(args.NUM))) - 1;
      if (!index || Scratch.Cast.toString(index).includes("Infinity")) index = 0;
      if (index > target.sprite.costumes.length - 1) index = target.sprite.costumes.length - 1;
      const costume = targetInfo[index];
      switch (args.INFO) {
        case "name": return costume.name;
        case "width": return costume.size[0];
        case "height": return costume.size[1];
        case "type": return packageTest("costume format") ? "unknown" : costume.dataFormat;
        case "rotation center x": return costume.rotationCenterX;
        case "rotation center y": return costume.rotationCenterY;
        case "content": return packageTest("costume content") ? "" : costume.asset.decodeText();
        case "data.uri": return packageTest("costume content") ? "" : costume.asset.encodeDataURI();
        default: return "";
      }
    }

    getText(args, util) {
      const target = args.SPRITE === "_myself_" ? util.target : runtime.getSpriteTargetByName(args.SPRITE);
      if (!target || !target._customState["Scratch.looks"]) return "";
      return target._customState["Scratch.looks"].text;
    }

    cloudCode(args) {
      const txt = Scratch.Cast.toString(args.TEXT);
      return args.CODE === "encode" ? this.encodeText(txt) : this.decodeText(txt);
    }
    encodeText(txt) { return txt.split("").map(char => char.charCodeAt(0)).map(value => value.toString().padStart(3, "0")).join("") }
    decodeText(txt) {
      const decodedString = [];
      for (let i = 0; i < txt.length; i += 3) {
        const charCode = parseInt(txt.slice(i, i + 3), 10);
        decodedString.push(String.fromCharCode(charCode));
      }
      return decodedString.join("");
    }

    setTargetCostume(args, util) {
      if (args.SPRITE === "_stage_") runtime.ext_scratch3_looks._setBackdrop(runtime.getTargetForStage(), args.NUM);
      else {
        const target = args.SPRITE === "_myself_" ? util.target : runtime.getSpriteTargetByName(args.SPRITE);
        if (target) runtime.ext_scratch3_looks._setCostume(target, args.NUM);
      }
    }

    removeThorns(args) { return args.SVG.replaceAll("linejoin=\"miter\"", "linejoin=\"round\"") }

    penLayer() {
      const penID = runtime.ext_pen?._penDrawableId;
      if (!penID) return "";
      const imageData = runtime.renderer.extractDrawableScreenSpace(penID).imageData;
      var canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      canvas.getContext("2d").putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    }

    broadcastRun(args, util) {
      if (!util.stackFrame.broadcastVar) util.stackFrame.broadcastVar = runtime.getTargetForStage().lookupBroadcastByInputValue(args.MSG)
      if (util.stackFrame.broadcastVar) {
        const opt = util.stackFrame.broadcastVar.name;
        if (!util.stackFrame.startedThreads) {
          util.stackFrame.startedThreads = util.startHats("event_whenbroadcastreceived", { BROADCAST_OPTION: opt });
          if (util.stackFrame.startedThreads.length === 0) return;
        }
        const waiting = util.stackFrame.startedThreads.some(thread => runtime.threads.indexOf(thread) !== -1);
        if (waiting) {
          if (util.stackFrame.startedThreads.every(thread => runtime.isWaitingThread(thread))) util.yieldTick();
          else util.startBranch(1, true);
        }
      }
    }

    genShape(args) {
      const width = Scratch.Cast.toString(args.WIDTH); const height = Scratch.Cast.toString(args.HEIGHT);
      const x = Scratch.Cast.toString(args.X); const y = Scratch.Cast.toString(args.Y) * -1;
      const curNoise =
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(${x},${y})"> 
            <polygon points="${args.POINTS.replace(/[^0-9, ]/g, "")}" fill="${args.COLOR}"
            stroke="${args.COLOR}" stroke-width="${args.LINE}" stroke-linejoin="round" />
          </g>
        </svg>`;
      if (args.TYPE === "encoded svg") return `data:image/svg+xml;base64,${btoa(curNoise)}`;
      if (args.TYPE === "png") {
        const img = new Image();
        img.src = `data:image/svg+xml;base64,${btoa(curNoise)}`;
        return new Promise((resolve) => {
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width; canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL());
          };
        });
      }
      return curNoise.trim();
    }

    unboundSound(args, util) {
      let target = args.SPRITE;
      target = target === "_myself_" ? util.target : target === "_stage_" ? runtime.getTargetForStage() : runtime.getSpriteTargetByName(target);
      if (!target) return;
      if (args.EFFECT === "volume") return this._updateVolume(Scratch.Cast.toNumber(args.VALUE), target);
      else return this._updateEffect(args, target);
    }
    _updateEffect(args, target) {
      const effect = args.EFFECT.toLowerCase();
      const soundState = runtime.ext_scratch3_sound._getSoundState(target);
      if (!Object.prototype.hasOwnProperty.call(soundState.effects, effect)) return;
      soundState.effects[effect] = args.VALUE;
      runtime.ext_scratch3_sound._syncEffectsForTarget(target);
      if (runtime.runtimeOptions.miscLimits) return Promise.resolve();
      runtime.requestRedraw();
    }
    _updateVolume(volume, target) {
      target.volume = volume;
      runtime.ext_scratch3_sound._syncEffectsForTarget(target);
      if (runtime.runtimeOptions.miscLimits) return Promise.resolve();
      runtime.requestRedraw();
    }

    /* Deprecation Marker */
    // Found in More Operators
    typeString(r){return"||"===r.TYPE?r.STRING1||r.STRING2:"undefined"===r.STRING1||"null"===r.STRING1?r.STRING2:r.STRING1}
    // Found in Extra Control
    /* Marker End */
  }

  Scratch.extensions.register(new Sharktilities());
})(Scratch);
});
