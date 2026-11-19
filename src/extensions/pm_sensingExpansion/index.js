const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const BlockShape = require('../../extension-support/block-shape');
const formatMessage = require('format-message');
const Cast = require('../../util/cast');
// Desktop fork (section 294): blocks defined once for the interpreter and the compiler
const SharedBlocks = require('../../blocks/shared');
const Color = require('../../util/color');

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px

const blocks = `
<block type="sensing_thing_has_number">
    <value name="TEXT1">
        <shadow type="text">
            <field name="TEXT">abc 10 def</field>
        </shadow>
    </value>
</block>
<block type="sensing_isUpperCase">
    <value name="text">
        <shadow type="text">
            <field name="TEXT">A</field>
        </shadow>
    </value>
</block>
${blockSeparator}
%b11>
%b12>
%b14>
<block type="pmSensingExpansion_amountOfTimeKeyHasBeenHeld">
    <value name="KEY">
        <shadow type="sensing_keyoptions" />
    </value>
</block>
%b15>
%b16>
${blockSeparator}
%b9>
<block type="sensing_getspritewithattrib">
    <value name="var">
        <shadow type="text">
            <field name="TEXT">my variable</field>
        </shadow>
    </value>
    <value name="val">
        <shadow type="text">
            <field name="TEXT">0</field>
        </shadow>
    </value>
</block>
%b6>
${blockSeparator}
%b5>
%b7>
%b10>
%b8>
${blockSeparator}
<block type="sensing_getoperatingsystem"/>
${blockSeparator}
%b3>
%b2>
%b4>
%b1>
${blockSeparator}
%b0>
`

/**
 * Class of 2023
 * @constructor
 */
class pmSensingExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        // Desktop fork (section 294): the shared definitions' functions (src/blocks/shared/ext-expansions.js)
        this.shared = SharedBlocks.interpreterBlocks(runtime);

        this.canVibrate = true;

        this.canGetLoudness = false;
        this.loudnessArray = [0];

        this.lastValues = {};
    }

    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace('%b' + idx + ">", block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo() {
        return {
            id: 'pmSensingExpansion',
            name: 'Sensing Expansion',
            color1: "#5CB1D6",
            color2: "#47A8D1",
            color3: "#2E8EB8",
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'vibrateDevice',
                    text: 'vibrate',
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'packaged',
                    text: 'project packaged?',
                    blockType: BlockType.BOOLEAN,
                    disableMonitor: true
                },
                {
                    opcode: 'spriteName',
                    text: 'sprite name',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true
                },
                {
                    opcode: 'currentMillisecond',
                    text: 'current millisecond',
                    blockType: BlockType.REPORTER,
                    disableMonitor: false
                },
                {
                    opcode: 'pickColor',
                    blockShape: BlockShape.SQUARE, // Desktop fork (section 318): type shapes, its answer is always #rrggbb
                    text: 'grab color at x: [X] y: [Y]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        X: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        },
                        Y: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 0
                        }
                    }
                },
                {
                    opcode: 'maxSpriteLayers',
                    text: 'max sprite layers',
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'averageLoudness',
                    text: 'average loudness',
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'currentKeyPressed',
                    text: 'current key pressed',
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'amountOfTimeKeyHasBeenHeld',
                    text: 'seconds since holding [KEY]',
                    blockType: BlockType.REPORTER,
                    arguments: {
                        KEY: {
                            // this is replaced later
                            type: ArgumentType.STRING,
                            defaultValue: 'a'
                        }
                    }
                },
                {
                    opcode: 'getLastKeyPressed',
                    text: formatMessage({
                        id: 'tw.blocks.lastKeyPressed',
                        default: 'last key pressed',
                        description: 'Block that returns the last key that was pressed'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'getButtonIsDown',
                    text: formatMessage({
                        id: 'tw.blocks.buttonIsDown',
                        default: '[MOUSE_BUTTON] mouse button down?',
                        description: 'Block that returns whether a specific mouse button is down'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {
                        MOUSE_BUTTON: {
                            type: ArgumentType.NUMBER,
                            shape: BlockShape.ROUND, // Desktop fork (section 318): type shapes, only its number is used
                            menu: 'mouseButton',
                            defaultValue: '0'
                        }
                    }
                },
                {
                    opcode: 'changed',
                    blockType: BlockType.BOOLEAN,
                    text: '[ONE] changed?',
                    arguments: {
                        ONE: {
                          type: null,
                        },
                    },
                }
            ],
            menus: {
                mouseButton: {
                    items: [
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.primary',
                                default: '(0) primary',
                                description: 'Dropdown item to select primary (usually left) mouse button'
                            }),
                            value: '0'
                        },
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.middle',
                                default: '(1) middle',
                                description: 'Dropdown item to select middle mouse button'
                            }),
                            value: '1'
                        },
                        {
                            text: formatMessage({
                                id: 'tw.blocks.mouseButton.secondary',
                                default: '(2) secondary',
                                description: 'Dropdown item to select secondary (usually right) mouse button'
                            }),
                            value: '2'
                        }
                    ],
                    acceptReporters: true
                }
            }
        };
    }

    getLastKeyPressed (args, util) {
        return this.shared.pmSensingExpansion_getLastKeyPressed(args, util);
    }

    getButtonIsDown (args, util) {
        return this.shared.pmSensingExpansion_getButtonIsDown(args, util);
    }

    changed(args, util) {
      const id = util.thread.peekStack()
      if (!this.lastValues[id])
        this.lastValues[id] = Cast.toString(args.ONE);
      if (Cast.toString(args.ONE) !== this.lastValues[id]) {
        this.lastValues[id] = Cast.toString(args.ONE);
        return true;
      }
      return false;
    }

    pickColor(args) {
        const renderer = this.runtime.renderer;
        const scratchX = Cast.toNumber(args.X);
        const scratchY = Cast.toNumber(args.Y);
        const clientX = Math.round((((this.runtime.stageWidth / 2) + scratchX) / this.runtime.stageWidth) * renderer._gl.canvas.clientWidth);
        const clientY = Math.round((((this.runtime.stageHeight / 2) - scratchY) / this.runtime.stageHeight) * renderer._gl.canvas.clientHeight);
        const colorInfo = renderer.extractColor(clientX, clientY, 20);
        return Color.rgbToHex(colorInfo.color);
    }


    // blocks

    maxSpriteLayers (args, util) {
        return this.shared.pmSensingExpansion_maxSpriteLayers(args, util);
    }
    averageLoudness() {
        if (!this.canGetLoudness) {
            // set interval here because why create an interval
            // on extension register if we never use the block
            console.log('created average loudness loop');
            this.runtime.pmSetInterval(() => { // Desktop fork (section 156): the runtime's timer
                if (!this.canGetLoudness) return;
                const loudness = this.runtime.audioEngine.getLoudness();
                if (typeof loudness !== 'number') return;
                if (this.loudnessArray.length > 20) {
                    this.loudnessArray.shift();
                }
                if (loudness < 0) {
                    this.loudnessArray.push(0);
                    return;
                }
                this.loudnessArray.push(loudness);
            }, 50);
        }
        // get average
        this.canGetLoudness = true;
        let addedTogether = 0;
        let max = this.loudnessArray.length;
        for (const loudness of this.loudnessArray) {
            addedTogether += loudness;
        }
        return addedTogether / max;
    }

    currentKeyPressed (args, util) {
        return this.shared.pmSensingExpansion_currentKeyPressed(args, util);
    }
    amountOfTimeKeyHasBeenHeld (args, util) {
        return this.shared.pmSensingExpansion_amountOfTimeKeyHasBeenHeld(args, util);
    }

    vibrateDevice() {
        // avoid vibration spam
        // only vibrate every 1s
        if (!this.canVibrate) return;

        if ('vibrate' in navigator) {
            this.canVibrate = false;
            navigator.vibrate(250);
            this.runtime.pmSetTimeout(() => { // Desktop fork (section 156): the runtime's timer
                this.canVibrate = true;
            }, 1000);
        }
    }



    packaged (args, util) {
        return this.shared.pmSensingExpansion_packaged(args, util);
    }

    spriteName (args, util) {
        return this.shared.pmSensingExpansion_spriteName(args, util);
    }


    currentMillisecond (args, util) {
        return this.shared.pmSensingExpansion_currentMillisecond(args, util);
    }

}

module.exports = pmSensingExpansion;
