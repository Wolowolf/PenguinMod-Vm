const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const Thread = require('../../engine/thread');
const RenderedTarget = require('../../sprites/rendered-target');

// Blocks that come from the former "More Events" (LilyMakesThings) and "Events+" (SharkPool) extensions,
// merged into this one. Hats that have to be asked again every frame (they are not edge activated):
const EVERY_FRAME_HATS = ['whileTrueFalse', 'whenValueChanged', 'everyDuration', 'whileKeyPressed'];
const MAX_BEFORE_SAVE_MS = 3000;

const KEYBOARD_KEYS = ['space', 'up arrow', 'down arrow', 'right arrow', 'left arrow', 'enter',
    'backspace', 'delete', 'shift', 'caps lock', 'scroll lock', 'control', 'escape', 'insert', 'home', 'end',
    'page up', 'page down']
    .concat('abcdefghijklmnopqrstuvwxyz0123456789'.split(''))
    .map(key => ({text: key, value: key}));

// Names of the events "force run" can start. Extension events are added when the menu is opened.
const CORE_EVENTS = {
    event_whenflagclicked: 'when flag clicked',
    event_whenstopclicked: 'when stop clicked',
    event_always: 'always',
    event_whenanything: 'when <BOOLEAN>',
    event_whenkeyhit: 'when [KEY] key hit',
    event_whenmousescrolled: 'when mouse is scrolled [DIRECTION]',
    event_whenkeypressed: 'when [KEY] key pressed',
    event_whenthisspriteclicked: 'when this sprite clicked',
    event_whenstageclicked: 'when stage clicked',
    event_whenbackdropswitchesto: 'when backdrop switches to [BACKDROP]',
    event_whengreaterthan: 'when [THING] > (NUMBER)',
    event_whenbroadcastreceived: 'when I receive [MESSAGE]',
    control_start_as_clone: 'when I start as clone'
};

// Evaluates a reporter block of a script on its own and gives back what it reports.
const evaluateBlock = (runtime, block, target) => new Promise(resolve => {
    if (!block) {
        resolve('');
        return;
    }
    const thread = new Thread(block.id);
    thread.pushStack(block.id);
    thread.blockContainer = target.blocks;
    thread.target = target;
    thread.stackClick = false;
    thread.pushReportedValue = value => resolve(value);
    runtime.threads.push(thread);
    runtime.threadMap.set(thread.getId(), thread);
});

const blockSeparator = '<sep gap="36"/>'; // At default scale, about 28px

const blocks = `
<!-- %b4 > nah -->
<block type="event_whenbroadcastreceived"></block>
<block type="pmEventsExpansion_sendWithData">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="DATA">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
<block type="pmEventsExpansion_isBroadcastReceived">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
%b5>
${blockSeparator}
<!-- %b6 > -->
<block type="pmEventsExpansion_broadcastToSprite">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastToTargetAndWait">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastDataToTarget">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="DATA">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastDataToTargetAndWait">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="DATA">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastFunction">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastFunctionArgs">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
    <value name="ARGS">
        <shadow type="text">
            <field name="TEXT">abc</field>
        </shadow>
    </value>
</block>
<block type="pmEventsExpansion_broadcastThreadCount">
    <value name="BROADCAST">
        <shadow type="event_broadcast_menu"></shadow>
    </value>
</block>
%b8>
${blockSeparator}
%b28>
%b29>
%b30>
${blockSeparator}
%b2>
%b24>
%b0>
%b1>
${blockSeparator}
%b15>
%b11>
%b12>
%b13>
%b14>
${blockSeparator}
%b16>
%b17>
${blockSeparator}
%b25>
%b26>
%b27>
%b23>
${blockSeparator}
%b21>
%b22>
${blockSeparator}
%b31>
`

/**
 * Class of idk
 * @constructor
 */
class pmEventsExpansion {
    constructor(runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {runtime}
         */
        this.runtime = runtime;
        // every other frame block
        this._otherFrame = false;
        this.runtime.on('RUNTIME_STEP_START', () => {
            this._everyOtherFrame();
        });

        // --- from More Events / Events+ ---
        runtime.pmEventsExpansion = this;
        this._frame = 0; // project frames since the project started
        this._animationFrame = 0; // browser animation frames
        this._tick = 0; // counts every frame, never reset (for the cache below)
        this._tickType = 'project'; // which kind of frame is asking the "every n frames" hats
        this._hatCache = Object.create(null);
        this._canvasWatched = false;
        this._lastCanvasRatio = null;

        runtime.on('PROJECT_START', () => {
            this._frame = 0;
        });
        runtime.on('PROJECT_STOP_ALL', () => {
            this._frame = 0;
        });
        runtime.on('BEFORE_EXECUTE', () => {
            this._frame++;
            this._tick++;
            this._tickType = 'project';
            for (const hat of EVERY_FRAME_HATS) runtime.startHats(`pmEventsExpansion_${hat}`);
            if (!this._canvasWatched) this._watchCanvas();
        });
        if (typeof requestAnimationFrame === 'function') {
            const animate = () => {
                this._animationFrame++;
                this._tickType = 'animation';
                runtime.startHats('pmEventsExpansion_everyDuration');
                this._tickType = 'project';
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }

        // when I receive any message / dynamic messages, "message" reporter: look at every started broadcast hat
        runtime.on('HATS_STARTED', (opcode, fields, target, threads) => {
            if (opcode === 'event_whenbroadcastreceived' && fields && threads) {
                this._broadcastReceived(fields.BROADCAST_OPTION, threads, target);
            }
        });

        // sprites and clones created or deleted
        runtime.on('targetWasCreated', (newTarget, original) => this._spriteListChanged('create', newTarget, original));
        runtime.on('targetWasRemoved', target => this._spriteListChanged('delete', target));

        // the screen changes size or goes fullscreen
        if (typeof document !== 'undefined') {
            const fullscreenChanged = () => {
                const full = Cast.toBoolean(document.fullscreenElement || document.webkitFullscreenElement);
                runtime.startHats('pmEventsExpansion_whenScreenChanges', {SCREEN: full ? 'windowFull' : 'windowDefault'});
            };
            document.addEventListener('fullscreenchange', fullscreenChanged);
            document.addEventListener('webkitfullscreenchange', fullscreenChanged);
        }

        // sprites dragged and dropped by the player
        const vm = runtime.vm;
        if (vm && !vm.pmEventsExpansionDragHooked) {
            vm.pmEventsExpansionDragHooked = true;
            for (const [method, type] of [['startDrag', 'drag'], ['stopDrag', 'drop']]) {
                const original = vm[method];
                vm[method] = function (targetId) {
                    const result = original.apply(this, arguments);
                    const target = this.runtime.getTargetById(targetId);
                    if (target && target.sprite && !target.isStage) {
                        this.runtime.startHats('pmEventsExpansion_whenSpriteDragDrop', {SPRITE: target.sprite.name, TYPE: type});
                    }
                    return result;
                };
            }
        }

        // costume switches (only a real change counts)
        if (!RenderedTarget.prototype.pmEventsExpansionCostumeHooked) {
            RenderedTarget.prototype.pmEventsExpansionCostumeHooked = true;
            const originalSetCostume = RenderedTarget.prototype.setCostume;
            RenderedTarget.prototype.setCostume = function () {
                const before = this.currentCostume;
                const result = originalSetCostume.apply(this, arguments);
                const events = this.runtime && this.runtime.pmEventsExpansion;
                if (events && this.currentCostume !== before) events._costumeChanged(this);
                return result;
            };
        }

        // before / after the project is saved
        if (vm && !vm.pmEventsExpansionSaveHooked) {
            vm.pmEventsExpansionSaveHooked = true;
            const beforeSave = () => new Promise(resolve => {
                const threads = runtime.startHats('pmEventsExpansion_beforeSave') || [];
                if (threads.length === 0) {
                    resolve();
                    return;
                }
                const startTime = performance.now();
                const check = () => {
                    if (performance.now() - startTime > MAX_BEFORE_SAVE_MS ||
                        threads.every(thread => !runtime.isActiveThread(thread))) {
                        runtime.off('AFTER_EXECUTE', check);
                        resolve();
                    }
                };
                runtime.on('AFTER_EXECUTE', check);
            });
            const afterSave = () => {
                // wait for the next frame so the saving can finish first
                runtime.once('BEFORE_EXECUTE', () => {
                    runtime.startHats('pmEventsExpansion_afterSave');
                });
            };
            const originalSave = vm.saveProjectSb3;
            vm.saveProjectSb3 = async function (...args) {
                await beforeSave();
                const result = await originalSave.apply(this, args);
                afterSave();
                return result;
            };
            const originalSaveStream = vm.saveProjectSb3Stream;
            vm.saveProjectSb3Stream = function (...args) {
                // a stream object has to be returned at once, so calls are queued until the real one exists
                let realStream = null;
                const queuedCalls = [];
                const whenStreamReady = (methodName, callArgs) => {
                    if (realStream) return realStream[methodName].apply(realStream, callArgs);
                    return new Promise(resolve => {
                        queuedCalls.push({resolve, methodName, args: callArgs});
                    });
                };
                const streamWrapper = {
                    on: (...callArgs) => void whenStreamReady('on', callArgs),
                    pause: (...callArgs) => void whenStreamReady('pause', callArgs),
                    resume: (...callArgs) => void whenStreamReady('resume', callArgs),
                    accumulate: (...callArgs) => whenStreamReady('accumulate', callArgs)
                };
                beforeSave().then(() => {
                    realStream = originalSaveStream.apply(this, args);
                    realStream.on('end', () => {
                        try {
                            afterSave();
                        } catch (e) {
                            console.error(e);
                        }
                    });
                    for (const queued of queuedCalls) {
                        queued.resolve(realStream[queued.methodName].apply(realStream, queued.args));
                    }
                    queuedCalls.length = 0;
                });
                return streamWrapper;
            };
        }
    }

    // does any script use this hat? (asked at most once per frame)
    _hatExists(hat) {
        const cached = this._hatCache[hat];
        if (cached && cached.tick === this._tick) return cached.value;
        let value = false;
        this.runtime.allScriptsByOpcodeDo(`pmEventsExpansion_${hat}`, () => {
            value = true;
        });
        this._hatCache[hat] = {tick: this._tick, value};
        return value;
    }

    _watchCanvas() {
        const canvas = this.runtime.renderer && this.runtime.renderer.canvas;
        if (!canvas || typeof ResizeObserver === 'undefined') return;
        this._canvasWatched = true;
        new ResizeObserver(entries => {
            if (this._lastCanvasRatio === null) {
                this._lastCanvasRatio = 'default'; // the first size is not a change
                return;
            }
            const ratio = entries[0].contentRect.width / this.runtime.stageWidth;
            const name = ratio < 0.51 ? 'small' : ratio > 1.4 ? 'full' : 'default';
            if (name === this._lastCanvasRatio) return;
            this._lastCanvasRatio = name;
            this.runtime.startHats('pmEventsExpansion_whenScreenChanges', {SCREEN: name});
        }).observe(canvas);
    }

    _costumeChanged(target) {
        if (!this._hatExists('whenCostumeChanged')) return;
        const costume = target.getCurrentCostume();
        this.runtime.startHats('pmEventsExpansion_whenCostumeChanged', {COSTUME: costume ? costume.name : ''}, target);
    }

    _spriteListChanged(type, target, original) {
        if (!this._hatExists('whenSpriteListChange')) return;
        const threads = this.runtime.startHats('pmEventsExpansion_whenSpriteListChange', {
            TYPE: type,
            TARGET_TYPE: target.isOriginal ? 'sprite' : 'clone'
        });
        for (const thread of threads || []) thread.__evex_spriteEvent = {target, original};
    }

    // name is already in capital letters (startHats does that)
    _broadcastReceived(name, threads, onlyTarget) {
        const runtime = this.runtime;
        const started = [];
        if (this._hatExists('whenAnyMsgReceived')) {
            started.push(...(runtime.startHats('pmEventsExpansion_whenAnyMsgReceived', undefined, onlyTarget) || []));
        }
        if (this._hatExists('whenMsgReceived')) {
            runtime.allScriptsByOpcodeDo('pmEventsExpansion_whenMsgReceived', (script, target) => {
                const hat = target.blocks.getBlock(script.blockId);
                const input = hat && hat.inputs.MSG && target.blocks.getBlock(hat.inputs.MSG.block);
                if (!input) return;
                const start = () => {
                    const existing = runtime.threadMap.get(Thread.getIdFromTargetAndBlock(target, script.blockId));
                    const thread = existing ? runtime._restartThread(existing) : runtime._pushThread(script.blockId, target);
                    thread.__evex_message = name;
                    threads.push(thread);
                };
                if (input.opcode === 'text') {
                    if (Cast.toString(input.fields.TEXT.value).toUpperCase() === name) start();
                } else if (input.opcode === 'event_broadcast_menu') {
                    if (Cast.toString(input.fields.BROADCAST_OPTION.value).toUpperCase() === name) start();
                } else {
                    // a reporter: its value is only known after it has run
                    evaluateBlock(runtime, input, target).then(value => {
                        if (Cast.toString(value).toUpperCase() === name) start();
                    });
                }
            }, onlyTarget);
        }
        for (const thread of started) {
            threads.push(thread);
        }
        for (const thread of threads) thread.__evex_message = name;
    }

    // stepUpdates
    _everyOtherFrame() {
        if (this._otherFrame) {
            this.runtime.startHats('pmEventsExpansion_everyOtherFrame');
            this._otherFrame = false;
        } else {
            this._otherFrame = true;
        }
    }

    // order
    orderCategoryBlocks(extensionBlocks) {
        let categoryBlocks = blocks;

        let idx = 0;
        for (const block of extensionBlocks) {
            categoryBlocks = categoryBlocks.replace('%b' + idx + '>', block);
            idx++;
        }

        return [categoryBlocks];
    }

    /**
     * @returns {object} metadata for extension
     */
    getInfo() {
        return {
            id: 'pmEventsExpansion',
            name: 'Events Expansion',
            color1: '#FFBF00',
            color2: '#E6AC00',
            color3: '#CC9900',
            isDynamic: true,
            orderBlocks: this.orderCategoryBlocks,
            blocks: [
                {
                    opcode: 'everyOtherFrame',
                    text: 'every other frame',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    switches: [
                        { isNoop: true },
                        'neverr'
                    ]
                },
                {
                    opcode: 'neverr',
                    text: 'never',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    switches: [
                        'everyOtherFrame',
                        { isNoop: true },
                    ]
                },
                {
                    opcode: 'whenSpriteClicked',
                    text: 'when [SPRITE] clicked',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: "spriteName"
                        }
                    }
                },
                {
                    opcode: 'sendWithData',
                    text: 'broadcast [BROADCAST] with data [DATA]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    }
                },
                {
                    opcode: 'receivedData',
                    text: 'when I receive [BROADCAST] with data',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    hideFromPallete: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            menu: "broadcastMenu"
                        }
                    }
                },
                {
                    opcode: 'isBroadcastReceived',
                    text: 'is message [BROADCAST] received?',
                    blockType: BlockType.BOOLEAN,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    }
                },
                {
                    opcode: 'recievedDataReporter',
                    text: 'recieved data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true
                },
                {
                    opcode: 'broadcastToSprite',
                    text: 'broadcast [BROADCAST] to [SPRITE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: "spriteName"
                        }
                    }
                },
                {
                    opcode: 'broadcastFunction',
                    text: 'broadcast [BROADCAST] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    },
                    switches: [
                        { isNoop: true },
                        'broadcastFunctionArgs',
                        'broadcastThreadCount'
                    ],
                    switchText: 'broadcast and wait'
                },
                {
                    opcode: 'returnFromBroadcastFunc',
                    text: 'return [VALUE]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    disableMonitor: true,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: "1"
                        }
                    }
                },
                {
                    opcode: 'broadcastThreadCount',
                    text: 'broadcast [BROADCAST] and get # of blocks started',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        }
                    },
                    switches: [
                        'broadcastFunction',
                        'broadcastFunctionArgs',
                        { isNoop: true },
                    ],
                    switchText: 'broadcast and get blocks started'
                },
                {
                    opcode: 'broadcastFunctionArgs',
                    text: 'broadcast [BROADCAST] with data [ARGS] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            defaultValue: "your not supposed to see this?"
                        },
                        ARGS: {
                            type: ArgumentType.STRING,
                            defaultValue: "abc"
                        }
                    },
                    switches: [
                        'broadcastFunction',
                        { isNoop: true },
                        'broadcastThreadCount'
                    ],
                    switchText: 'broadcast with data'
                },
                {
                    opcode: 'whenTrueFalse',
                    text: 'when [CONDITION] becomes [STATE]',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    arguments: {
                        CONDITION: {type: ArgumentType.BOOLEAN},
                        STATE: {type: ArgumentType.STRING, menu: 'boolean', defaultValue: 'true'}
                    }
                },
                {
                    opcode: 'whileTrueFalse',
                    text: 'while [CONDITION] is [STATE]',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    arguments: {
                        CONDITION: {type: ArgumentType.BOOLEAN},
                        STATE: {type: ArgumentType.STRING, menu: 'boolean', defaultValue: 'true'}
                    }
                },
                {
                    opcode: 'whenValueChanged',
                    text: 'when [INPUT] is changed',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    arguments: {
                        // no type: encourages placing a block instead of typing a value
                        INPUT: {type: null}
                    }
                },
                {
                    opcode: 'oldValue',
                    text: 'old value',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true
                },
                {
                    opcode: 'everyDuration',
                    text: 'every [DURATION] [TYPE] frames',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    arguments: {
                        DURATION: {type: ArgumentType.NUMBER, defaultValue: 3},
                        TYPE: {type: ArgumentType.STRING, menu: 'frameType', defaultValue: 'project'}
                    }
                },
                {
                    opcode: 'whenKeyAction',
                    text: 'when [KEY_OPTION] key [ACTION]',
                    blockType: BlockType.HAT,
                    isEdgeActivated: true,
                    arguments: {
                        KEY_OPTION: {type: ArgumentType.STRING, menu: 'keyboardButtons', defaultValue: 'space'},
                        ACTION: {type: ArgumentType.STRING, menu: 'keyAction', defaultValue: 'hit'}
                    }
                },
                {
                    opcode: 'whileKeyPressed',
                    text: 'while [KEY_OPTION] key pressed',
                    blockType: BlockType.HAT,
                    isEdgeActivated: false,
                    arguments: {
                        KEY_OPTION: {type: ArgumentType.STRING, menu: 'keyboardButtons', defaultValue: 'space'}
                    }
                },
                {
                    opcode: 'broadcastToTargetAndWait',
                    text: 'broadcast [BROADCAST] to [SPRITE] and wait',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING, defaultValue: "your not supposed to see this?"},
                        SPRITE: {type: ArgumentType.STRING, menu: 'spriteName'}
                    }
                },
                {
                    opcode: 'broadcastDataToTarget',
                    text: 'broadcast [BROADCAST] to [SPRITE] with data [DATA]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING, defaultValue: "your not supposed to see this?"},
                        SPRITE: {type: ArgumentType.STRING, menu: 'spriteName'},
                        DATA: {type: ArgumentType.STRING, defaultValue: 'abc'}
                    }
                },
                {
                    opcode: 'broadcastDataToTargetAndWait',
                    text: 'broadcast [BROADCAST] to [SPRITE] with data [DATA] and wait',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING, defaultValue: "your not supposed to see this?"},
                        SPRITE: {type: ArgumentType.STRING, menu: 'spriteName'},
                        DATA: {type: ArgumentType.STRING, defaultValue: 'abc'}
                    }
                },
                {
                    opcode: 'beforeSave',
                    text: 'before project saves',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: true
                },
                {
                    opcode: 'afterSave',
                    text: 'after project saves',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: true
                },
                {
                    opcode: 'whenScreenChanges',
                    text: 'when [SCREEN] entered',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        SCREEN: {type: ArgumentType.STRING, menu: 'screenTypes'}
                    }
                },
                {
                    opcode: 'whenSpriteDragDrop',
                    text: 'when [SPRITE] is [TYPE]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        SPRITE: {type: ArgumentType.STRING, menu: 'spriteName'},
                        TYPE: {type: ArgumentType.STRING, menu: 'dragTypes'}
                    }
                },
                {
                    opcode: 'whenCostumeChanged',
                    text: 'when costume switches to [COSTUME]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        COSTUME: {type: ArgumentType.STRING, menu: 'costumes'}
                    }
                },
                {
                    opcode: 'whenSpriteListChange',
                    text: 'when [TARGET_TYPE] is [TYPE]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    arguments: {
                        TARGET_TYPE: {type: ArgumentType.STRING, menu: 'targetType'},
                        TYPE: {type: ArgumentType.STRING, menu: 'creationTypes'}
                    }
                },
                {
                    opcode: 'focusedTarget',
                    text: 'sprite [THING]',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    arguments: {
                        THING: {type: ArgumentType.STRING, menu: 'targetValues', defaultValue: 'name'}
                    }
                },
                {
                    opcode: 'whenAnyMsgReceived',
                    text: 'when I receive any message',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: true
                },
                {
                    opcode: 'messageName',
                    text: 'message',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true
                },
                {
                    opcode: 'whenMsgReceived',
                    text: 'when I receive [MSG]',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    shouldRestartExistingThreads: true,
                    arguments: {
                        MSG: {type: ArgumentType.STRING, defaultValue: ''}
                    }
                },
                {
                    opcode: 'forceRunEvent',
                    text: 'force run [NAME] in [TARGET] [TYPE]',
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {type: ArgumentType.STRING, menu: 'eventNames'},
                        TARGET: {type: ArgumentType.STRING, menu: 'targetsRound'},
                        TYPE: {type: ArgumentType.STRING, menu: 'eventRules', defaultValue: 'restart'}
                    }
                },
            ],
            menus: {
                spriteName: "_spriteName",
                broadcastMenu: "_broadcastMenu",
                keyboardButtons: {acceptReporters: true, items: KEYBOARD_KEYS},
                boolean: {acceptReporters: false, items: [{text: 'true', value: 'true'}, {text: 'false', value: 'false'}]},
                keyAction: {acceptReporters: false, items: [{text: 'hit', value: 'hit'}, {text: 'released', value: 'released'}]},
                frameType: {acceptReporters: false, items: [{text: 'project', value: 'project'}, {text: 'animation', value: 'animation'}]},
                screenTypes: {acceptReporters: false, items: [
                    {text: 'fullscreen', value: 'full'},
                    {text: 'smallscreen', value: 'small'},
                    {text: 'default', value: 'default'},
                    {text: 'window fullscreen', value: 'windowFull'},
                    {text: 'window default', value: 'windowDefault'}
                ]},
                dragTypes: {acceptReporters: false, items: [{text: 'dragged', value: 'drag'}, {text: 'dropped', value: 'drop'}]},
                targetType: {acceptReporters: false, items: [{text: 'sprite', value: 'sprite'}, {text: 'clone', value: 'clone'}]},
                creationTypes: {acceptReporters: false, items: [{text: 'created', value: 'create'}, {text: 'deleted', value: 'delete'}]},
                targetValues: {acceptReporters: true, items: [
                    {text: 'name', value: 'name'},
                    {text: 'id', value: 'id'},
                    {text: 'parent id', value: 'parentId'},
                    {text: 'variables', value: 'vars'},
                    {text: 'parent variables', value: 'parentVars'}
                ]},
                eventRules: {acceptReporters: false, items: [
                    {text: 'with restart', value: 'restart'},
                    {text: 'with skipping', value: 'skip'},
                    {text: 'with overlap', value: 'overlap'}
                ]},
                costumes: {acceptReporters: false, items: '_costumes'},
                targetsRound: {acceptReporters: true, items: '_targetsRound'},
                eventNames: {acceptReporters: true, items: '_eventNames'}
            }
        };
    }

    // menus
    _spriteId() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: target.id
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.id
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }
    _spriteName() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: "_stage_"
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.sprite.name
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }
    _broadcastMenu() {
        const emptyMenu = [{ text: '', value: '' }];
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            if (target.isStage) {
                menu.push({
                    text: "stage",
                    value: target.id
                });
                continue;
            }
            menu.push({
                text: target.sprite.name,
                value: target.id
            });
        }
        if (menu.length <= 0) return emptyMenu;
        return menu;
    }

    // menus of the blocks from More Events / Events+
    _costumes() {
        const vm = this.runtime.vm;
        const names = vm && vm.editingTarget ? vm.editingTarget.getCostumes().map(costume => costume.name) : [];
        return names.length > 0 ? names : [''];
    }
    _targetsRound() {
        const menu = [
            {text: 'this sprite', value: '_myself_'},
            {text: 'all sprites', value: '_all_'},
            {text: 'all clones', value: '_clone_'},
            {text: 'main sprites', value: '_main_'},
            {text: 'Stage', value: '_stage_'}
        ];
        for (const target of this.runtime.targets) {
            if (target.isOriginal && !target.isStage) menu.push({text: target.getName(), value: target.getName()});
        }
        return menu;
    }
    _eventNames() {
        const events = Object.assign({}, CORE_EVENTS);
        for (const opcode of Object.keys(this.runtime._hats)) {
            if (events[opcode] || opcode === 'event_whentouchingobject' || opcode === 'event_whenjavascript') continue;
            for (const extension of this.runtime._blockInfo) {
                const block = extension.blocks.find(info => info && info.json && info.json.type === opcode);
                if (block) {
                    events[opcode] = `${extension.name} -- ${block.info.text}`;
                    break;
                }
            }
        }
        this._eventOpcodes = events;
        return Object.values(events);
    }

    // helpers of the blocks from More Events / Events+
    _markSent(broadcast) {
        const broadcastVar = this.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;
    }
    // every clone of a sprite (the stage has just itself)
    _clonesOf(sprite) {
        sprite = Cast.toString(sprite);
        const target = sprite === "_stage_" ?
            this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(sprite);
        return target && target.sprite ? target.sprite.clones : [];
    }
    _startOnClones(broadcast, sprite, data, util) {
        const started = [];
        for (const clone of this._clonesOf(sprite)) {
            const threads = util.startHats("event_whenbroadcastreceived", {
                BROADCAST_OPTION: broadcast
            }, clone) || [];
            for (const thread of threads) {
                if (data !== undefined) thread.__evex_recievedDataa = data;
                started.push(thread);
            }
        }
        return started;
    }
    _waitFor(threads, util) {
        if (threads.some(thread => this.runtime.threads.indexOf(thread) !== -1)) {
            if (threads.every(thread => this.runtime.isWaitingThread(thread))) {
                util.yieldTick();
            } else {
                util.yield();
            }
        }
    }
    _broadcastToClones(args, util, withData, wait) {
        if (wait && util.stackFrame.startedThreads) {
            this._waitFor(util.stackFrame.startedThreads, util);
            return;
        }
        const broadcast = Cast.toString(args.BROADCAST);
        this._markSent(broadcast);
        const data = withData ? Cast.toString(args.DATA) : undefined;
        const started = this._startOnClones(broadcast, args.SPRITE, data, util);
        if (wait) {
            util.stackFrame.startedThreads = started;
            this._waitFor(started, util);
        }
    }
    _matchingTarget(name, util) {
        name = Cast.toString(name);
        if (name === "_all_" || name === "_clone_" || name === "_main_") return name;
        if (name === "_myself_") return util.target;
        if (name === "_stage_") return this.runtime.getTargetForStage();
        return this.runtime.getSpriteTargetByName(name);
    }
    _variablesJSON(variables) {
        const mapped = Object.create(null);
        for (const variable of Object.values(variables)) mapped[variable.name] = variable.value;
        return JSON.stringify(mapped);
    }

    // blocks
    whenTrueFalse(args) {
        const condition = Cast.toBoolean(args.CONDITION);
        return args.STATE === "true" ? condition : !condition;
    }
    whileTrueFalse(args) {
        const condition = Cast.toBoolean(args.CONDITION);
        return args.STATE === "true" ? condition : !condition;
    }
    whenValueChanged(args, util) {
        const lastValues = util.target.__evex_lastValues || (util.target.__evex_lastValues = new Map());
        const id = util.thread.topBlock;
        const value = Cast.toString(args.INPUT);
        if (!lastValues.has(id)) {
            lastValues.set(id, value);
            return false;
        }
        const old = lastValues.get(id);
        if (old === value) return false;
        lastValues.set(id, value);
        util.thread.__evex_oldValue = old;
        return true;
    }
    oldValue(_, util) {
        const old = util.thread.__evex_oldValue;
        return old === undefined ? "" : old;
    }
    everyDuration(args) {
        const type = Cast.toString(args.TYPE) === "animation" ? "animation" : "project";
        if (type !== this._tickType) return false;
        const duration = Math.max(1, Math.round(Cast.toNumber(args.DURATION)));
        return (type === "animation" ? this._animationFrame : this._frame) % duration === 0;
    }
    whenKeyAction(args, util) {
        const key = Cast.toString(args.KEY_OPTION).toLowerCase();
        const pressed = util.ioQuery("keyboard", "getKeyIsDown", [key]);
        return args.ACTION === "released" ? !pressed : pressed;
    }
    whileKeyPressed(args, util) {
        return util.ioQuery("keyboard", "getKeyIsDown", [Cast.toString(args.KEY_OPTION).toLowerCase()]);
    }
    broadcastToTargetAndWait(args, util) {
        this._broadcastToClones(args, util, false, true);
    }
    broadcastDataToTarget(args, util) {
        this._broadcastToClones(args, util, true, false);
    }
    broadcastDataToTargetAndWait(args, util) {
        this._broadcastToClones(args, util, true, true);
    }
    messageName(_, util) {
        const name = util.thread.__evex_message;
        if (name === undefined) return "";
        // the name kept on the thread is in capital letters: look up the one the player sees
        const variable = this.runtime.getTargetForStage().lookupBroadcastByInputValue(name);
        return variable ? variable.name : name;
    }
    focusedTarget(args, util) {
        const event = util.thread.__evex_spriteEvent;
        if (!event) return "";
        const {target, original} = event;
        switch (Cast.toString(args.THING)) {
            case "name": return target.getName() + (target.isOriginal ? "" : " (Clone)");
            case "id": return target.id;
            case "parentId": return original ? original.id : "";
            case "vars": return this._variablesJSON(target.variables);
            case "parentVars": return original ? this._variablesJSON(original.variables) : "";
            default: return "";
        }
    }
    forceRunEvent(args, util) {
        const target = this._matchingTarget(args.TARGET, util);
        if (!target) return;
        if (!this._eventOpcodes) this._eventNames();
        const name = Cast.toString(args.NAME);
        const found = Object.entries(this._eventOpcodes).find(event => event[1] === name);
        if (!found) return;
        const targetFilter = typeof target === "string" ? undefined : target;
        this.runtime.allScriptsByOpcodeDo(found[0], (script, blockTarget) => {
            if (target === "_clone_" && blockTarget.isOriginal) return;
            if (target === "_main_" && !blockTarget.isOriginal) return;
            const id = script.blockId;
            // start at the next block so hats that need a condition still run
            const nextId = blockTarget.blocks.getBlock(id).next;
            const existing = this.runtime.threadMap.get(`${blockTarget.id}&${id}`) ||
                this.runtime.threadMap.get(`${blockTarget.id}&${nextId}`);
            if (existing) {
                if (args.TYPE === "restart") {
                    this.runtime._restartThread(existing);
                    return;
                }
                if (args.TYPE === "skip") return;
            }
            this.runtime._pushThread(nextId, blockTarget);
        }, targetFilter);
    }

    sendWithData(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const data = Cast.toString(args.DATA);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const threads = util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        });
        for (const thread of threads) {
            thread.__evex_recievedDataa = data;
        }
    }
    broadcastToSprite(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const sprite = Cast.toString(args.SPRITE);
        const target = sprite === "_stage_" ?
            this.runtime.getTargetForStage()
            : this.runtime.getSpriteTargetByName(sprite);
        util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        }, target);
    }
    broadcastThreadCount(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        if (broadcastVar) broadcastVar.isSent = true;

        const threads = util.startHats("event_whenbroadcastreceived", {
            BROADCAST_OPTION: broadcast
        });
        return threads.length;
    }
    recievedDataReporter(_, util) {
        return util.thread.__evex_recievedDataa;
    }
    returnFromBroadcastFunc(args, util) {
        util.thread.__evex_returnDataa = args.VALUE;
    }
    isBroadcastReceived(args, util) {
        const broadcast = Cast.toString(args.BROADCAST);
        const broadcastVar = util.runtime.getTargetForStage().lookupBroadcastMsg("", broadcast);
        return Cast.toBoolean(broadcastVar && broadcastVar.isSent);
    }
    broadcastFunction() {
        return; // compiler block
    }
    broadcastFunctionArgs() {
        return; // compiler block
    }
}

module.exports = pmEventsExpansion;
