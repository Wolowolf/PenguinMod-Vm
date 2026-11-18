/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the SharkPool gallery's Extra-Controls.js, moved into
// the VM as a built-in extension. The code is the gallery file, changed only where marked "Desktop fork (section 121)"
// (docs/EXTENSION-ROADMAP.md step 5c): engine hooks instead of replacing window.Error, console.error,
// _restartThread, visualReport, Blocks.prototype.getNextBlock / getBranch and the compiler classes.
// Section 123 (step 5d): "data" is dragged as a copy through the block's canDragDuplicate instead of replacing
// ScratchBlocks.scratchBlocksUtils.isShadowArgumentReporter; marked "Desktop fork (section 123)".
// Section 131: thread arguments ("data") kept on the thread, "run [forward]" works interpreted; marked "Desktop fork (section 131)".
// Section 152: the branch IDs of "if" / "else" readable by the compiler's inline code; marked "Desktop fork (section 152)".
// Section 259: the blocks that duplicate built-in ones are removed (run flag and continue, wait or until, repeat for secs,
// run next cycle, break out loop, try / catch, get from clone, on call / call to run), with their compiled code and error watcher.
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
// Desktop fork (section 156): its timers and animation frames that change what blocks do go through
// Scratch.vm.runtime.pmSetTimeout / pmClearTimeout / pmSetInterval / pmClearInterval / pmRequestAnimationFrame /
// pmCancelAnimationFrame (marked by the name).
// Desktop fork (section 285): "simultaneously run" has a modular version (shared maker, `modular` with `branches`):
// + adds branches; all start at the same time like the single's two, and the block waits until all have finished.
const ExpandableBlocks = require('../../util/expandable-blocks');
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Extra Controls
// ID: SPadvControl
// Description: New Advanced Control Blocks
// By: SharkPool
// License: MIT

// Version V.1.7.05

(function (Scratch) {
  "use strict";
  if (!Scratch.extensions.unsandboxed) throw new Error("Extra Controls must run unsandboxed");

  const menuIconURI =
"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2OS41NjUiIGhlaWdodD0iNjkuNTY1IiB2aWV3Qm94PSIwIDAgNjkuNTY1IDY5LjU2NSI+PGcgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMiAzNC43ODNDMiAxNi42NzggMTYuNjc4IDIgMzQuNzgzIDJzMzIuNzgzIDE0LjY3OCAzMi43ODMgMzIuNzgzLTE0LjY3OCAzMi43ODMtMzIuNzgzIDMyLjc4M1MyIDUyLjg4OCAyIDM0Ljc4M3oiIGZpbGw9IiNmZmFiMTkiIHN0cm9rZT0iI2NmOGIxNyIgc3Ryb2tlLXdpZHRoPSI0Ii8+PHBhdGggZD0iTTU0Ljk1IDM0Ljc4M0gxNC42MTZNNTQuOTUgMjIuMTc5SDE0LjYxNk01NC45NSA0Ny4zODdIMTQuNjE2IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTE4LjYxNiAzNC45NWE2LjE2NyA2LjE2NyAwIDEgMSAxMi4zMzQgMCA2LjE2NyA2LjE2NyAwIDAgMS0xMi4zMzQgMHptMjAtMTIuNjY3YTYuMTY3IDYuMTY3IDAgMSAxIDEyLjMzNCAwIDYuMTY3IDYuMTY3IDAgMCAxLTEyLjMzNCAwek0zNS40NSA0Ny40NWE2LjE2NyA2LjE2NyAwIDEgMSAxMi4zMzMgMCA2LjE2NyA2LjE2NyAwIDAgMS0xMi4zMzMgMHoiIGZpbGw9IiNmZmYiIHN0cm9rZT0iI2ZmYWIxOSIgc3Ryb2tlLXdpZHRoPSI1Ii8+PHBhdGggZD0iTTE4LjYxNiAzNC45NWE2LjE2NyA2LjE2NyAwIDEgMSAxMi4zMzQgMCA2LjE2NyA2LjE2NyAwIDAgMS0xMi4zMzQgMG0yMC0xMi42NjdhNi4xNjcgNi4xNjcgMCAxIDEgMTIuMzM0IDAgNi4xNjcgNi4xNjcgMCAwIDEtMTIuMzM0IDBNMzUuNDUgNDcuNDVhNi4xNjcgNi4xNjcgMCAxIDEgMTIuMzMzIDAgNi4xNjcgNi4xNjcgMCAwIDEtMTIuMzMzIDAiIGZpbGw9IiNmZmYiLz48L2c+PC9zdmc+";

  const getIconURI = (name) => {
    const start = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIH";
    return start + {
      "new": "dpZHRoPSIyMS4zMzMiIGhlaWdodD0iMjEuMzMzIiB2aWV3Qm94PSIwIDAgMjEuMzMzIDIxLjMzMyI+PGcgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMTUuMDE1IDcuMjU4aC0yLjEwN2wtLjI4IDIuMTc0LTMuOTc0LjAwNi0uMjc1LTIuMThINi4zMjFjLS41ODYgMC0uODY5LS43MzMtLjQ2NC0xLjE1N2w0LjM0NS00LjU3NmEuNjQzLjY0MyAwIDAgMSAuOTE4IDBsNC4zNiA0LjU3NmMuNDA0LjQyNC4xMSAxLjE1Ny0uNDY1IDEuMTU3bTAgNi44MThjLjU3NSAwIC44NjkuNzMzLjQ2NSAxLjE1N2wtNC4zNiA0LjU3NmEuNjQzLjY0MyAwIDAgMS0uOTE4IDBsLTQuMzQ1LTQuNTc2Yy0uNDA1LS40MjQtLjEyMi0xLjE1Ny40NjQtMS4xNTdoMi4wNThsLjI1My0yLjE0OSAzLjk4LjAyNC4yOTYgMi4xMjVoMi4xMDciIGZpbGw9Im5vbmUiIHN0cm9rZS1vcGFjaXR5PSIuMiIgc3Ryb2tlPSIjMDAwIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxwYXRoIGQ9Ik0xNS4wMTUgNy4yNThoLTIuMTA3bC0uOTA1IDYuODM4Yy0uMDk4Ljc4NC0uNzk2IDEuMzM3LTEuNTU1IDEuMjIxLS42MTItLjA5LTEuMDktLjYwNC0xLjE2NC0xLjIybC0uOTA1LTYuODM5SDYuMzIxYy0uNTg2IDAtLjg2OS0uNzMzLS40NjQtMS4xNTdsNC4zNDUtNC41NzZhLjY0My42NDMgMCAwIDEgLjkxOCAwbDQuMzYgNC41NzZjLjQwNC40MjQuMTEgMS4xNTctLjQ2NSAxLjE1NyIgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PHBhdGggZD0iTTE1LjAxNSAxNC4wNzZjLjU3NSAwIC44NjkuNzMzLjQ2NSAxLjE1N2wtNC4zNiA0LjU3NmEuNjQzLjY0MyAwIDAgMS0uOTE4IDBsLTQuMzQ1LTQuNTc2Yy0uNDA1LS40MjQtLjEyMi0xLjE1Ny40NjQtMS4xNTdoMi4wNThsLjkwNS02LjgzOGMuMDc1LS42MTcuNTUyLTEuMTMxIDEuMTY0LTEuMjIxLjc2LS4xMTYgMS40NTcuNDM3IDEuNTU1IDEuMjJsLjkwNSA2LjgzOXoiIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIvPjxwYXRoIGQ9Ik0wIDIxLjMzNFYwaDIxLjMzNHYyMS4zMzR6IiBmaWxsPSJub25lIi8+PC9nPjwvc3ZnPg==",
      "time": "dpZHRoPSIxOC40MSIgaGVpZ2h0PSIxOC40MSIgdmlld0JveD0iMCAwIDE4LjQxIDE4LjQxIj48ZyBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiPjxwYXRoIGQ9Ik0yLjEyOCA5Ljg3OWE3LjA3IDcuMDcgMCAwIDEgMy4zNDYtNi4wMTV2LS42NzhjMC0uOTU3Ljc3Ni0xLjczMiAxLjczMi0xLjczMmgzLjk5OWMuOTU2IDAgMS43MzIuNzc1IDEuNzMyIDEuNzMydi42NzhBNy4wNzcgNy4wNzcgMCAxIDEgMi4xMjkgOS44Nzl6bTguNzAzLTIuNzhjLjIyMyAwIC4zMzctLjI4NC4xOC0uNDQ4TDkuMzE5IDQuODc0YS4yNS4yNSAwIDAgMC0uMzU3IDBMNy4yNzYgNi42NTFjLS4xNTguMTY0LS4wNDguNDQ5LjE4LjQ0OWguNzk5bC4zNDQgMi42YS44NzQuODc0IDAgMCAwIC41NjMgMS41N2wxLjg5NiAxLjctMS4wMzguNzIyYy0uMTYxLjE2MS0uMDM4LjQ0LjE5LjQ0NWwyLjQ0OS4wNjNhLjI1LjI1IDAgMCAwIC4yNTItLjI1MmwtLjA2LTIuNDUyYy0uMDA1LS4yMjgtLjI4Ny0uMzQ4LS40NDUtLjE5bC0uNTc4LjU3OC0xLjgzLTEuNDAyYS44Ny44NyAwIDAgMC0uMzMxLS43NzVsLS4wMjMtMi44MTh6IiBmaWxsPSJub25lIiBzdHJva2Utb3BhY2l0eT0iLjIiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIxLjc1Ii8+PHBhdGggZD0iTTAgMTguNDFWMGgxOC40MXYxOC40MXoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMi4xMjggOS44NzlhNy4wNyA3LjA3IDAgMCAxIDMuMzQ2LTYuMDE1di0uNjc4YzAtLjk1Ny43NzYtMS43MzIgMS43MzItMS43MzJoMy45OTljLjk1NiAwIDEuNzMyLjc3NSAxLjczMiAxLjczMnYuNjc4QTcuMDc3IDcuMDc3IDAgMSAxIDIuMTI5IDkuODc5em04LjcwMy0yLjc4Yy4yMjMgMCAuMzM3LS4yODQuMTgtLjQ0OEw5LjMxOSA0Ljg3NGEuMjUuMjUgMCAwIDAtLjM1NyAwTDcuMjc2IDYuNjUxYy0uMTU4LjE2NC0uMDQ4LjQ0OS4xOC40NDloLjc5OWwuMzQ0IDIuNmEuODc0Ljg3NCAwIDAgMCAuNTYzIDEuNTdsMS40MjMgMS44NTctLjU2NS41NjVjLS4xNjEuMTYxLS4wMzguNDQuMTkuNDQ1bDIuNDQ5LjA2M2EuMjUuMjUgMCAwIDAgLjI1Mi0uMjUybC0uMDYtMi40NTJjLS4wMDUtLjIyOC0uMjg3LS4zNDgtLjQ0NS0uMTlsLS41NzguNTc4LTEuODMtMS40MDJhLjg3Ljg3IDAgMCAwLS4zMzEtLjc3NWwuMzQ2LTIuNjA3eiIgZmlsbD0iI2ZmZiIvPjwvZz48L3N2Zz4="
    }[name]
  };

  const { vm, Cast } = Scratch;
  const runtime = vm.runtime;
  const isPM = Scratch.extensions.isPenguinMod;

  let Thread; // defined by exports
  let conditionStorage = Object.create(null);
  let hats = { ...runtime._hats }, overrideCalls = {};

  const regenReporters = ["SPadvControl_threadArgs"];
  // Desktop fork (section 123): the block's canDragDuplicate makes the block library treat it like an argument reporter

  const resetStorage = () => {
    conditionStorage = Object.create(null);
  };
  runtime.on("PROJECT_STOP_ALL", resetStorage);
  runtime.on("PROJECT_START", resetStorage);

  // override needed for "get from sprite" blocks
  // Desktop fork (section 121): through runtime.pmVisualReportCaptureHooks instead of replacing visualReport
  runtime.pmVisualReportCaptureHooks.push((blockId, value) => {
    if (!overrideCalls[blockId]) return false;
    overrideCalls[blockId].pushReportedValue(value);
    delete overrideCalls[blockId];
    return true;
  });

  // thread patcher for special threads
  // Desktop fork (section 121): blocks missing in a container are looked up in the other sprites through
  // runtime.pmForeignBlockHooks instead of replacing Blocks.prototype.getNextBlock / getBranch
  runtime.pmForeignBlockHooks.push((blocks, id) => {
    for (const target of runtime.targets) {
      if (!target.isOriginal || target.blocks === blocks) continue;
      const targetBlock = target.blocks._blocks[id];
      if (targetBlock) return targetBlock;
    }
  });

  Thread = vm.exports.Thread;
  class SPadvControl {
    // Desktop fork (section 152): read by the inline code of "if" / "else" (src/compiler/jsexecute.js pmBranchInline)
    get pmConditionStorage() { return conditionStorage; }

    getInfo() {
      return {
        id: "SPadvControl",
        name: "Extra Controls",
        docsURI: "https://extensions.penguinmod.com/docs/Extra-Control",
        color1: "#FFAB19",
        color2: "#EC9C13",
        color3: "#CF8B17",
        menuIconURI,
        blocks: [
          {
            opcode: "waitChanged",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            branchCount: -1,
            text: "wait until [THING] changes",
            arguments: {
              THING: {}
            }
          },
          "---",
          {
            opcode: "repeatForUntil",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.LOOP,
            text: "repeat [NUM] or until [CON]",
            arguments: {
              NUM: { type: Scratch.ArgumentType.STRING, defaultValue: 10 },
              CON: { type: Scratch.ArgumentType.BOOLEAN }
            }
          },
          {
            opcode: "repeatSecUntil",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.LOOP,
            text: "repeat for [NUM] secs or until [CON]",
            arguments: {
              NUM: { type: Scratch.ArgumentType.STRING, defaultValue: 1 },
              CON: { type: Scratch.ArgumentType.BOOLEAN }
            }
          },
          {
            opcode: "spayedCondition",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.LOOP,
            text: ["if [CON1] start loop", "repeat until [CON2]"],
            arguments: {
              CON1: { type: Scratch.ArgumentType.BOOLEAN },
              CON2: { type: Scratch.ArgumentType.BOOLEAN }
            }
          },
          "---",
          {
            opcode: "loopInd",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.REPORTER,
            disableMonitor: true,
            text: "loop index"
          },
          {
            opcode: "loopTimer",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.REPORTER,
            disableMonitor: true,
            text: "timer in loop"
          },
          "---",
          { blockType: Scratch.BlockType.XML, xml: `<block type="SPadvControl_newThreadAdv"><value name="ARGS"><shadow type="text"><field name="TEXT">{ info: 1 }</field></shadow></value><value name="FRAME"><shadow type="SPadvControl_threadArgs"></shadow></value></block>` },
          {
            opcode: "newThreadAdv",
            blockType: Scratch.BlockType.CONDITIONAL,
            extensions: ["colours_control"],
            text: "new thread with [FRAME] [ARGS]",
            hideFromPalette: true, branchIconURI: getIconURI("new"),
            arguments: {
              ARGS: { type: Scratch.ArgumentType.STRING },
              FRAME: {}
            }
          },
          {
            opcode: "threadArgs", blockType: Scratch.BlockType.REPORTER, extensions: ["colours_control"],
            hideFromPalette: true, text: "data", allowDropAnywhere: true,
            canDragDuplicate: true, // Desktop fork (section 123)
          },
          {
            opcode: "simuRun",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: "simultaneously run",
            branchCount: 2
          },
          {
            // Desktop fork (section 285): any number of branches (−/+), waits until all have finished
            opcode: "simuRunModular",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            branchCount: 2,
            modular: { prefix: "SUBSTACK", branches: true, label: "simultaneously run and wait" }
          },
          "---",
          {
            opcode: "doThenWhile",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.LOOP,
            text: ["if [CON] then", "while running", "then"],
            branchCount: 3,
            arguments: {
              CON: { type: Scratch.ArgumentType.BOOLEAN }
            }
          },
          {
            opcode: "ifPart",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: ["if [CON]", "branch ID [ID]"],
            arguments: {
              CON: { type: Scratch.ArgumentType.BOOLEAN },
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "my-block1" }
            }
          },
          {
            opcode: "elsePart",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: ["else", "branch ID [ID]"],
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "my-block1" }
            }
          },
          {
            opcode: "ifElseVal",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.BOOLEAN,
            text: "is branch with ID [ID] true?",
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: "my-block1" }
            }
          },
          "---",
          {
            opcode: "runInSprite",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: ["as [SPRITE] do", "then [TYPE] to finish"],
            arguments: {
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "targets3" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "contType" },
            }
          },
          {
            opcode: "asClone",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: "as clones of [SPRITE] with [VAR] set to [VAL]",
            arguments: {
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "targets2" },
              VAR: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
              VAL: { type: Scratch.ArgumentType.STRING, defaultValue: "0" }
            }
          },
          {
            opcode: "asParent",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: "as clone parent"
          },
          {
            opcode: "getInSprite",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.REPORTER,
            text: "get [THING] from [SPRITE]",
            allowDropAnywhere: true,
            arguments: {
              SPRITE: { type: Scratch.ArgumentType.STRING, menu: "targets" },
              THING: {}
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Functions" },
          "---",
          { blockType: Scratch.BlockType.XML, xml: `<block type="SPadvControl_defineFunc"><value name="NAME"><shadow type="text"><field name="TEXT">my-function</field></shadow></value><value name="ARG"><shadow type="SPadvControl_threadArgs"></shadow></value><value name="SUBSTACK"><block type="SPadvControl_returnFunc"><value name="VALUE"><shadow type="text"><field name="TEXT">value</field></shadow></value></block></value></block>` },
          {
            opcode: "defineFunc",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.CONDITIONAL,
            text: "define thread func [NAME] [ARG]",
            hideFromPalette: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING },
              ARG: {}
            }
          },
          {
            opcode: "returnFunc",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.COMMAND,
            text: "return [VALUE]",
            isTerminal: true, hideFromPalette: true,
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING }
            }
          },
          {
            opcode: "callFunc",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.COMMAND,
            text: "run func [NAME] with data [ARG]",
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my-function" },
              ARG: { type: Scratch.ArgumentType.STRING, defaultValue: "{ data: 123 }" }
            }
          },
          {
            opcode: "reportFunc",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.REPORTER,
            text: "run func [NAME] with data [ARG]",
            allowDropAnywhere: true,
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my-function" },
              ARG: { type: Scratch.ArgumentType.STRING, defaultValue: "{ data: 123 }" }
            }
          },
          { blockType: Scratch.BlockType.LABEL, text: "Hat Control" },
          {
            opcode: "forceHat",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.COMMAND,
            text: "force hat [HAT] to [TYPE] on activate",
            arguments: {
              HAT: { type: Scratch.ArgumentType.STRING, menu: "HAT_MENU" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "ACTIVATE" }
            }
          },
          {
            opcode: "resetHats",
            extensions: ["colours_control"],
            blockType: Scratch.BlockType.COMMAND,
            text: "reset forced hats"
          },
        ],
        menus: {
          ACTIVATE: ["finish", "restart"],
          targets: { acceptReporters: true, items: this.getTargets(false, false) },
          targets2: { acceptReporters: true, items: this.getTargets(true, false) },
          targets3: { acceptReporters: true, items: this.getTargets(false, true) },
          HAT_MENU: { acceptReporters: false /* Desktop fork (section 265): only its own items work */, items: "organizeHats" },
          contType: { acceptReporters: false /* Desktop fork (section 265): only its own items work */, items: ["wait", "dont wait"] }
        },
      };
    }

    // Helper Functions
    getTargets(myself, all) {
      const spriteNames = [];
      if (myself) spriteNames.push({ text: "myself", value: "_myself_" });
      else spriteNames.push({ text: "Stage", value: "_stage_" });
      if (all) {
        spriteNames.push(
          { text: "All Sprites", value: "_all_" }, { text: "All Main Sprites", value: "_all_2" }, { text: "All Clones", value: "_all_3" }
        );
      }  
      return runtime.getSpriteMenu(spriteNames);
    }

    organizeHats() {
      const allHats = runtime._hats;
      const vanillaHats = [
        {text: "when I start as clone", value: "control_start_as_clone"},
        {text: "when green flag clicked", value: "event_whenflagclicked"},
        {text: "when key pressed", value: "event_whenkeypressed"},
        {text: "when sprite clicked", value: "event_whenthisspriteclicked"},
        {text: "when stage clicked", value: "event_whenstageclicked"},
        {text: "when backdrop switches", value: "event_whenbackdropswitchesto"},
        {text: "when touching object", value: "event_whentouchingobject"},
        {text: "when value greater than", value: "event_whengreaterthan"},
        {text: "when broadcast received", value: "event_whenbroadcastreceived"}
      ];
      // Desktop fork (section 265): every other hat, also the built-in ones registered before "when broadcast received"
      const filteredHats = Object.keys(allHats).filter(k => !vanillaHats.some(h => h.value === k)).map(k => ({ text: k, value: k }));
      return [...vanillaHats, ...filteredHats];
    }

    addMissKeys(sourceObj, checkedObj) {
      Object.keys(sourceObj).forEach(key => {
        if (!(key in checkedObj)) checkedObj[key] = sourceObj[key];
      });
      Object.keys(sourceObj.stackFrames[0]).forEach(key => {
        if (!(key in checkedObj.stackFrames[0])) checkedObj.stackFrames[0][key] = sourceObj.stackFrames[0][key];
      });
      return checkedObj;
    }

    pushThreadTarget(id, newT, oldT, stack) {
      const thread = runtime._pushThread(id, oldT, { stackClick: stack });
      thread.target = newT; thread.ogTarget = oldT;
      if (runtime.compilerOptions.enabled) thread.tryCompile();
      return thread;
    }

    pushThread(id, util, opts) {
      const ogTarget = util.thread.ogTarget;
      const target = ogTarget ? ogTarget : util.target;
      const thread = runtime._pushThread(id, target, opts);
      if (ogTarget) {
        thread.target = util.target;
        thread.ogTarget = target;
      }
      if (runtime.compilerOptions.enabled) thread.tryCompile();
      return thread;
    }

    genFakeCode(block, util, newTarget) {
      if (!Thread) return "Extra Controls could not access Exports!";
      if (!block) return "";
      return new Promise((resolve) => {
        const thread = util.thread;
        const tempThread = new Thread(block.id);
        tempThread.pushStack(block.id);
        overrideCalls[block.id] = tempThread;
        tempThread.stackClick = true;
        tempThread.blockContainer = thread.blockContainer;
        tempThread.target = newTarget;
        tempThread.ogTarget = util.ogTarget ?? util.target;
        tempThread.pushReportedValue = (value) => resolve(value);
        runtime.threads.push(tempThread);
        if (!tempThread.stackClick && !tempThread.updateMonitor) runtime.threadMap.set(tempThread.getId(), tempThread);
        runtime._pmThreadMapChanged = true; // Desktop fork (section 255)
        if (runtime.compilerOptions.enabled) tempThread.tryCompile();
      });
    }

    getThisBlock(util, branch, optBranch) {
      if (branch) return util.thread.blockContainer.getBranch(util.thread.peekStack(), optBranch ? optBranch : 1);
      else return util.thread.blockContainer.getBlock(util.thread.isCompiled ? util.thread.peekStack() : util.thread.peekStackFrame().op.id);
    }

    // Block Functions

    waitChanged(args, util) {
      const input = Cast.toString(args.THING);
      if (util.stackFrame.SPwaitChange === undefined) util.stackFrame.SPwaitChange = input;
      if (Cast.compare(util.stackFrame.SPwaitChange, input) === 0) util.startBranch(1, true);
    }

    repeatForUntil(args, util) {
      if (typeof util.stackFrame.loopCounter === "undefined") util.stackFrame.loopCounter = Math.round(Cast.toNumber(args.NUM));
      util.stackFrame.loopCounter--;
      if (!Cast.toBoolean(args.CON) && util.stackFrame.loopCounter >= 0) util.startBranch(1, true);
    }

    repeatSecUntil(args, util) {
      const con = Cast.toBoolean(args.CON);
      if (con) return; // Dont run once
      if (util.stackTimerNeedsInit()) {
        util.startStackTimer(Math.max(0, 1000 * Cast.toNumber(args.NUM)));
        runtime.requestRedraw();
        util.startBranch(1, true);
      } else if (!util.stackTimerFinished() && !con) {
        util.startBranch(1, true)
      }
    }

    spayedCondition(args, util) {
      if (typeof util.stackFrame.index === "undefined") util.stackFrame.index = true;
      if (!Cast.toBoolean(args.CON1) && util.stackFrame.index) return;
      else {
        if (!Cast.toBoolean(args.CON2)) {
          util.stackFrame.index = false;
          util.startBranch(1, true);
        } else {
          util.stackFrame.index = true;
          return;
        }
      }
    }

    loopInd(_, util) {
      const ID = this.getThisBlock(util)?.id;
      if (typeof util.thread.SPloopReader === "undefined") util.thread.SPloopReader = {};
      if (util.thread.SPloopReader[ID] === undefined) util.thread.SPloopReader[ID] = 0;
      util.thread.SPloopReader[ID]++;
      return util.thread.SPloopReader[ID];
    }

    loopTimer(_, util) {
      const ID = this.getThisBlock(util)?.id;
      if (typeof util.thread.SPloopReader === "undefined") util.thread.SPloopReader = {};
      if (util.thread.SPloopReader[ID] === undefined) util.thread.SPloopReader[ID] = util.sequencer.timer.startTime;
      return (Scratch.vm.runtime.pmDateNow() - util.thread.SPloopReader[ID]) / 1000;
    }

    // Desktop fork (section 131): the thread arguments are kept on the thread, not on its first stack frame: the engine
    // reuses stack frame objects, so a frame could still hold the arguments of an earlier, unrelated thread
    threadArgs(_, util) { return util.thread.SPadvCtrl ?? "" }
    newThreadAdv(args, util) {
      const branch = this.getThisBlock(util, true, 1);
      if (branch) {
        const thread = this.pushThread(branch, util, { stackClick: false });
        this.addMissKeys(util.thread, thread);
        thread.SPadvCtrl = args.ARGS; // Desktop fork (section 131)
      }
    }

    // Desktop fork (section 131): not async, so "forward" starts its branch at once; an async function answered a
    // promise, and interpreted scripts then never ran the branch (every other type answers its own promise)


    simuRun(_, util) {
      const branches = [this.getThisBlock(util, true, 1), this.getThisBlock(util, true, 2)];
      if (branches[0] && branches[1]) {
        const { target, thread } = util;
        const thread1 = this.pushThread(branches[0], util, { stackClick: false });
        thread1.status = 5;
        this.addMissKeys(thread, thread1);
        const thread2 = this.pushThread(branches[1], util, { stackClick: false });
        this.addMissKeys(thread, thread2);
        thread1.status = 0;
      }
    }

    // Desktop fork (section 285): the modular block starts its branches as simuRun does (each a new thread with the
    // script's keys, the earlier ones paused until the last is pushed), skipping empty branches, and waits until
    // none of them runs any more (checked once per frame, like "broadcast and wait").
    simuRunModular(args, util) {
      if (util.stackFrame.SPsimuThreads === undefined) {
        const count = ExpandableBlocks.readCount(args.mutation);
        const threads = [];
        for (let i = 1; i <= count; i++) {
          const branch = this.getThisBlock(util, true, i);
          if (!branch) continue;
          const newThread = this.pushThread(branch, util, { stackClick: false });
          newThread.status = 5;
          this.addMissKeys(util.thread, newThread);
          threads.push(newThread);
        }
        threads.forEach(newThread => { newThread.status = 0; });
        util.stackFrame.SPsimuThreads = threads;
      }
      if (util.stackFrame.SPsimuThreads.some(newThread => runtime.isActiveThread(newThread))) util.yieldTick();
    }

    doThenWhile(args, util) {
      if (util.stackFrame.whileThread === undefined) {
        if (Cast.toBoolean(args.CON)) {
          const branch = this.getThisBlock(util, true, 0);
          if (branch) {
            let thread = this.pushThread(branch, util, { stackClick: false });
            this.addMissKeys(util.thread, thread);
            util.stackFrame.whileThread = thread;
            util.startBranch(2, true);
          }
        }
      } else {
        if (runtime.isActiveThread(util.stackFrame.whileThread)) util.startBranch(2, true);
        else util.startBranch(3, false);
      }
    }

    ifPart(args, util) {
      const con = Cast.toBoolean(args.CON);
      conditionStorage[Cast.toString(args.ID)] = con;
      if (con) util.startBranch(1, false);
    }
    elsePart(args, util) {
      const ID = Cast.toString(args.ID);
      if (conditionStorage[ID] !== undefined && conditionStorage[ID] === false) util.startBranch(1, false);
    }
    ifElseVal(args) {
      return Cast.toBoolean(conditionStorage[Cast.toString(args.ID)]);
    }

    // Desktop fork (section 231): waits by yielding once per tick (its state in util.stackFrame, as "broadcast and
    // wait" does) instead of awaiting a promise. After an awaited promise neither the interpreter nor the compiler
    // looks at a branch started by the block, so the catch branch never ran. Yielding a tick (not util.yield) also
    // lets the try branch run inside "run without screen refresh" with the warp timer off.

    async runInSprite(args, util) {
      const thisSprite = util.thread.ogTarget !== undefined ? util.thread.ogTarget : util.target;
      const branch = util.thread.ogTarget !== undefined ? util.thread.ogTarget.blocks.getBranch(util.thread.peekStack(), 1) :
        this.getThisBlock(util, true, 1);
      const name = Cast.toString(args.SPRITE);
      let newTarget = runtime.getTargetFromMenu(name, null, true);
      let targets = runtime.targets, thread;
      if (!branch) return;
      if (name.startsWith("_all_")) {
        if (name.includes("2")) targets = targets.filter(target => target.isOriginal); // Main Sprites
        if (name.includes("3")) targets = targets.filter(target => !target.isOriginal); // Clones
        newTarget = targets[0];
      }
      if (newTarget) {
        thread = this.pushThreadTarget(branch, newTarget, thisSprite, false);
        this.addMissKeys(util.thread, thread);
      }
      if (name.startsWith("_all_")) for (let i = 0; i < targets.length; i++)
        this.addMissKeys(util.thread, this.pushThreadTarget(branch, targets[i], thisSprite, false));
      // Branch is the same, no need to wait for all threads to finish when they are the same
      if (args.TYPE === "wait" && thread) {
        await new Promise(resolve => {
          const interval = runtime.pmSetInterval(() => {
            if (!runtime.isActiveThread(thread)) {
              runtime.pmClearInterval(interval);
              resolve();
            }
          }, 1);
        });
      }
    }

    asClone(args, util) {
      const thisSprite = util.thread.ogTarget !== undefined ? util.thread.ogTarget : util.target;
      const target = runtime.getTargetFromMenu(args.SPRITE, thisSprite);
      if (!target) return;
      const clones = target.sprite.clones;
      const branch = this.getThisBlock(util, true, 1);
      if (branch) {
        const pushThread = (clone) => {
          let thread;
          if (args.SPRITE === "_myself_") thread = runtime._pushThread(branch, clone);
          else thread = this.pushThreadTarget(branch, clone, thisSprite, false);
          this.addMissKeys(util.thread, thread);
        };
        const varName = Cast.toString(args.VAR);
        if (!varName) for (var i = 1; i < clones.length; i++) pushThread(clones[i]);
        else {
          for (var i = 1; i < clones.length; i++) {
            const variable = clones[i].lookupVariableByNameAndType(varName, "", true);
            if (variable && Cast.toString(variable.value) === Cast.toString(args.VAL)) pushThread(clones[i]);
          }
        }
      }
    }

    async getInSprite(args, util) {
      const block = this.getThisBlock(util, false);
      const newTarget = runtime.getTargetFromMenu(args.SPRITE, null, true);
      if (!newTarget || !block?.inputs.THING) return "";
      const thing = util.thread.blockContainer.getBlock(block.inputs.THING.block);
      return await this.genFakeCode(thing, util, newTarget) ?? "";
    }

    asParent(args, util) {
      const target = util.target;
      if (target.isOriginal) return;
      const branch = this.getThisBlock(util, true, 1);
      if (branch) this.addMissKeys(util.thread, this.pushThread(branch, { ...util, target: target.sprite.clones[0] }, { stackClick: false }));
    }


    defineFunc(args, util) {
      util.thread[`SPfunction-${args.NAME}`] = this.getThisBlock(util, true, 1);
    }

    returnFunc(args, util) {
      util.thread.justReported = args.VALUE;
      //Delay the Deletion of this Thread
      if (util.stackTimerNeedsInit()) {
        util.startStackTimer(0);
        runtime.requestRedraw();
        util.yield();
      } else if (!util.stackTimerFinished()) util.yield();
      util.thread.stopThisScript();
    }

    callFunc(args, util) {
      if (util.stackFrame.SPran) {
        if (runtime.isActiveThread(util.stackFrame.SPran)) util.yield();
      } else {
        const func = util.thread[`SPfunction-${args.NAME}`];
        if (func !== undefined) {
          const thread = this.pushThread(func, util, { stackClick: false });
          this.addMissKeys(util.thread, thread);
          thread.SPadvCtrl = args.ARG; // Desktop fork (section 131)
          util.stackFrame.SPran = thread;
          util.yield();
        }
      }
    }
    reportFunc(args, util) {
      if (util.stackFrame.SPran) {
        if (runtime.isActiveThread(util.stackFrame.SPran)) util.yield();
        else return util.stackFrame.SPran.justReported ?? "";
      } else {
        const func = util.thread[`SPfunction-${args.NAME}`];
        if (func === undefined) return "";
        else {
          const thread = this.pushThread(func, util, { stackClick: false });
          this.addMissKeys(util.thread, thread);
          thread.SPadvCtrl = args.ARG; // Desktop fork (section 131)
          util.stackFrame.SPran = thread;
          util.yield();
        }
      }
    }

    forceHat(args) {
      const thisHat = runtime._hats[args.HAT];
      if (thisHat) thisHat.restartExistingThreads = args.TYPE === "restart";
    }

    resetHats(args) {
      const currentHats = runtime._hats;
      for (const key in hats) currentHats[key].restartExistingThreads = hats[key].restartExistingThreads;
      hats = { ...runtime._hats };
    }




  }

  Scratch.extensions.register(new SPadvControl());
})(Scratch);
});
