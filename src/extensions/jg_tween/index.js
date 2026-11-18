const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');

const {interpolate, EasingMethods} = require('../../extension-support/easing'); // section 296: the shared easing table

class Tween {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }
    getInfo() {
        return {
            id: "jgTween",
            name: "Tweening",
            blocks: [
                {
                    opcode: "tweenValue",
                    text: formatMessage({
                        id: 'jgTween.blocks.tweenValue',
                        default: '[MODE] ease [DIRECTION] [START] to [END] by [AMOUNT]%',
                        description: 'Block for easing a value with a certain mode and direction by a certain amount.'
                    }),
                    disableMonitor: true,
                    blockType: BlockType.REPORTER,
                    arguments: {
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: "modes"
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: "direction"
                        },
                        START: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        END: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        AMOUNT: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 50
                        }
                    }
                },
                {
                    opcode: "tweenVariable",
                    text: "tween variable [VAR] to [VALUE] over [SEC] seconds using [MODE] ease [DIRECTION]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VAR: {
                            type: ArgumentType.STRING,
                            menu: "vars"
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        SEC: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: "modes"
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: "direction"
                        }
                    }
                },
                {
                    opcode: "tweenXY",
                    text: "tween to x: [X] y: [Y] over [SEC] seconds using [MODE] ease [DIRECTION]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PROPERTY: {
                            type: ArgumentType.STRING,
                            menu: "properties"
                        },
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        SEC: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: "modes"
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: "direction"
                        }
                    }
                },
                {
                    opcode: "tweenProperty",
                    text: "tween [PROPERTY] to [VALUE] over [SEC] seconds using [MODE] ease [DIRECTION]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PROPERTY: {
                            type: ArgumentType.STRING,
                            menu: "properties"
                        },
                        VALUE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100
                        },
                        SEC: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        },
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: "modes"
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: "direction"
                        }
                    }
                },
                "---",
                {
                    opcode: "tweenVariableCancel",
                    text: "cancel tween for variable [VAR]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        VAR: {
                            type: ArgumentType.STRING,
                            menu: "vars"
                        }
                    }
                },
                {
                    opcode: "tweenPropertyCancel",
                    text: "cancel tween for [PROPERTY]",
                    blockType: BlockType.COMMAND,
                    arguments: {
                        PROPERTY: {
                            type: ArgumentType.STRING,
                            menu: "properties"
                        }
                    }
                },
                "---",
                {
                    opcode: "tweenC", blockType: BlockType.LOOP,
                    text: "[MODE] ease [DIRECTION] [CHANGE] [START] to [END] in [SEC] secs",
                    arguments: {
                        MODE: {
                            type: ArgumentType.STRING,
                            menu: "modes",
                        },
                        DIRECTION: {
                            type: ArgumentType.STRING,
                            menu: "direction",
                        },
                        CHANGE: {
                            type: ArgumentType.STRING,
                            fillIn: "tweenVal"
                        },
                        START: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0,
                        },
                        END: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 100,
                        },
                        SEC: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1,
                        }, 
                    }
                },
                {
                    opcode: "tweenVal", blockType: BlockType.REPORTER,
                    text: "tween value", canDragDuplicate: true, hideFromPalette: true
                },
            ],
            menus: {
                modes: {
                    acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                    items: Object.keys(EasingMethods)
                },
                direction: {
                    acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                    items: ["in", "out", "in out"]
                },
                vars: {
                    acceptReporters: false, // for Scratch parity
                    items: "getVariables"
                },
                properties: {
                    acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                    items: ["x position", "y position", "direction", "size"]
                }
            }
        };
    }

    getVariables() {
        const variables =
            // @ts-expect-error
            typeof Blockly === "undefined" ? [] :
            // @ts-expect-error
                Blockly.getMainWorkspace()
                    .getVariableMap().getVariablesOfType("")
                    .map(model => ({ text: model.name, value: model.getId() }));
        if (variables.length > 0) return variables;
        return [{ text: "", value: "" }];
        
    }

    tweenValue(args) {
        const easeMethod = Cast.toString(args.MODE);
        const easeDirection = Cast.toString(args.DIRECTION);
        const start = Cast.toNumber(args.START);
        const end = Cast.toNumber(args.END);
        const progress = Cast.toNumber(args.AMOUNT) / 100;

        if (!Object.prototype.hasOwnProperty.call(EasingMethods, easeMethod)) {
            // Unknown method
            return start;
        }
        const easingFunction = EasingMethods[easeMethod];

        const tweened = easingFunction(progress, easeDirection);
        return interpolate(tweened, start, end);
    }

    _tweenValue(args, util, id, valueArgName, currentValue, propertyName) {
        // Only use args on first run. For later executions grab everything from stackframe.
        // This ensures that if the arguments change, the tweening won't change. This matches
        // the vanilla Scratch glide blocks.
        const state = util.stackFrame[id];

        if (!state) {
            // First run, need to start timer
            util.yield();

            if (util.stackTimerNeedsInit()) {
               const durationMS = Math.max(0, 1000 * Cast.toNumber(args.SEC));
               util.startStackTimer(durationMS);
            }
            const easeMethod = Cast.toString(args.MODE);
            const easeDirection = Cast.toString(args.DIRECTION);
            const start = currentValue;
            const end = Cast.toNumber(args[valueArgName]);

            let easingFunction;
            if (Object.prototype.hasOwnProperty.call(EasingMethods, easeMethod)) easingFunction = EasingMethods[easeMethod];
            else easingFunction = EasingMethods.linear;

            util.stackFrame[id] = {
                easingFunction, easeDirection,
                start, end, propertyName
            };
            return start;
        } else if (util.stackTimerFinished()) {
            // Done
            return util.stackFrame[id].end;
        } 
        // Still running
        util.yield();

        const progress = util.stackFrame.timer.timeElapsed() / util.stackFrame.duration;
        const tweened = state.easingFunction(progress, state.easeDirection);
        return interpolate(tweened, state.start, state.end);
    }

    tweenVariable(args, util) {
        const variable = util.target.lookupVariableById(args.VAR);

        if (util.stackFrame[""] && util.stackFrame[""].cancelled) {
            return;
        }

        const value = this._tweenValue(args, util, "", "VALUE", variable.value, args.VAR);
        if (variable && variable.type === "") variable.value = value;
    }

    tweenXY(args, util) {
        const stateX = util.stackFrame["x"] || {};
        const stateY = util.stackFrame["y"] || {};

        const x = stateX.cancelled ? util.target.x : this._tweenValue(args, util, "x", "X", util.target.x, "x position");
        const y = stateY.cancelled ? util.target.y : this._tweenValue(args, util, "y", "Y", util.target.y, "y position");
        util.target.setXY(x, y);
    }

    tweenProperty(args, util) {
        let currentValue = 0;
        if (args.PROPERTY === "x position") currentValue = util.target.x;
        else if (args.PROPERTY === "y position") currentValue = util.target.y;
        else if (args.PROPERTY === "direction") currentValue = util.target.direction;
        else if (args.PROPERTY === "size") currentValue = util.target.size;

        if (util.stackFrame[""] && util.stackFrame[""].cancelled) {
            return;
        }

        const value = this._tweenValue(args, util, "", "VALUE", currentValue, args.PROPERTY);

        if (args.PROPERTY === "x position") util.target.setXY(value, util.target.y);
        else if (args.PROPERTY === "y position") util.target.setXY(util.target.x, value);
        else if (args.PROPERTY === "direction") util.target.setDirection(value);
        else if (args.PROPERTY === "size") util.target.setSize(value);
    }

    tweenVariableCancel(args, util) {
        const property = args.VAR;
        this.tweenPropertyCancel({
            PROPERTY: property
        }, util);
    }
    tweenPropertyCancel(args, util) {
        const property = args.PROPERTY;
        const id = util.target.id;

        // supposedly for i loop is faster (garbo seemed to say this before too?)
        for (let i = 0; i < this.runtime.threads.length; i++) {
            const thread = this.runtime.threads[i];
            if (!thread.target) continue;
            if (thread.target.id !== id) continue;
            // some threads dont have a stackFrame from util
            if (!thread.compatibilityStackFrame) continue;
            // x position and y position should also cancel the tweenXY block
            const propertyFrame = thread.compatibilityStackFrame[""] ||
                (property === "x position" ? thread.compatibilityStackFrame["x"] : null) ||
                (property === "y position" ? thread.compatibilityStackFrame["y"] : null);
            // this thread did not have a property tween
            if (!propertyFrame) continue;
            // check if the property being tweened is the one we are cancelling
            if (propertyFrame.propertyName !== property) continue;
            propertyFrame.cancelled = true;
        }
    }

    tweenC(args, util) {
      const id = "loopedVal";
      const state = util.stackFrame[id];
      if (!state) {
        if (util.stackTimerNeedsInit()) {
            const durationMS = Math.max(0, 1000 * Cast.toNumber(args.SEC));
            util.startStackTimer(durationMS);
        }
        const easeMethod = Cast.toString(args.MODE);
        const easeDirection = Cast.toString(args.DIRECTION);
        const start = Cast.toNumber(args.START);
        const end = Cast.toNumber(args.END);
        const params = util.thread.tweenValue;
        if (typeof params === "undefined") util.thread.stackFrames[0].tweenValue = start;
        let easingFunction;
        if (Object.prototype.hasOwnProperty.call(EasingMethods, easeMethod)) easingFunction = EasingMethods[easeMethod];
        else easingFunction = EasingMethods.linear;

        util.stackFrame[id] = {
          easingFunction, easeDirection,
          start, end,
        };
        util.startBranch(1, true);
      } else if (util.stackTimerFinished()) {
        util.thread.stackFrames[0].tweenValue = util.stackFrame[id].end;
        if (util.stackFrame[id].canContinue !== "stop") {
          util.stackFrame[id].canContinue = "stop";
          util.startBranch(1, true);
        }
      } else {
        const progress = util.stackFrame.timer.timeElapsed() / util.stackFrame.duration;
        const tweened = state.easingFunction(progress, state.easeDirection);
        util.thread.stackFrames[0].tweenValue =  interpolate(tweened, state.start, state.end);
        if (util.stackFrame[id].canContinue !== "stop") util.startBranch(1, true);
      }
    }

    tweenVal(_, util) {
        return util.thread.stackFrames[0].tweenValue ?? "";
    }
}

module.exports = Tween;
