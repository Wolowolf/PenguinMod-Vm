/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the SharkPool gallery's Temporary-Variables.js, moved into
// the VM as a built-in extension. The code is the gallery file, changed only where marked "Desktop fork (section 121)":
// its compiler code is registered with runtime.registerCompiledExtensionBlocks (docs/EXTENSION-ROADMAP.md step 5c).
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Temporary Variables
// ID: SPtempVars
// Description: Create temporary variables for sprites, threads, and the project.
// By: SharkPool
// Licence: MIT

// Version V.1.0.1

(function (Scratch) {
  "use strict";
  if (!Scratch.extensions.unsandboxed) throw new Error("Temporary Variables must run unsandboxed!");

  const menuIconURI =
"data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwLDAsMTI4LDEyOCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE3NiwtMTE2KSI+PGcgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIj48cGF0aCBkPSJNMTc2LDE4MGMwLC0zNS4zNDYyMiAyOC42NTM3OCwtNjQgNjQsLTY0YzM1LjM0NjIyLDAgNjQsMjguNjUzNzggNjQsNjRjMCwzNS4zNDYyMiAtMjguNjUzNzgsNjQgLTY0LDY0Yy0zNS4zNDYyMiwwIC02NCwtMjguNjUzNzggLTY0LC02NHoiIGZpbGw9IiNkYjZlMDAiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSJOYU4iIHN0cm9rZS1saW5lY2FwPSJidXR0IiBzdHJva2UtbGluZWpvaW49Im1pdGVyIi8+PHBhdGggZD0iTTE4NC4yMzgxLDE4MGMwLC0zMC43OTY0NSAyNC45NjU0NiwtNTUuNzYxOSA1NS43NjE5LC01NS43NjE5YzMwLjc5NjQ1LDAgNTUuNzYxOSwyNC45NjU0NiA1NS43NjE5LDU1Ljc2MTljMCwzMC43OTY0NSAtMjQuOTY1NDYsNTUuNzYxOSAtNTUuNzYxOSw1NS43NjE5Yy0zMC43OTY0NSwwIC01NS43NjE5LC0yNC45NjU0NiAtNTUuNzYxOSwtNTUuNzYxOXoiIGZpbGw9IiNmZjhjMWEiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIwIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0yMDEuNjQ3NzEsMTgzLjYxMjcyYy0wLjA2NzM3LC0xMi40MzA3NSA2LjMwNDMxLC0yNC4wMTA2OCAxNi44NDA5LC0zMC42MDY3NWwtMC4wMTg1NywtMy40NDExMmMtMC4wMTE0NSwtMi4zMzE2OSAwLjkwNDExLC00LjU3MjQgMi41NDUxMywtNi4yMjg5MmMxLjY0MTAyLC0xLjY1NjUxIDMuODczLC0yLjU5MzA2IDYuMjA0NzEsLTIuNjAzNTJsMjAuMjk2MjIsLTAuMDkyNWMyLjMzMTY5LC0wLjAxMTQ1IDQuNTcyNCwwLjkwNDA5IDYuMjI4OTIsMi41NDUxYzEuNjU2NTEsMS42NDEwMiAyLjU5MzA2LDMuODczMDIgMi42MDM1Miw2LjIwNDczbDAuMDE1MTMsMy40NDEzN2MyLjgzNTY2LDEuNzQxMjcgNS4zNTUxMywzLjgyMzgyIDcuNTMwOTksNi4xNjY5bDIuNjE1NzUsLTEuNjc5MTJjMi4zNDE0OCwtMS41MDMwNiA1LjQ1ODExLC0wLjgyMzM5IDYuOTYxMTcsMS41MTgxbDQuMDgyMyw2LjM1OTQ1YzEuNTAzMDYsMi4zNDE0OCAwLjgyMzM5LDUuNDU4MTEgLTEuNTE4MSw2Ljk2MTE3bC0zLjY3NDc3LDIuMzU4OTNjMS43OTk1MSw3LjAwOTIxIDEuNDk1ODQsMTQuNTkzIC0xLjI0NzM0LDIxLjc2MDY1Yy02LjE3ODgxLDE2LjE0NDU4IC0yMi45ODEzOSwyNS41OTc3MSAtMzkuOTg3NTcsMjIuNDk3MDdjLTE3LjAwNjE4LC0zLjEwMDY0IC0yOS4zOTE0MiwtMTcuODc1NDUgLTI5LjQ3NDk0LC0zNS4xNjE4MXoiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIxIiBzdHJva2UtbGluZWNhcD0iYnV0dCIgc3Ryb2tlLWxpbmVqb2luPSJtaXRlciIvPjxwYXRoIGQ9Ik0yMjMuMjQ5MzYsMTk3LjM2Nzk1aDAuMzA2YzIuMjI5ODYsMCA0LjM0ODMxLC0wLjk3OTQzIDUuNzk5NDgsLTIuNjgxM2wxOC4zNDI1NiwtMjEuNTExODZjMS40NTEwNSwtMS43MDE4NyAzLjU2OTYyLC0yLjY4MTM5IDUuNzk5NDQsLTIuNjgxMzloMC4zMDU3OE0yNDkuOTgzODgsMTk3LjM2Nzk1aC00Ljc1NzU1Yy0xLjcwNTI5LDAgLTMuMjAzNzksLTEuMTM2NDEgLTMuNjcyMzUsLTIuNzg0MzZsLTYuMDU1MzgsLTIxLjMwNTY2Yy0wLjQ2ODU2LC0xLjY0ODIgLTEuOTY3MDQsLTIuNzg0NTEgLTMuNjcyMzUsLTIuNzg0NTFoLTQuNzU3NDYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmOGMxYSIgc3Ryb2tlLXdpZHRoPSI4LjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvZz48L2c+PC9zdmc+";

  const Cast = Scratch.Cast;
  const vm = Scratch.vm;
  const runtime = vm.runtime;

  const VAR_KEY = "SPtempVars";

  function initTempVarObjects() {
    runtime[VAR_KEY] = Object.create(null);
    for (const target of runtime.targets) target[VAR_KEY] = Object.create(null);
  }

  runtime.on("PROJECT_START", initTempVarObjects);
  runtime.on("PROJECT_STOP_ALL", initTempVarObjects);
  initTempVarObjects();

  // Desktop fork (section 121): compiled through the VM's registerCompiledExtensionBlocks instead of replacing
  // the compiler classes' descendStackedBlock / descendInput. Same generated code.
  {
    const _locationToObj = (name) => {
      let src;
      switch (name) {
        case "global":
          src = "runtime";
          break;
        case "sprite":
          src = "target";
          break;
        default:
          src = "thread";
      }
      return "(" + src + `["${VAR_KEY}"] ??= Object.create(null))`;
    };

    const _castAppendicFunc = `((v) => v === undefined ? 0 : typeof v === "string" ? ("" + v) : Number(v))`;

    runtime.registerCompiledExtensionBlocks("SPtempVars", {
      ir: {
        setVar: (generator, block) => ({
          kind: "stack",
          obj: _locationToObj(block.fields.TYPE.value),
          name: generator.descendInputOfBlock(block, "NAME"),
          value: generator.descendInputOfBlock(block, "VALUE")
        }),
        changeVar: (generator, block) => ({
          kind: "stack",
          obj: _locationToObj(block.fields.TYPE.value),
          name: generator.descendInputOfBlock(block, "NAME"),
          value: generator.descendInputOfBlock(block, "VALUE")
        }),
        swapVar: (generator, block) => ({
          kind: "stack",
          obj1: _locationToObj(block.fields.TYPE1.value),
          name1: generator.descendInputOfBlock(block, "NAME1"),
          obj2: _locationToObj(block.fields.TYPE2.value),
          name2: generator.descendInputOfBlock(block, "NAME2")
        }),
        forVar: (generator, block) => {
          generator.analyzeLoop();
          return {
            kind: "stack",
            obj: _locationToObj(block.fields.TYPE.value),
            branch: generator.descendSubstack(block, "SUBSTACK"),
            name: generator.descendInputOfBlock(block, "NAME"),
            start: generator.descendInputOfBlock(block, "START"),
            end: generator.descendInputOfBlock(block, "END"),
            inc: generator.descendInputOfBlock(block, "INC_VALUE")
          };
        },
        scopeVar: (generator, block) => {
          generator.analyzeLoop();
          return {
            kind: "stack",
            obj: _locationToObj("thread"),
            branch: generator.descendSubstack(block, "SUBSTACK")
          };
        },
        deleteAllVar: (generator, block) => ({
          kind: "stack",
          obj: _locationToObj(block.fields.TYPE.value)
        }),
        deleteVar: (generator, block) => ({
          kind: "stack",
          obj: _locationToObj(block.fields.TYPE.value),
          name: generator.descendInputOfBlock(block, "NAME")
        }),
        varExists: (generator, block) => ({
          kind: "input",
          obj: _locationToObj(block.fields.TYPE.value),
          name: generator.descendInputOfBlock(block, "NAME")
        }),
        getVar: (generator, block) => ({
          kind: "input",
          obj: _locationToObj(block.fields.TYPE.value),
          name: generator.descendInputOfBlock(block, "NAME")
        }),
        allVars: (generator, block) => ({
          kind: "input",
          obj: _locationToObj(block.fields.TYPE.value)
        })
      },
      js: {
        setVar: (node, compiler) => {
          const name = compiler.descendInput(node.name).asString();
          const value = compiler.descendInput(node.value).asUnknown();
          compiler.source += `${node.obj}[${name}] = ${value};\n`;
        },
        changeVar: (node, compiler) => {
          const name = compiler.descendInput(node.name).asString();
          const value = compiler.descendInput(node.value).asUnknown();
          compiler.source += `${node.obj}[${name}] = ${_castAppendicFunc}(${node.obj}[${name}]) + ${value}\n;`;
        },
        swapVar: (node, compiler) => {
          const name1 = compiler.descendInput(node.name1).asString();
          const name2 = compiler.descendInput(node.name2).asString();
          const tempVar = compiler.localVariables.next();

          compiler.source += `const ${tempVar} = ${node.obj1}[${name1}];\n`;
          compiler.source += `${node.obj1}[${name1}] = ${node.obj2}[${name2}];\n`;
          compiler.source += `${node.obj2}[${name2}] = ${tempVar};\n`;
        },
        forVar: (node, compiler, imports) => {
          const name = compiler.descendInput(node.name).asString();
          const start = compiler.descendInput(node.start).asNumber();
          const end = compiler.descendInput(node.end).asNumber();
          const inc = compiler.descendInput(node.inc).asNumber();

          compiler.source += `${node.obj}[${name}] = ${start} - ${inc};\n`;
          compiler.source += `while (${inc} < 0 ? ${end} < ${node.obj}[${name}] : ${end} > ${node.obj}[${name}]) {\n`;
          compiler.source += `${node.obj}[${name}] += ${inc};\n`;
          compiler.descendStack(node.branch, new imports.Frame(true));
          compiler.yieldLoop();
          compiler.source += `}\n`;
        },
        scopeVar: (node, compiler, imports) => {
          const preScopeVar = compiler.localVariables.next();
          const postScopeVar = compiler.localVariables.next();

          compiler.source += `const ${preScopeVar} = structuredClone(${node.obj});\n`;
          compiler.descendStack(node.branch, new imports.Frame(false));
          compiler.source += `const ${postScopeVar} = ${node.obj};\n`;
          compiler.source += `Object.keys(${postScopeVar}).forEach((k) => {\n`;
          compiler.source += `if (${preScopeVar}[k] === undefined) delete ${postScopeVar}[k];\n`;
          compiler.source += `else ${postScopeVar}[k] = ${preScopeVar}[k];\n`;
          compiler.source += `});\n`;
        },
        deleteAllVar: (node, compiler) => {
          const objVar = compiler.localVariables.next();
          compiler.source += `const ${objVar} = ${node.obj};\n`;
          compiler.source += `Object.keys(${objVar}).forEach(n => delete ${objVar}[n]);\n`;
        },
        deleteVar: (node, compiler) => {
          const name = compiler.descendInput(node.name).asString();
          compiler.source += `delete ${node.obj}[${name}];\n`;
        },
        varExists: (node, compiler, imports) => {
          const name = compiler.descendInput(node.name).asString();
          return new imports.TypedInput(`(${node.obj}[${name}] !== undefined)`, imports.TYPE_BOOLEAN);
        },
        getVar: (node, compiler, imports) => {
          const name = compiler.descendInput(node.name).asString();
          return new imports.TypedInput(`(${node.obj}[${name}] ?? "")`, imports.TYPE_UNKNOWN);
        },
        allVars: (node, compiler, imports) => new imports.TypedInput(
          `JSON.stringify(Object.keys(${node.obj}))`,
          imports.TYPE_STRING
        )
      }
    });
  }

  class SPtempVars {
    getInfo() {
      return {
        id: "SPtempVars",
        name: "Temporary Variables",
        color1: "#FF8C1A",
        color2: "#f07800",
        color3: "#DB6E00",
        menuIconURI,
        blocks: [
          {
            opcode: "setVar",
            blockType: Scratch.BlockType.COMMAND,
            text: "set [TYPE] var [NAME] to [VALUE]",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "0", exemptFromNormalization: true },
            },
          },
          {
            opcode: "changeVar",
            blockType: Scratch.BlockType.COMMAND,
            text: "change [TYPE] var [NAME] by [VALUE]",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "1", exemptFromNormalization: true },
            },
          },
          {
            opcode: "swapVar",
            blockType: Scratch.BlockType.COMMAND,
            text: "swap [TYPE1] var [NAME1] with [TYPE2] var [NAME2]",
            arguments: {
              TYPE1: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME1: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
              TYPE2: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME2: { type: Scratch.ArgumentType.STRING, defaultValue: "new variable" }
            },
          },
          "---",
          {
            opcode: "forVar",
            blockType: Scratch.BlockType.LOOP,
            text: ["for each [TYPE] var [NAME] from [START] to [END]", "increment by [INC_VALUE]"],
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              INC_VALUE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 }
            },
          },
          {
            opcode: "scopeVar",
            blockType: Scratch.BlockType.CONDITIONAL,
            text: "run thread vars in scope"
          },
          "---",
          {
            opcode: "varExists",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[TYPE] var [NAME] exists?",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
            },
          },
          {
            opcode: "getVar",
            blockType: Scratch.BlockType.REPORTER,
            allowDropAnywhere: true,
            text: "get [TYPE] var [NAME]",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" },
            },
          },
          "---",
          {
            opcode: "allVars",
            blockType: Scratch.BlockType.REPORTER,
            text: "all [TYPE] variables",
            disableMonitor: true,
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" }
            },
          },
          {
            opcode: "deleteAllVar",
            blockType: Scratch.BlockType.COMMAND,
            text: "delete all [TYPE] variables",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" }
            },
          },
          {
            opcode: "deleteVar",
            blockType: Scratch.BlockType.COMMAND,
            text: "delete [TYPE] var [NAME]",
            arguments: {
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "VAR_TYPES" },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: "my variable" }
            },
          }
        ],
        menus: {
          VAR_TYPES: ["global", "sprite", "thread"]
        },
      };
    }

    // Helper Funcs
    _getOrInitObject(obj) {
      if (obj[VAR_KEY] === undefined) obj[VAR_KEY] = Object.create(null);
      return obj[VAR_KEY];
    }

    _objFromLocation(location, util) {
      // no need to init global variables as its already done and centeralized
      switch (location) {
        case "global": return runtime[VAR_KEY];
        case "sprite": return this._getOrInitObject(util.target);
        default: return this._getOrInitObject(util.thread);
      }
    }

    _castAppendic(value) {
      // used for the change variable block to support both
      // string appending and number iterating
      if (value === undefined) return 0;
      if (typeof value === "string") return Cast.toString(value);
      return Cast.toNumber(value);
    }

    // Block Funcs
    setVar(args, util) {
      const name = Cast.toString(args.NAME);
      this._objFromLocation(args.TYPE, util)[name] = args.VALUE;
    }

    changeVar(args, util) {
      const name = Cast.toString(args.NAME);
      const obj = this._objFromLocation(args.TYPE, util);
      obj[name] = this._castAppendic(obj[name]) + args.VALUE;
    }

    swapVar(args, util) {
      const name1 = Cast.toString(args.NAME1);
      const name2 = Cast.toString(args.NAME2);

      const obj1 = this._objFromLocation(args.TYPE1, util);
      const obj2 = this._objFromLocation(args.TYPE2, util);

      const tempVal = obj1[name1];
      obj1[name1] = obj2[name2];
      obj2[name2] = tempVal;
    }

    forVar(args, util) {
      const incrValue = Cast.toNumber(args.INC_VALUE);
      if (util.stackFrame.index === undefined) {
        util.stackFrame.index = Cast.toNumber(args.START);
        util.stackFrame.endIndex = Cast.toNumber(args.END);
        this.setVar({ ...args, VALUE: util.stackFrame.index - incrValue }, util);
      }

      util.stackFrame.index = this.getVar(args, util) + incrValue;
      this.setVar({ ...args, VALUE: util.stackFrame.index }, util);
      const shouldCallback = incrValue < 0 ? 
        util.stackFrame.endIndex < util.stackFrame.index :
        util.stackFrame.endIndex > util.stackFrame.index;
      util.startBranch(1, shouldCallback);
    }

    scopeVar(_, util) {
      const curThreadVars = this._getOrInitObject(util.thread);
      if (util.stackFrame.initialized === undefined) {
        util.stackFrame.initialized = true;
        util.stackFrame.preScopeVars = structuredClone(curThreadVars);
        util.startBranch(1, true);
      } else {
        // remove variables from scope
        const preScopeVars = util.stackFrame.preScopeVars;
        Object.keys(curThreadVars).forEach((key) => {
          if (preScopeVars[key] === undefined) delete curThreadVars[key];
          else curThreadVars[key] = preScopeVars[key];
        });
      }
    }

    varExists(args, util) {
      const name = Cast.toString(args.NAME);
      return this._objFromLocation(args.TYPE, util)[name] !== undefined;
    }

    getVar(args, util) {
      const name = Cast.toString(args.NAME);
      return this._objFromLocation(args.TYPE, util)[name] ?? "";
    }

    allVars(args, util) {
      return JSON.stringify(Object.keys(
        this._objFromLocation(args.TYPE, util)
      ));
    }

    deleteAllVar(args, util) {
      const obj = this._objFromLocation(args.TYPE, util);
      Object.keys(obj).forEach(name => delete obj[name]);
    }

    deleteVar(args, util) {
      const name = Cast.toString(args.NAME);
      delete this._objFromLocation(args.TYPE, util)[name];
    }
  }

  Scratch.extensions.register(new SPtempVars());
})(Scratch);
});
