/* eslint-disable */
// Desktop fork (docs/EXTENSION-ROADMAP.md step 3): the SharkPool gallery's KeysPlusV2.js, moved into
// the VM as a built-in extension. The code is the gallery file, except: its mouse, key and keybind hats are checked
// only after its pressed keys, mouse buttons, keybinds or tags changed (`pmEdgeHat`; section 128, roadmap step 6b;
// marked "Desktop fork (section 128)").
// Desktop fork (section 259): the blocks that duplicate built-in or More Sensing blocks are removed (mouse button down,
// scrolling, single-key hat, pressed, hit, last / current key, time key pressed); "time [key] key pressed" stays as a helper.
// Desktop fork (extension merges): Key Simulation (CubesterYT/KeySimulation.js) is merged in: "press key", "click mouse
// button" and "move mouse" use this extension's key names and mouse buttons, and what they press also counts for its
// own blocks (pressed keys and mouse buttons, keybinds); marked "Desktop fork (extension merges)".
// It runs inside a function that gives it the gallery's Scratch object (extension-support/desktop-gallery-extension.js)
// and hides the names a bundler would act on (require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename): they are undefined, as in the gallery's <script>.
// Desktop fork (section 154): random numbers and the clock come from the runtime: Math.random, Date.now,
// performance.now and new Date() are Scratch.vm.runtime.pmRandom / pmDateNow / pmPerfNow (new Date(pmDateNow())).
// Desktop fork (section 159): its dialogs, localStorage and window / document event listeners go through
// Scratch.vm.runtime.pmPage, the runtime's door to the page (marked by the name).
module.exports = require('../../extension-support/desktop-gallery-extension')(function (Scratch, require, module, exports, define, global, process, Buffer, setImmediate, __dirname, __filename) {
// Name: Keys+ V2
// ID: enderKeysPlusV2
// Description: Even more powerful and flexible key press detection blocks with some additional features.
// By: StackOverflow
// Original: StackOverflow
// License: MIT & LGPL-3.0

(function(Scratch){
    "use strict";

    if (!Scratch.extensions.unsandboxed) throw new Error("Keys+ V2 must run unsandboxed!");

    const runtime = Scratch.vm.runtime;
    const Cast = Scratch.Cast;

    const _format = {
        toValue: [
            "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
            "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9",
            "KeyA", "KeyB", "KeyC", "KeyD", "KeyE", "KeyF", "KeyG", "KeyH", "KeyI", "KeyJ", "KeyK", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ", "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ",
            "Backquote", "Minus", "Equal", "BracketLeft", "BracketRight", "Backslash", "Semicolon", "Quote", "Comma", "Period", "Slash"
        ],
        toCustomValue: {
            "MetaLeft": "left windows key",
            "MetaRight": "right windows key",
            "ControlLeft": "left control",
            "ControlRight": "right control",
            "AltLeft": "left alt",
            "AltRight": "right alt",
            "ShiftLeft": "left shift",
            "ShiftRight": "right shift",
            "ArrowUp": "up arrow",
            "ArrowDown": "down arrow",
            "ArrowLeft": "left arrow",
            "ArrowRight": "right arrow"
        }
    };
    const _filter = {
        default: [
            "_a", "_b", "_c", "_d", "_e", "_f", "_g", "_h", "_i", "_j", "_k", "_l", "_m",
            "_n", "_o", "_p", "_q", "_r", "_s", "_t", "_u", "_v", "_w", "_x", "_y", "_z",
            "_A", "_B", "_C", "_D", "_E", "_F", "_G", "_H", "_I", "_J", "_K", "_L", "_M",
            "_N", "_O", "_P", "_Q", "_R", "_S", "_T", "_U", "_V", "_W", "_X", "_Y", "_Z",
            "_0", "_1", "_2", "_3", "_4", "_5", "_6", "_7", "_8", "_9",
            "_`", "_~", "_!", "_@", "_#", "_$", "_%", "_^", "_&", "_*",
            "_(", "_)", "_-", "__", "_=", "_+", "_[", "_{", "_]", "_}",
            "_\\", "_|", "_;", "_:", "_'", "\"", "_,", "_<", "_.", "_>",
            "_/", "_?", "_ "
        ],
        shift: [ "_left shift", "_right shift" ],
    };
    function format(_key) {
        const name = _key.code, value = _key.key;
        if (_format.toValue.includes(name)) return "_" + value;
        if (name.startsWith("Numpad")) return "_numpad: " + name.slice(6).toLowerCase();
        if (name in _format.toCustomValue) return "_" + _format.toCustomValue[name];
        return "_" + name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
    }
    const createLabel = (text) => ({ blockType: Scratch.BlockType.LABEL, text: text });

    // Desktop fork (extension merges): Key Simulation's code. A key name of this extension's menu as the browser
    // names the key ("key") and the key's place on the keyboard ("code").
    const SIMULATED_SYMBOLS = {
        "`": "Backquote", "~": "Backquote", "-": "Minus", "_": "Minus", "=": "Equal", "+": "Equal",
        "[": "BracketLeft", "{": "BracketLeft", "]": "BracketRight", "}": "BracketRight", "\\": "Backslash", "|": "Backslash",
        ";": "Semicolon", ":": "Semicolon", "'": "Quote", "\"": "Quote", ",": "Comma", "<": "Comma", ".": "Period", ">": "Period",
        "/": "Slash", "?": "Slash", "!": "Digit1", "@": "Digit2", "#": "Digit3", "$": "Digit4", "%": "Digit5", "^": "Digit6",
        "&": "Digit7", "*": "Digit8", "(": "Digit9", ")": "Digit0"
    };
    const SIMULATED_NAMES = {
        "space": [" ", "Space"], "up arrow": ["ArrowUp", "ArrowUp"], "down arrow": ["ArrowDown", "ArrowDown"],
        "right arrow": ["ArrowRight", "ArrowRight"], "left arrow": ["ArrowLeft", "ArrowLeft"],
        "backspace": ["Backspace", "Backspace"], "enter": ["Enter", "Enter"], "escape": ["Escape", "Escape"], "tab": ["Tab", "Tab"],
        "right shift": ["Shift", "ShiftRight"], "left shift": ["Shift", "ShiftLeft"],
        "right control": ["Control", "ControlRight"], "left control": ["Control", "ControlLeft"],
        "right alt": ["Alt", "AltRight"], "left alt": ["Alt", "AltLeft"],
        "right windows key": ["Meta", "MetaRight"], "left windows key": ["Meta", "MetaLeft"], "context menu": ["ContextMenu", "ContextMenu"],
        "caps lock": ["CapsLock", "CapsLock"], "scroll lock": ["ScrollLock", "ScrollLock"], "num lock": ["NumLock", "NumLock"],
        "insert": ["Insert", "Insert"], "delete": ["Delete", "Delete"], "home": ["Home", "Home"], "end": ["End", "End"],
        "page up": ["PageUp", "PageUp"], "page down": ["PageDown", "PageDown"],
        "numpad: divide": ["/", "NumpadDivide"], "numpad: multiply": ["*", "NumpadMultiply"], "numpad: subtract": ["-", "NumpadSubtract"],
        "numpad: add": ["+", "NumpadAdd"], "numpad: decimal": [".", "NumpadDecimal"], "numpad: enter": ["Enter", "NumpadEnter"]
    };
    const simulatedKey = (name) => {
        if (Object.prototype.hasOwnProperty.call(SIMULATED_NAMES, name)) {
            const [key, code] = SIMULATED_NAMES[name];
            return { key, code };
        }
        const numpad = /^numpad: ([0-9])$/.exec(name);
        if (numpad) return { key: numpad[1], code: "Numpad" + numpad[1] };
        if (/^F([1-9]|1[0-2])$/.test(name)) return { key: name, code: name };
        if (/^[a-zA-Z]$/.test(name)) return { key: name, code: "Key" + name.toUpperCase() };
        if (/^[0-9]$/.test(name)) return { key: name, code: "Digit" + name };
        if (Object.prototype.hasOwnProperty.call(SIMULATED_SYMBOLS, name)) return { key: name, code: SIMULATED_SYMBOLS[name] };
        return { key: name, code: name };
    };
    // This is from the Scratch Addons gamepad addon, which normally could be a problem because it is GPLv3,
    // but GarboMuffin wrote that code so there is no problem.
    let getCanvasSize;
    if (window.ResizeObserver) {
        let canvasWidth = Scratch.vm.runtime.stageWidth;
        let canvasHeight = Scratch.vm.runtime.stageHeight;
        const resize = new ResizeObserver((entries) => {
            for (const entry of entries) {
                canvasWidth = entry.contentRect.width;
                canvasHeight = entry.contentRect.height;
            }
        });
        resize.observe(Scratch.vm.runtime.renderer.canvas);
        getCanvasSize = () => [canvasWidth, canvasHeight];
    } else {
        getCanvasSize = () => {
            const rectangle = Scratch.vm.runtime.renderer.canvas.getBoundingClientRect();
            return [rectangle.width, rectangle.height];
        };
    }
    let simulatedX = 0;
    let simulatedY = 0;
    const postSimulatedMouseData = (data) => {
        const [rectangleWidth, rectangleHeight] = getCanvasSize();
        Scratch.vm.postIOData("mouse", {
            ...data,
            canvasWidth: rectangleWidth,
            canvasHeight: rectangleHeight,
            x: (simulatedX + Scratch.vm.runtime.stageWidth / 2) * (rectangleWidth / Scratch.vm.runtime.stageWidth),
            y: (Scratch.vm.runtime.stageHeight / 2 - simulatedY) * (rectangleHeight / Scratch.vm.runtime.stageHeight),
        });
    };
    // Runs callback after the given seconds; with "and wait" the block waits until then.
    const doLater = (seconds, andWait, callback) => {
        const ms = Cast.toNumber(seconds) * 1000;
        if (Cast.toString(andWait) === "and wait") {
            return new Promise((resolve) => {
                Scratch.vm.runtime.pmSetTimeout(() => {
                    callback();
                    resolve();
                }, ms);
            });
        }
        Scratch.vm.runtime.pmSetTimeout(callback, ms);
        // don't return a Promise at all, otherwise the block waits for 1 frame
    };

    function startKeyEvents(_trigger) {
        runtime.startHats("enderKeysPlusV2_eventKeysPressed", { trigger: _trigger });
        runtime.startHats("enderKeysPlusV2_eventKeybindTriggered", { trigger: _trigger });
    }
    // Desktop fork (section 128): the hats' answers can have changed (pressed keys or mouse buttons, keybinds, tags)
    const hatsChanged = () => runtime.pmEdgeHatsChanged("enderKeysPlusV2");

    class enderKeysPlusV2 {
        constructor() {
            this._settings = {
                "clearOnBlur": true,
                "includeTags": true
            };

            this._tags = {
                "#a": ["a", "A"], "#b": ["b", "B"], "#c": ["c", "C"], "#d": ["d", "D"], "#e": ["e", "E"], "#f": ["f", "F"], "#g": ["g", "G"], "#h": ["h", "H"], "#i": ["i", "I"], "#j": ["j", "J"], "#k": ["k", "K"], "#l": ["l", "L"], "#m": ["m", "M"],
                "#n": ["n", "N"], "#o": ["o", "O"], "#p": ["p", "P"], "#q": ["q", "Q"], "#r": ["r", "R"], "#s": ["s", "S"], "#t": ["t", "T"], "#u": ["u", "U"], "#v": ["v", "V"], "#w": ["w", "W"], "#x": ["x", "X"], "#y": ["y", "Y"], "#z": ["z", "Z"],
                "#letters": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
                "#uppercaseLetters": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
                "#lowercaseLetters": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"],
                "#vowels": ["a", "e", "i", "o", "u"],
                "#consonants": ["b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z"],
                "#numbers": ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
                "#specialCharacters": ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "=", "{", "}", "[", "]", "|", "\\", ":", ";", "'", "\"", "<", ">", ",", ".", "?", "/", "~", "`"],
                "#shift": ["left shift", "right shift"],
                "#alt": ["left alt", "right alt"],
                "#control": ["left control", "right control"],
                "#windowsKey": ["left windows key", "right windows key"],
                "#arrowKeys": ["up arrow", "down arrow", "right arrow", "left arrow"],
                "#functionKeys": ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"],
                "#navigationKeys": ["up arrow", "down arrow", "right arrow", "left arrow", "home", "end", "page up", "page down", "insert", "delete"],
                "#numpad": ["numpad: divide", "numpad: multiply", "numpad: subtract", "numpad: add", "numpad: 0", "numpad: 1", "numpad: 2", "numpad: 3", "numpad: 4", "numpad: 5", "numpad: 6", "numpad: 7", "numpad: 8", "numpad: 9", "numpad: decimal", "numpad: enter"]
            }

            this._keybinds = {};

            this._mouseDown = {};

            this._keysPressed = {};

            this._importError = "None";

            runtime.on("BEFORE_EXECUTE", () => {
                runtime.startHats("enderKeysPlusV2_eventMouseDown", { trigger: "while" });
                startKeyEvents("while");
            });
            // Keys (Desktop fork (extension merges): in methods, which the simulated keys use too)
            Scratch.vm.runtime.pmPage.addEventListener("window", "keydown", (event) => this._onKeyDown(event));
            Scratch.vm.runtime.pmPage.addEventListener("window", "keyup", (event) => this._onKeyUp(event));
            Scratch.vm.runtime.pmPage.addEventListener("window", "blur", () => {
                hatsChanged(); // Desktop fork (section 128)
                if (this._settings["clearOnBlur"]) {
                    this._keysPressed = {};
                    this._mouseDown = {};
                };
            });
            // Mouse (Desktop fork (extension merges): in methods, which the simulated clicks use too)
            Scratch.vm.runtime.pmPage.addEventListener("window", "mousedown", (event) => this._onMouseDown(event.button));
            Scratch.vm.runtime.pmPage.addEventListener("window", "mouseup", (event) => this._onMouseUp(event.button));
        }
        _onKeyDown(event) {
            hatsChanged(); // Desktop fork (section 128)
            const key = format(event);
            if (!this._keysPressed[key]) {
                this._keysPressed[key] = { time: Scratch.vm.runtime.pmDateNow(), code: event.code, value: event.key };
                startKeyEvents("when");
            };
        }
        _onKeyUp(event) {
            hatsChanged(); // Desktop fork (section 128)
            const key = format(event);
            startKeyEvents("after");
            delete this._keysPressed[key];
            this._filter();
        }
        _onMouseDown(button) {
            hatsChanged(); // Desktop fork (section 128)
            if (!this._mouseDown[button]) {
                this._mouseDown[button] = { time: Scratch.vm.runtime.pmDateNow() };
                runtime.startHats("enderKeysPlusV2_eventMouseDown", { trigger: "when" });
            }
        }
        _onMouseUp(button) {
            hatsChanged(); // Desktop fork (section 128)
            runtime.startHats("enderKeysPlusV2_eventMouseDown", { trigger: "after" });
            delete this._mouseDown[button];
        }
        getInfo() {
            return {
                id: "enderKeysPlusV2",
                name: "Keys+ V2",
                docsURI: "https://github.com/Ender-Studio/EnderStudio-Extensions/wiki/Extensions#keys",
                color1: "#647970",
                color2: "#4D5E56",
                blocks: [
                    createLabel("Mouse"),
                    {
                        opcode: "eventMouseDown",
                        blockType: Scratch.BlockType.HAT,
                        text: "[trigger] [button] mouse button is down",
                        isEdgeActivated: false,
                        pmEdgeHat: { signals: ["enderKeysPlusV2"] }, // Desktop fork (section 128)
                        arguments: {
                            trigger: { type: Scratch.ArgumentType.STRING, menu: "eventTriggerCondition" },
                            button: { type: Scratch.ArgumentType.STRING, menu: "mouseButtons" }
                        }
                    },
                    "---",
                    {
                        opcode: "isMouseHit",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [button] mouse button clicked?",
                        arguments: {
                            button: { type: Scratch.ArgumentType.STRING, menu: "mouseButtons" }
                        }
                    },
                    "---",
                    {
                        opcode: "timeMouseDown",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "time [button] mouse button down",
                        arguments: {
                            button: { type: Scratch.ArgumentType.STRING, menu: "mouseButtons" }
                        }
                    },
                    "---",
                    // Desktop fork (extension merges): from Key Simulation
                    {
                        opcode: "clickMouse",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "click [button] mouse button at x: [X] y: [Y] for [SECONDS] seconds and [AND_WAIT]",
                        arguments: {
                            button: { type: Scratch.ArgumentType.STRING, menu: "mouseButtons" },
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.1 },
                            AND_WAIT: { type: Scratch.ArgumentType.STRING, menu: "waitMode" }
                        }
                    },
                    {
                        opcode: "moveMouse",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "move mouse to x: [X] y: [Y]",
                        arguments: {
                            X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
                            Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }
                        }
                    },
                    createLabel("Keys"),
                    {
                        opcode: "eventKeysPressed",
                        blockType: Scratch.BlockType.HAT,
                        text: "[trigger] ［[keys]］ keys is pressed [ordered]",
                        isEdgeActivated: false,
                        pmEdgeHat: { signals: ["enderKeysPlusV2"] }, // Desktop fork (section 128)
                        arguments: {
                            trigger: { type: Scratch.ArgumentType.STRING, menu: "eventTriggerCondition" },
                            ordered: { type: Scratch.ArgumentType.STRING, menu: "orderMode" },
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' }
                        }
                    },
                    "---",
                    {
                        opcode: "isKeysPressed",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "are ［[keys]］ keys pressed [ordered]?",
                        arguments: {
                            ordered: { type: Scratch.ArgumentType.STRING, menu: "orderMode" },
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' }
                        }
                    },
                    "---",
                    {
                        opcode: "isKeysHit",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "are ［[keys]］ keys hit [ordered]?",
                        arguments: {
                            ordered: { type: Scratch.ArgumentType.STRING, menu: "orderMode" },
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' }
                        }
                    },
                    "---",
                    {
                        opcode: "currentKeysPressed",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current keys pressed",
                    },
                    {
                        opcode: "keyPressedProperty",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "current key pressed [property]",
                        disableMonitor: true,
                        arguments: {
                            property: { type: Scratch.ArgumentType.STRING, menu: "keyProperty" }
                        }
                    },
                    "---",
                    {
                        opcode: "timeKeysPressed",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "time ［[keys]］ keys pressed [mode]",
                        disableMonitor: true,
                        arguments: {
                            mode: { type: Scratch.ArgumentType.STRING, menu: "returnMode" },
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' }
                        }
                    },
                    "---",
                    // Desktop fork (extension merges): from Key Simulation
                    {
                        opcode: "pressKey",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "press key [key] for [SECONDS] seconds and [AND_WAIT]",
                        arguments: {
                            key: { type: Scratch.ArgumentType.STRING, menu: "simulatedKeys", defaultValue: "space" },
                            SECONDS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.1 },
                            AND_WAIT: { type: Scratch.ArgumentType.STRING, menu: "waitMode" }
                        }
                    },
                    createLabel("Keybinding"),
                    {
                        opcode: "eventKeybindTriggered",
                        blockType: Scratch.BlockType.HAT,
                        text: "[trigger] [event] is triggered",
                        isEdgeActivated: false,
                        pmEdgeHat: { signals: ["enderKeysPlusV2"] }, // Desktop fork (section 128)
                        arguments: {
                            trigger: { type: Scratch.ArgumentType.STRING, menu: "eventTriggerCondition" },
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    "---",
                    {
                        opcode: "whileKeybindTriggered",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "while [event] is triggered?",
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "whenKeybindTriggered",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "when [event] is triggered?",
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    "---",
                    {
                        opcode: "causeKeybindTriggered",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "cause of [event] triggered",
                        disableMonitor: true,
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "timeKeybindTriggered",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "time [event] is triggered",
                        disableMonitor: true,
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    "---",
                    {
                        opcode: "keybindBindMultiple",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "bind ［[keys]］ keys [mode] as [trigger] to [event]",
                        arguments: {
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' },
                            mode: { type: Scratch.ArgumentType.STRING, menu: "orderMode" },
                            trigger: { type: Scratch.ArgumentType.STRING, defaultValue: "trigger" },
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "keybindBind",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "bind key [key] as [trigger] to [event]",
                        arguments: {
                            key: { type: Scratch.ArgumentType.STRING, menu: "keys" },
                            trigger: { type: Scratch.ArgumentType.STRING, defaultValue: "trigger" },
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "keybindUnbind",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "unbind trigger [trigger] from [event]",
                        arguments: {
                            trigger: { type: Scratch.ArgumentType.STRING, defaultValue: "trigger" },
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    "---",
                    {
                        opcode: "keybindReset",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reset binds of [event]",
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "resetAllKeybinds",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reset all keybindings"
                    },
                    "---",
                    {
                        opcode: "keybindListTriggers",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list triggers of [event]",
                        disableMonitor: true,
                        arguments: {
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    {
                        opcode: "keybindKeysInTrigger",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "keys bound to [trigger] in [event]",
                        disableMonitor: true,
                        arguments: {
                            trigger: { type: Scratch.ArgumentType.STRING, defaultValue: "trigger" },
                            event: { type: Scratch.ArgumentType.STRING, defaultValue: "event" }
                        }
                    },
                    "---",
                    {
                        opcode: "listAllKeybinds",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list all keybindings"
                    },
                    {
                        opcode: "listActiveKeybinds",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list active keybindings"
                    },
                    createLabel("Tags"),
                    {
                        opcode: "createTag",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set value of tag: #[tag] to ［[keys]］",
                        arguments: {
                            tag: { type: Scratch.ArgumentType.STRING, defaultValue: "abc" },
                            keys: { type: Scratch.ArgumentType.STRING, defaultValue: '"a", "b", "c"' }
                        }
                    },
                    "---",
                    {
                        opcode: "deleteTag",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "delete tag: #[tag]",
                        arguments: {
                            tag: { type: Scratch.ArgumentType.STRING, defaultValue: "abc" }
                        }
                    },
                    {
                        opcode: "deleteAllTags",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "delete all tags",
                    },
                    "---",
                    {
                        opcode: "valueOfTag",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "value of tag: #[tag]",
                        arguments: {
                            tag: { type: Scratch.ArgumentType.STRING, defaultValue: "abc" }
                        }
                    },
                    {
                        opcode: "listTags",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "list all tags"
                    },
                    createLabel("Storage"),
                    {
                        opcode: "import",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "import [type] from [json]",
                        arguments: {
                            type: { type: Scratch.ArgumentType.STRING, menu: "data" },
                            json: { type: Scratch.ArgumentType.STRING, defaultValue: "" }
                        }
                    },
                    {
                        opcode: "importError",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "import error"
                    },
                    "---",
                    {
                        opcode: "export",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "export [type]",
                        disableMonitor: true,
                        arguments: {
                            type: { type: Scratch.ArgumentType.STRING, menu: "data" }
                        }
                    },
                    createLabel("Settings"),
                    {
                        opcode: "toggleSetting",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set [setting] to [toggle]",
                        arguments: {
                            setting: { type: Scratch.ArgumentType.STRING, menu: "settings" },
                            toggle: { type: Scratch.ArgumentType.STRING, menu: "toggle" }
                        }
                    },
                    {
                        opcode: "isSettingEnabled",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [setting] enabled?",
                        disableMonitor: true,
                        arguments: {
                            setting: { type: Scratch.ArgumentType.STRING, menu: "settings" }
                        }
                    },
                    "---",
                    {
                        opcode: "resetSettings",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "reset all settings"
                    }
                ],
                menus: {
                    mouseButtons: {
                        items: [
                            { text: "left", value: "0" },
                            { text: "scroll wheel", value: "1" },
                            { text: "right", value: "2" },
                            { text: "back", value: "3" },
                            { text: "forward", value: "4" },
                        ],
                        acceptReporters: false /* Desktop fork (section 265): only its own items work */
                    },
                    keys: { items: "_getKeysMenu", acceptReporters: true },
                    settings: {
                        items: [
                            { text: "clear on blur", value: "clearOnBlur" },
                            { text: "include tags on menu", value: "includeTags" },
                        ]
                    },
                    eventTriggerCondition: { items: ["when", "while", "after"] },
                    keyProperty: { items: ["time", "name", "code", "value"] },
                    returnMode: { items: ["together & in order", "together & ignore order", "individually"] },
                    orderMode: { items: ["together & in order", "together & ignore order"] },
                    toggle: { items: ["enabled", "disabled"] },
                    data: { items: ["all", "tags", "keybinds", "settings"] },
                    // Desktop fork (extension merges): from Key Simulation
                    simulatedKeys: { items: "_getSimulatedKeysMenu", acceptReporters: true },
                    waitMode: {
                        acceptReporters: false /* Desktop fork (section 265): only its own items work */,
                        items: [
                            { text: "continue", value: "without waiting" },
                            { text: "wait", value: "and wait" }
                        ]
                    }
                }
            };
        };
        // Filter
        _filter() { 
            const keysPressed = runtime.ioDevices.keyboard._keysPressed.map(k => k.toLowerCase());
            for (const key in this._keysPressed) {
                const keyName = key.slice(1).toLowerCase();
                if (_filter.shift.includes(key) && !keysPressed.includes("shift")) {
                    delete this._keysPressed["_left shift"];
                    delete this._keysPressed["_right shift"];
                    continue;
                }
                if (!keysPressed.includes(keyName) && (/^_[a-zA-Z]$/.test(key) || _filter.default.includes(key))) {
                    delete this._keysPressed[key];
                }
            }
        }
        // Helper Functions
        _getKeysPressed() {
            const keys = Object.keys(this._keysPressed);
            return keys.map(key => key.slice(1));
        }
        _parse(keys) {
            if (Array.isArray(keys)) return keys.map(key => Cast.toString(key));
            try {
                const parsed = JSON.parse(/^\[.*\]$/.test(keys) ? keys : `[${keys}]`);
                return Array.isArray(parsed) ? parsed.map(key => Cast.toString(key)) : [];
            } catch {
                return [];
            };
        }
        _isKeyPressed(_key, _source) {
            const key = Cast.toString(_key)
            const keysPressed = this._getKeysPressed();
            if (keysPressed.length) keysPressed.unshift("any");
            if (key.startsWith("#")) {
                const source = (this._tags[key] ?? []).find(currentKey => keysPressed.includes(currentKey));
                return _source 
                    ? { source, isPressed: !!source } 
                    : !!source;
            }
            return _source 
                ? { source: key, isPressed: keysPressed.includes(key) } 
                : keysPressed.includes(key);
        }        
        _isKeysPressed(_keys, ordered) {
            const keys = this._parse(_keys);
            if (!keys.length) return false;
            if (ordered) {
                return this._getKeysPressed().filter(key => keys.includes(key)).join() === keys.join();
            }
            return keys.every(key => this._isKeyPressed(key));
        }
        _isKeybindTriggered(_event) { 
            const event = this._keybinds[_event];
            for (const trigger in event) {
                const mode = event[trigger]["mode"];
                const keys = event[trigger]["keys"];
                const triggered = this._isKeysPressed(keys, mode === "together & in order");
                if (triggered) return { isTriggered: true, cause: trigger };
            }
            return { isTriggered: false, cause: undefined };
        }
  
        // Mouse
        eventMouseDown(args) {
            return Cast.toNumber(args.button) in this._mouseDown; // Desktop fork (section 259): was this.isMouseDown(args), a removed block
        }

        isMouseHit(args) {
            const time = this.timeMouseDown(args);
            return time !== 0 && time <= 0.075;
        }

        timeMouseDown(args) {
            const button = this._mouseDown[Cast.toNumber(args.button)];
            return button ? (Scratch.vm.runtime.pmDateNow() - button.time) / 1000 : 0;
        }
        // Scrolling
        // Keys
        eventKeysPressed(args) {
            const ordered = args.ordered === "together & in order";
            return this._isKeysPressed(args.keys, ordered);
        }

        isKeysPressed(args) {
            const ordered = args.ordered === "together & in order";
            return this._isKeysPressed(args.keys, ordered);
        }

        isKeysHit(args) {
            const time = this.timeKeysPressed(args);
            return time !== 0 && time <= 0.075;
        }

        currentKeysPressed() {
            return JSON.stringify(this._getKeysPressed());
        }
        keyPressedProperty(args) {
            const key = this._getKeysPressed().reverse()[0] || "None"; // Desktop fork (section 259): was this.currentKeyPressed(), a removed block
            if (key === "None") return 0;
            switch (args.property) {
                case "time":
                    return this._timeKeyPressed({ key: key });
                case "name":
                    return key;
                case "code":
                    return this._keysPressed["_" + key].code;
                case "value":
                    return this._keysPressed["_" + key].value;
            }
        }

        timeKeysPressed(args) {
            const keys = this._parse(args.keys);
            if (!keys.length) return 0;
            if (args.mode === "individually") {
                return JSON.stringify(keys.map(key => this._timeKeyPressed({ key })));
            }
            const ordered = args.mode === "together & in order";
            const isKeysPressed = this._isKeysPressed(keys, ordered);
            console.log(isKeysPressed)
            if (isKeysPressed) {
                const key = ordered
                    ? keys[keys.length - 1]
                    : this._getKeysPressed()
                        .filter(key => keys.includes(key))
                        .reverse()[0];
                return this._timeKeyPressed({ key: key });
            }
            return 0;
        }
        // Desktop fork (section 259): the removed block "time [key] key pressed", kept as a helper of the blocks above
        _timeKeyPressed(args) {
            const data = this._isKeyPressed(args.key, true);
            const key = this._keysPressed["_" + data.source];
            return key ? (Scratch.vm.runtime.pmDateNow() - key.time) / 1000 : 0;
        }
        // Keybinding
        eventKeybindTriggered(args) {
            return this._isKeybindTriggered(Cast.toString(args.event)).isTriggered;
        }

        whileKeybindTriggered(args) {
            return this._isKeybindTriggered(Cast.toString(args.event)).isTriggered;
        }
        whenKeybindTriggered(args) {
            const time = this.timeKeybindTriggered(args);
            return time !== 0 && time <= 0.075;
        }

        timeKeybindTriggered(args) {
            const event = Cast.toString(args.event);
            const data = this._isKeybindTriggered(event);
            const trigger = this._keybinds[event]?.[data.cause];
            if (!data.isTriggered) return 0;
            return this.timeKeysPressed({ "mode": trigger.mode, "keys": trigger.keys });
        }
        causeKeybindTriggered(args) {
            return this._isKeybindTriggered(Cast.toString(args.event)).cause ?? "";
        }

        keybindBindMultiple(args) {
            hatsChanged(); // Desktop fork (section 128)
            const event = Cast.toString(args.event);
            const trigger = Cast.toString(args.trigger);
            this._keybinds[event] ??= {};
            this._keybinds[event][trigger] = { "mode": args.mode, "keys": this._parse(args.keys) };
        }
        keybindBind(args) {
            hatsChanged(); // Desktop fork (section 128)
            const event = Cast.toString(args.event);
            const trigger = Cast.toString(args.trigger);
            this._keybinds[event] ??= {};
            this._keybinds[event][trigger] = { "mode": "together & in order", "keys": [Cast.toString(args.key)] };
        };
        keybindUnbind(args) {
            hatsChanged(); // Desktop fork (section 128)
            const event = Cast.toString(args.event);
            const trigger = Cast.toString(args.trigger);
            if (!this._keybinds[event]) return;
            delete this._keybinds[event][trigger];
            if (!Object.keys(this._keybinds[event]).length) delete this._keybinds[event];
        }; 

        keybindReset(args) {
            hatsChanged(); // Desktop fork (section 128)
            delete this._keybinds[Cast.toString(args.event)];
        }
        resetAllKeybinds() {
            hatsChanged(); // Desktop fork (section 128)
            this._keybinds = {}
        }

        keybindListTriggers(args) {
            return JSON.stringify(Object.keys(this._keybinds[Cast.toString(args.event)] ?? {}));
        }
        keybindKeysInTrigger(args) {
            const event = this._keybinds[Cast.toString(args.event)];
            return event?.[Cast.toString(args.trigger)]
                ? JSON.stringify(event[args.trigger]["keys"])
                : "[]";
        }

        listAllKeybinds() {
            return JSON.stringify(Object.keys(this._keybinds));
        }
        listActiveKeybinds() {
            return JSON.stringify(Object.keys(this._keybinds).filter(event =>
                this._isKeybindTriggered(event).isTriggered
            ));
        }
        // Tags
        createTag(args) {
            hatsChanged(); // Desktop fork (section 128)
            this._tags["#" + args.tag] = this._parse(args.keys);
        }

        deleteTag(args) {
            hatsChanged(); // Desktop fork (section 128)
            delete this._tags["#" + args.tag];
        }
        deleteAllTags() {
            hatsChanged(); // Desktop fork (section 128)
            this._tags = {}
        }

        valueOfTag(args) {
            return JSON.stringify(this._tags["#" + args.tag] ?? []);
        }
        listTags() {
            return JSON.stringify(Object.keys(this._tags));
        }
        // Settings
        toggleSetting(args) {
            const boolean = (args.toggle === "enabled") ? true : false;
            this._settings[args.setting] = boolean;
        }
        isSettingEnabled(args) {
            return this._settings[args.setting];
        }
        resetSettings() {
            this._settings = {
                "clearOnBlur": true,
                "includeTags": true
            }
        }
        // Storage
        
        import(args) {
            hatsChanged(); // Desktop fork (section 128)
            const result = this.validate(args.type, args.json);
            if (result.error) return this._importError = result.error;
            this._importError = "None";
            switch (args.type) {
                case "tags":
                    this._tags = result.output;
                case "keybinds":
                    this._keybinds = result.output;
                case "settings":
                    this._settings = result.output;
                case "all":
                    this._tags = result.output["tags"];
                    this._keybinds = result.output["keybinds"];
                    this._settings = result.output["settings"];
            }
        }
        importError() {
            return this._importError;
        }

        export(args) {
            switch (args.type) {
                case "tags":
                    return JSON.stringify(this._tags);
                case "keybinds":
                    return JSON.stringify(this._keybinds);
                case "settings":
                    return JSON.stringify(this._settings);
                case "all":
                    return JSON.stringify({ tags: this._tags, keybinds: this._keybinds, settings: this._settings });
            }
        }

        validate(_type, _data) {
            let data = typeof _data === "string" ? _data : JSON.stringify(_data);
            try { data = JSON.parse(data); }
            catch { return { error: "Invalid JSON" }; };

            if (typeof data !== "object" || data === null) return { error: "Invalid JSON" };
            if (Array.isArray(data)) return { error: "Input can't be an Array" }

            if (_type === "tags") {
                for (const tag in data) {
                    if (tag.startsWith("#")) {
                        if (Array.isArray(data[tag])) {
                            const index = data[tag].findIndex(item => typeof item !== "string");
                            if (index !== -1) return { error: `Tags: Expected string at item #${index} of '${tag}'` };
                        } 
                        else { return { error: `Tags: Expected array at '${tag}'` }; }
                    } else { return { error: `Tags: Invalid tag id, reading '${tag}'`} }
                }
            }
            if (_type === "keybinds") {
                for (const event in data) {
                    if (typeof data[event] === "object" && data[event] !== null) {
                        for (const trigger in data[event]) {
                            const triggerData = data[event][trigger]
                            if (typeof triggerData === "object" && trigger) {
                                if (triggerData["mode"]) {
                                    if (triggerData["mode"] === "together & in order" || triggerData["mode"] === "together & ignore order") {
                                        if (triggerData["keys"]) {
                                            if (Array.isArray(triggerData["keys"])) {
                                                const index = triggerData["keys"].findIndex(item => typeof item !== "string");
                                                if (index !== -1) {
                                                    return { error: `Keybinds: Expected string at item #${index} of '${event}/${trigger}'` };
                                                }
                                            } else { return { error: `Keybinds: Expected array at '${event}/${trigger}/keys'` } }
                                        } else { return { error: `Missing 'keys' at '${event}/${trigger}'` } }
                                    } else { return { error: `Keybinds: Invalid input in '${event}/${trigger}/mode'` } }
                                } else { return { error: `Missing 'mode' at '${event}/${trigger}'` } }
                            } else { return { error: `Keybinds: Expected JSON at '${event}/${trigger}'` }}
                        }
                    } else { return { error: `Keybinds: Expected JSON at '${event}'` }; }
                }
            }
            if (_type === "settings") {
                for (const setting in data) {
                    if (typeof data[setting] !== "boolean") {
                        return { error: `Settings: Expected boolean at '${setting}'` };
                    }
                }
            }
            if (_type === "all") {
                if (!("settings" in data)) return { error: "Missing 'settings'" };
                if (!("tags" in data)) return { error: "Missing 'tags'" };
                if (!("keybinds" in data)) return { error: "Missing 'keybinds'" };
        
                const tagsValidation = this.validate("tags", data["tags"]);
                if (tagsValidation.error) return { error: `Tags: ${tagsValidation.error}` };
        
                const keybindsValidation = this.validate("keybinds", data["keybinds"]);
                if (keybindsValidation.error) return { error: `Keybinds: ${keybindsValidation.error}` };
        
                const settingsValidation = this.validate("settings", data["settings"]);
                if (settingsValidation.error) return { error: `Settings: ${settingsValidation.error}` };
            }
        
            return { output: data };
        }        
          
        
        // Desktop fork (extension merges): Key Simulation's blocks. Simulated input goes to the project like real input
        // and also into this extension's own pressed keys and mouse buttons.
        pressKey(args) {
            const { key, code } = simulatedKey(Cast.toString(args.key));
            Scratch.vm.postIOData("keyboard", { key, isDown: true });
            this._onKeyDown({ key, code });
            return doLater(args.SECONDS, args.AND_WAIT, () => {
                Scratch.vm.postIOData("keyboard", { key, isDown: false });
                this._onKeyUp({ key, code });
            });
        }
        clickMouse(args) {
            const button = Cast.toNumber(args.button);
            simulatedX = Cast.toNumber(args.X);
            simulatedY = Cast.toNumber(args.Y);
            postSimulatedMouseData({ isDown: true, button });
            this._onMouseDown(button);
            return doLater(args.SECONDS, args.AND_WAIT, () => {
                postSimulatedMouseData({ isDown: false, button });
                this._onMouseUp(button);
            });
        }
        moveMouse(args) {
            simulatedX = Cast.toNumber(args.X);
            simulatedY = Cast.toNumber(args.Y);
            postSimulatedMouseData({});
        }
        // Menu
        _getSimulatedKeysMenu() {
            return this._getKeysMenu().filter(key => key !== "any" && !key.startsWith("#"));
        }
        _getKeysMenu() {
            const tags =  this._settings["includeTags"] ? Object.keys(this._tags) : [];
            return [
                "space", "up arrow", "down arrow", "right arrow", "left arrow",
                "backspace", "enter", "any", "right shift", "left shift", "right control", "left control", "right alt", "left alt", "right windows key", "left windows key", "context menu", "escape", "tab",
                "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
                "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
                "`", "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "+", "=", "[", "]", "{", "}", "\\", "|", ";", ":", "'", "\"", ",", ".", "/", "?", "<", ">",
                "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "caps lock", "scroll lock", "num lock", "insert", "delete", "home", "end", "page up", "page down",
                "numpad: divide", "numpad: multiply", "numpad: subtract", "numpad: add", "numpad: 0", "numpad: 1", "numpad: 2", "numpad: 3", "numpad: 4", "numpad: 5", "numpad: 6", "numpad: 7", "numpad: 8", "numpad: 9", "numpad: decimal", "numpad: enter",
                ...tags
            ];
        }
    }

    Scratch.extensions.register(new enderKeysPlusV2());
})(Scratch);
});
