const BlockType = require("../../extension-support/block-type");
const ArgumentType = require("../../extension-support/argument-type");
const BlockShape = require("../../extension-support/block-shape");
const Cast = require("../../util/cast");
const MathJS = require("./mathjs.js");
const ExpandableBlocks = require("../../util/expandable-blocks");
// Desktop fork (section 294): blocks defined once for the interpreter and the compiler
const SharedBlocks = require("../../blocks/shared");

// Desktop fork (section 281): "or else" as a single block and as a modular chain "A or else B or else C…"
const OR_ELSE = { prefix: "VALUE", shadow: "text", sep: "or else", exemptFromNormalization: true };

/**
 * Operators Expansion Class
 * @constructor
 */
class pmOperatorsExpansion {
  constructor(runtime) {
    /**
     * The runtime instantiating this block package.
     * @type {runtime}
     */
    this.runtime = runtime;
    this.runtime.registerCompiledExtensionBlocks("pmOperatorsExpansion", this.getCompileInfo());
    // Desktop fork (section 294): the shared definitions' functions (src/blocks/shared/ext-expansions.js)
    this.shared = SharedBlocks.interpreterBlocks(runtime);

    this.replacers = Object.create(null);
  }

  /**
   * @returns {object} metadata for this extension and its blocks.
   */
  getInfo() {
    return {
      id: "pmOperatorsExpansion",
      name: "Operators Expansion",
      color1: "#59C059",
      color2: "#46B946",
      color3: "#389438",
      blocks: [
        {
          opcode: "orIfFalsey",
          modular: { ...OR_ELSE, locked: "" },
          text: "[ONE] or else [TWO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          allowDropAnywhere: true,
          disableMonitor: true,
          arguments: {
            ONE: {
              type: ArgumentType.STRING,
              // Desktop fork (section 280): passed on as it is also when interpreted (the compiled code always did);
              // converted to text, the number 0 and "false" counted as filled in
              exemptFromNormalization: true,
              defaultValue: "a"
            },
            TWO: {
              type: ArgumentType.STRING,
              exemptFromNormalization: true,
              defaultValue: "b"
            }
          }
        },
        {
          opcode: "orIfFalseyModular",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          allowDropAnywhere: true,
          disableMonitor: true,
          modular: OR_ELSE
        },
        {
          opcode: "ifIsTruthy",
          text: "if [ONE] is true then [TWO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          allowDropAnywhere: true,
          disableMonitor: true,
          arguments: {
            ONE: {
              type: ArgumentType.BOOLEAN
            },
            TWO: {
              type: ArgumentType.STRING,
              exemptFromNormalization: true,
              defaultValue: "perfect!"
            }
          }
        },
        "---",
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_nand">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_nor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_xor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_xnor">
              <value name="OPERAND1">
                <shadow type="checkbox" />
              </value>
              <value name="OPERAND2">
                <shadow type="checkbox" />
              </value>
            </block>
            <block type="operator_randomBoolean" />
          `
        },
        "---",
        {
          opcode: "isNumberMultipleOf",
          text: "is [NUM] multiple of [MULTIPLE]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 20
            },
            MULTIPLE: {
              type: ArgumentType.NUMBER,
              defaultValue: 10
            }
          },
          switches: [
            { isNoop: true },
            "isInteger",
            "isPrime",
            "isEven"
          ],
          switchText: "is multiple of?"
        },
        {
          opcode: "isInteger",
          text: "is [NUM] an integer?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 0.5
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isPrime",
            "isEven"
          ],
          switchText: "is integer?"
        },
        {
          opcode: "isPrime",
          text: "is [NUM] a prime number?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 13
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isInteger",
            "isEven"
          ],
          switchText: "is prime?"
        },
        {
          opcode: "isEven",
          text: "is [NUM] even?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 4
            }
          },
          switches: [
            { isNoop: true },
            "isNumberMultipleOf",
            "isInteger",
            "isPrime",
          ],
          switchText: "is even?"
        },
        {
          opcode: "betweenNumbers",
          text: "is [NUM] between [MIN] and [MAX]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 5
            },
            MIN: {
              type: ArgumentType.NUMBER,
              defaultValue: 0
            },
            MAX: {
              type: ArgumentType.NUMBER,
              defaultValue: 10
            }
          }
        },
        "---",
        {
          opcode: "evaluateMath",
          text: "answer to [EQUATION]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            EQUATION: {
              type: ArgumentType.STRING,
              defaultValue: "5 * 2"
            }
          }
        },
        {
          opcode: "partOfRatio",
          text: "[PART] part of ratio [RATIO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            PART: {
              type: ArgumentType.STRING,
              menu: "part"
            },
            RATIO: {
              type: ArgumentType.STRING,
              defaultValue: "1:2"
            }
          },
          switches: [
            { isNoop: true },
            "simplifyRatio"
          ],
          switchText: "part of ratio"
        },
        {
          opcode: "simplifyRatio",
          blockShape: BlockShape.SQUARE, // Desktop fork (section 318): type shapes, its answer is "a:b" or empty, never a number
          text: "simplify ratio [RATIO]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            RATIO: {
              type: ArgumentType.STRING,
              defaultValue: "1:2"
            }
          },
          switches: [
            { isNoop: true },
            "partOfRatio",
          ],
          switchText: "simplify ratio"
        },
        {
          opcode: "pi",
          text: "π",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "euler",
            "infinity"
          ]
        },
        {
          opcode: "euler",
          text: "e",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "pi",
            "infinity"
          ]
        },
        {
          opcode: "infinity",
          text: "∞",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          switches: [
            { isNoop: true },
            "pi",
            "euler",
          ]
        },
        {
          opcode: "truncateNumber",
          text: "truncate number [NUM]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            NUM: {
              type: ArgumentType.NUMBER,
              defaultValue: 2.5
            }
          }
        },
        {
          opcode: "atan2",
          text: "atan2 of x [X] y [Y]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          arguments: {
            X: {
              type: ArgumentType.NUMBER,
              defaultValue: 45
            },
            Y: {
              type: ArgumentType.NUMBER,
              defaultValue: 90
            },
          }
        },
        "---",
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_countAppearTimes">
              <value name="TEXT1">
                <shadow type="text">
                  <field name="TEXT">a</field>
                </shadow>
              </value>
              <value name="TEXT2">
                <shadow type="text">
                  <field name="TEXT">abc abc abc</field>
                </shadow>
              </value>
            </block>
            <block type="operator_readLineInMultilineText">
              <value name="LINE">
                <shadow type="math_number">
                  <field name="NUM">1</field>
                </shadow>
              </value>
              <value name="TEXT">
                <shadow type="text">
                  <field name="TEXT">Text with multiple lines here</field>
                </shadow>
              </value>
            </block>
            <block type="operator_textIncludesLetterFrom">
              <value name="TEXT1">
                <shadow type="text">
                  <field name="TEXT">abcdef</field>
                </shadow>
              </value>
              <value name="TEXT2">
                <shadow type="text">
                  <field name="TEXT">fgh</field>
                </shadow>
              </value>
            </block>
          `
        },
        {
          opcode: "shuffleChars",
          text: "shuffle [TEXT]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello!"
            }
          }
        },
        {
          opcode: "textAfter",
          text: "text after [TEXT] in [BASE]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello"
            },
            BASE: {
              type: ArgumentType.STRING,
              defaultValue: "Hello world!"
            }
          },
          switches: [
            { isNoop: true },
            "textBefore"
          ],
          switchText: "text after"
        },
        {
          opcode: "textBefore",
          text: "text before [TEXT] in [BASE]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "world"
            },
            BASE: {
              type: ArgumentType.STRING,
              defaultValue: "Hello world!"
            }
          },
          switches: [
            { isNoop: true },
            "textAfter",
          ],
          switchText: "text before"
        },
        "---",
        {
          opcode: "exactlyEqual",
          text: "[ONE] exactly equals [TWO]?",
          blockType: BlockType.BOOLEAN,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            ONE: {
              type: ArgumentType.STRING,
              defaultValue: "a"
            },
            TWO: {
              type: ArgumentType.STRING,
              defaultValue: "b"
            }
          },
        },
        {
          blockType: BlockType.XML,
          xml: `
            <block type="operator_character_to_code">
              <value name="ONE">
                <shadow type="text">
                  <field name="TEXT">a</field>
                </shadow>
              </value>
            </block>
            <block type="operator_code_to_character">
              <value name="ONE">
                <shadow type="text">
                  <field name="TEXT">97</field>
                </shadow>
              </value>
            </block>
          `
        },
        "---",
        {
          opcode: "setReplacer",
          text: "set replacer [REPLACER] to [TEXT]",
          blockType: BlockType.COMMAND,
          extensions: ["colours_operators"],
          arguments: {
            REPLACER: {
              type: ArgumentType.STRING,
              defaultValue: "${replacer}"
            },
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "world"
            }
          },
          switches: [
            { isNoop: true },
            "resetReplacers"
          ],
          switchText: "set replacer"
        },
        {
          opcode: "resetReplacers",
          text: "reset replacers",
          blockType: BlockType.COMMAND,
          extensions: ["colours_operators"],
          switches: [
            { isNoop: true },
            "setReplacer",
          ],
          switchText: "reset replacers"
        },
        {
          opcode: "applyReplacers",
          text: "apply replacers to [TEXT]",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            TEXT: {
              type: ArgumentType.STRING,
              defaultValue: "Hello ${replacer}!"
            }
          }
        },
        "---",
        {
          opcode: "speedToPitch",
          text: "speed [SPEED] to pitch",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            SPEED: {
              type: ArgumentType.NUMBER,
              defaultValue: 2
            },
          },
          switches: [
            { isNoop: true },
            {
              opcode: "pitchToSpeed",
              remapArguments: {
                SPEED: "PITCH"
              }
            }
          ],
          switchText: "speed to pitch"
        },
        {
          opcode: "pitchToSpeed",
          text: "pitch [PITCH] to speed",
          blockType: BlockType.REPORTER,
          extensions: ["colours_operators"],
          disableMonitor: true,
          arguments: {
            PITCH: {
              type: ArgumentType.NUMBER,
              defaultValue: 120
            },
          },
          switches: [
            { isNoop: true },
            {
              opcode: "speedToPitch",
              remapArguments: {
                PITCH: "SPEED"
              }
            },
          ],
          switchText: "pitch to speed"
        },
      ],
      menus: {
        part: {
          acceptReporters: false /* Desktop fork (section 265): only its own items work */,
          items: [
            { text: "first", value: "first" },
            { text: "last", value: "last" },
          ]
        }
      }
    };
  }

  /**
   * This function is used for any compiled blocks in the extension if they exist.
   * Data in this function is given to the IR & JS generators.
   * Data must be valid otherwise errors may occur.
   * @returns {object} functions that create data for compiled blocks.
   */
  getCompileInfo() {
    // Desktop fork (section 280): typed text stays text, as the interpreter passes it on. asUnknown() writes typed
    // text that looks like a number as a number: "-2.5" was answered as the number -2.5, and "0" became the number
    // 0, which "or else" then treated as empty. Anything else (a variable, another block) is passed on unchanged.
    const asGiven = input => (typeof input.constantValue === 'string' ? input.asString() : input.asUnknown());
    return {
      ir: {
        orIfFalsey: (generator, block) => ({
          kind: "input",
          one: generator.descendInputOfBlock(block, "ONE"),
          two: generator.descendInputOfBlock(block, "TWO")
        }),
        // Desktop fork (section 281)
        orIfFalseyModular: (generator, block) => {
          const values = [];
          const count = ExpandableBlocks.readCount(block.mutation);
          for (let i = 1; i <= count; i++) values.push(generator.descendInputOfBlock(block, "VALUE" + i));
          return { kind: "input", values };
        },
        ifIsTruthy: (generator, block) => ({
          kind: "input",
          one: generator.descendInputOfBlock(block, "ONE"),
          two: generator.descendInputOfBlock(block, "TWO"),
        }),
        speedToPitch: (generator, block) => ({
          kind: "input",
          speed: generator.descendInputOfBlock(block, "SPEED"),
        }),
        pitchToSpeed: (generator, block) => ({
          kind: "input",
          pitch: generator.descendInputOfBlock(block, "PITCH"),
        }),
        atan2: (generator, block) => ({
          kind: "input",
          x: generator.descendInputOfBlock(block, "X"),
          y: generator.descendInputOfBlock(block, "Y"),
        })
      },
      js: {
        orIfFalsey: (node, compiler, {
          TypedInput,
          TYPE_UNKNOWN
        }) => {
          const num1 = asGiven(compiler.descendInput(node.one));
          const num2 = asGiven(compiler.descendInput(node.two));
          // Desktop fork (section 294): the shared definition
          return new TypedInput(SharedBlocks.inline("pmOperatorsExpansion_orIfFalsey", { ONE: num1, TWO: num2 }), TYPE_UNKNOWN);
        },
        // Desktop fork (section 281): nested single "or else" blocks, left to right
        orIfFalseyModular: (node, compiler, {
          TypedInput,
          TYPE_UNKNOWN
        }) => {
          if (node.values.length === 0) return new TypedInput('""', TYPE_UNKNOWN);
          const source = node.values
            .map(value => asGiven(compiler.descendInput(value)))
            .reduce((left, right) => `(${left} || ${right})`);
          return new TypedInput(source, TYPE_UNKNOWN);
        },
        ifIsTruthy: (node, compiler, {
          TypedInput,
          TYPE_UNKNOWN
        }) => {
          const num1 = compiler.descendInput(node.one).asBoolean();
          const num2 = asGiven(compiler.descendInput(node.two));
          return new TypedInput(SharedBlocks.inline("pmOperatorsExpansion_ifIsTruthy", { ONE: num1, TWO: num2 }), TYPE_UNKNOWN);
        },
        speedToPitch: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const speed = compiler.descendInput(node.speed).asNumber();
          return new TypedInput(SharedBlocks.inline("pmOperatorsExpansion_speedToPitch", { SPEED: speed }), TYPE_NUMBER_NAN);
        },
        pitchToSpeed: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const pitch = compiler.descendInput(node.pitch).asNumber();
          return new TypedInput(SharedBlocks.inline("pmOperatorsExpansion_pitchToSpeed", { PITCH: pitch }), TYPE_NUMBER_NAN);
        },
        atan2: (node, compiler, {
          TypedInput,
          TYPE_NUMBER_NAN
        }) => {
          const x = compiler.descendInput(node.x).asNumber();
          const y = compiler.descendInput(node.y).asNumber();
          return new TypedInput(SharedBlocks.inline("pmOperatorsExpansion_atan2", { X: x, Y: y }), TYPE_NUMBER_NAN);
        }
      }
    };
  }

  // Desktop fork (section 294): defined once for the interpreter and the compiler (src/blocks/shared/ext-expansions.js)
  pi(args, util) { return this.shared.pmOperatorsExpansion_pi(args, util); }
  euler(args, util) { return this.shared.pmOperatorsExpansion_euler(args, util); }
  infinity(args, util) { return this.shared.pmOperatorsExpansion_infinity(args, util); }
  partOfRatio(args, util) { return this.shared.pmOperatorsExpansion_partOfRatio(args, util); }
  simplifyRatio(args, util) { return this.shared.pmOperatorsExpansion_simplifyRatio(args, util); }
  truncateNumber(args, util) { return this.shared.pmOperatorsExpansion_truncateNumber(args, util); }
  isNumberMultipleOf(args, util) { return this.shared.pmOperatorsExpansion_isNumberMultipleOf(args, util); }
  isInteger(args, util) { return this.shared.pmOperatorsExpansion_isInteger(args, util); }
  isPrime(args, util) { return this.shared.pmOperatorsExpansion_isPrime(args, util); }
  isEven(args, util) { return this.shared.pmOperatorsExpansion_isEven(args, util); }
  exactlyEqual(args, util) { return this.shared.pmOperatorsExpansion_exactlyEqual(args, util); }
  betweenNumbers(args, util) { return this.shared.pmOperatorsExpansion_betweenNumbers(args, util); }
  textAfter(args, util) { return this.shared.pmOperatorsExpansion_textAfter(args, util); }
  textBefore(args, util) { return this.shared.pmOperatorsExpansion_textBefore(args, util); }

  evaluateMath(args) {
    const equation = Cast.toString(args.EQUATION);
    // "" is undefined when evalutated
    if (equation.trim().length === 0) return 0;
    // evalueate
    let answer = 0;
    try {
      answer = MathJS.evaluate(equation);
    } catch {
      // syntax errors cause real errors
      answer = 0;
    }
    // multiline or semi-colon breaks create a ResultSet, we can get the last item in the set for that
    if (typeof answer === "object") {
      if ("entries" in answer) {
        const answers = answer.entries;
        if (answers.length === 0) return 0;
        const lastIdx = answers.length - 1;
        return Number(answers[lastIdx]);
      }
    }
    // Cast.toNumber converts NaN to 0
    return Number(answer);
  }

  shuffleChars(args) {
    const text = Cast.toString(args.TEXT);
    const split = text.split("");
    // Desktop fork (section 154): the runtime's random numbers
    const shuffled = split.sort(() => this.runtime.pmRandom() - 0.5);
    return shuffled.join("");
  }

  setReplacer(args) {
    const replacer = Cast.toString(args.REPLACER);
    const text = Cast.toString(args.TEXT);
    this.replacers[replacer] = text;
  }
  resetReplacers() {
    this.replacers = Object.create(null);
  }
  applyReplacers(args) {
    let text = Cast.toString(args.TEXT);
    for (const replacer in this.replacers) {
      const replacementText = this.replacers[replacer];
      text = text.replaceAll(replacer, replacementText);
    }
    return text;
  }

  // These blocks are compiled (section 294: from their shared definitions, as the interpreter's versions)
  orIfFalsey(args, util) { return this.shared.pmOperatorsExpansion_orIfFalsey(args, util); }
  // Desktop fork (section 281): a chain of the single block's function, left to right
  orIfFalseyModular(args) {
    return ExpandableBlocks.runChain(args, { prefix: OR_ELSE.prefix, levels: { o: 1 }, empty: "" },
      (symbol, ONE, TWO) => this.orIfFalsey({ ONE, TWO }));
  }
  ifIsTruthy(args, util) { return this.shared.pmOperatorsExpansion_ifIsTruthy(args, util); }
  speedToPitch(args, util) { return this.shared.pmOperatorsExpansion_speedToPitch(args, util); }
  pitchToSpeed(args, util) { return this.shared.pmOperatorsExpansion_pitchToSpeed(args, util); }
  atan2(args, util) { return this.shared.pmOperatorsExpansion_atan2(args, util); }
}

module.exports = pmOperatorsExpansion;
