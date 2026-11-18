/**
 * Desktop fork (section 294): what the Operators, Motion and Sensing Expansion blocks do, written once for the
 * interpreter (the extensions' methods call these functions) and the compiler (jsgen.js writes the text inline: the
 * IR kinds pmInline.* of section 140, and the Operators Expansion's own compiler code in getCompileInfo). Format:
 * shared/index.js. Where the extension's function and the compiled code differed, the compiled code was kept:
 * "simplify ratio" uses the helper's gcd, "current key pressed" String() instead of Cast.toString (the same for keys).
 */
module.exports = {
    helpers: {
        pmxIsInteger: 'num => Math.trunc(num) === num',
        pmxIsPrime: `number => {
    number = Math.trunc(number);
    if (number <= 1 || !Number.isFinite(number)) return false;
    for (let i = 2; i * i <= number; i++) {
        if (number % i === 0) return false;
    }
    return true;
}`,
        pmxBetween: `(number, min, max) => {
    if (max < min) {
        const switchover = max;
        max = min;
        min = switchover;
    }
    return (number <= max) && (number >= min);
}`,
        pmxPartOfRatio: `(part, ratio) => {
    part = part.toLowerCase();
    if (!ratio.includes(":")) return "";
    const split = ratio.split(":");
    return globalState.Cast.toNumber(split[Number(part === "last")]);
}`,
        pmxSimplifyRatio: `ratio => {
    if (!ratio.includes(":")) return "";
    const split = ratio.split(":");
    const first = globalState.Cast.toNumber(split[0]);
    const last = globalState.Cast.toNumber(split[1]);
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const divisor = gcd(first, last);
    return globalState.Cast.toNumber(first / divisor) + ":" + globalState.Cast.toNumber(last / divisor);
}`,
        pmxTextAfter: `(text, base) => {
    const idx = base.indexOf(text);
    if (idx < 0) return "";
    return base.substring(idx + text.length);
}`,
        pmxTextBefore: `(text, base) => {
    const idx = base.indexOf(text);
    if (idx < 0) return "";
    return base.substring(0, idx);
}`,
        pmxDirectionTo: '(target, x, y) => (180 / Math.PI) * Math.atan2(x - target.x, y - target.y)',
        pmxDistanceTo: '(target, x, y) => Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2)',
        pmxSpriteSize: `(runtime, target, what) => {
    if (what === "width" || what === "height") {
        const bounds = runtime.renderer.getBounds(target.drawableID);
        return Math.ceil(what === "width" ? bounds.width : bounds.height);
    }
    const costume = target.sprite.costumes[target.currentCostume];
    return Math.ceil(what === "costume width" ? costume.size[0] : costume.size[1]);
}`,
        pmxCurrentKey: `runtime => {
    const keys = runtime.ioDevices.keyboard.getAllKeysPressed();
    const key = keys[keys.length - 1];
    if (!key) return "";
    return String(key).toLowerCase();
}`,
        pmxKeyHeld: `(runtime, key) => {
    const keyTimestamp = runtime.ioDevices.keyboard.getKeyTimestamp(key);
    if (keyTimestamp === 0) return 0;
    return (runtime.pmDateNow() - keyTimestamp) / 1000;
}`,
        pmxFence: `(runtime, target) => {
    const newpos = runtime.renderer.getFencedPositionOfDrawable(target.drawableID, [target.x, target.y]);
    target.setXY(newpos[0], newpos[1]);
}`,
        pmxStepTowards: `(target, steps, x, y) => {
    const val = steps / Math.sqrt((x - target.x) ** 2 + (y - target.y) ** 2);
    if (val >= 1) {
        target.setXY(x, y);
    } else {
        target.setXY((x - target.x) * val + target.x, (y - target.y) * val + target.y);
    }
}`,
        pmxTweenTowards: `(target, val, x, y) => {
    target.setXY((x - target.x) * (val / 100) + target.x, (y - target.y) * (val / 100) + target.y);
}`
    },
    blocks: {
        // Operators Expansion
        pmOperatorsExpansion_isNumberMultipleOf: {inputs: 'NUM:n MULTIPLE:n', js: '(($NUM % $MULTIPLE) === 0)'},
        pmOperatorsExpansion_isInteger: {inputs: 'NUM:n', js: 'pmxIsInteger($NUM)'},
        pmOperatorsExpansion_isPrime: {inputs: 'NUM:n', js: 'pmxIsPrime($NUM)'},
        pmOperatorsExpansion_isEven: {inputs: 'NUM:n', js: '($NUM % 2 == 0)'},
        pmOperatorsExpansion_betweenNumbers: {inputs: 'NUM:n MIN:n MAX:n', js: 'pmxBetween($NUM, $MIN, $MAX)'},
        // (PART is a fixed menu: a field since section 265, given to the compiled code as a text constant)
        pmOperatorsExpansion_partOfRatio: {inputs: 'PART:s RATIO:s', js: 'pmxPartOfRatio($PART, $RATIO)'},
        pmOperatorsExpansion_simplifyRatio: {inputs: 'RATIO:s', js: 'pmxSimplifyRatio($RATIO)'},
        pmOperatorsExpansion_pi: {js: '(Math.PI)'},
        pmOperatorsExpansion_euler: {js: '(Math.E)'},
        pmOperatorsExpansion_infinity: {js: '(Infinity)'},
        pmOperatorsExpansion_truncateNumber: {inputs: 'NUM:n', js: 'Math.trunc($NUM)'},
        pmOperatorsExpansion_textAfter: {inputs: 'TEXT:s BASE:s', js: 'pmxTextAfter($TEXT, $BASE)'},
        pmOperatorsExpansion_textBefore: {inputs: 'TEXT:s BASE:s', js: 'pmxTextBefore($TEXT, $BASE)'},
        pmOperatorsExpansion_exactlyEqual: {inputs: 'ONE:s TWO:s', js: '($ONE === $TWO)'},
        // (the extension's getCompileInfo: compiled, the second input is worked out only when it is needed)
        pmOperatorsExpansion_orIfFalsey: {inputs: 'ONE:r TWO:r', js: '($ONE || $TWO)'},
        pmOperatorsExpansion_ifIsTruthy: {inputs: 'ONE:b TWO:r', js: '($ONE && $TWO)'},
        pmOperatorsExpansion_speedToPitch: {inputs: 'SPEED:n', js: '((1200 * Math.log2($SPEED)) / 10)'},
        pmOperatorsExpansion_pitchToSpeed: {inputs: 'PITCH:n', js: '(Math.pow(2, ($PITCH * 10) / 1200))'},
        pmOperatorsExpansion_atan2: {inputs: 'X:n Y:n', js: '(Math.atan2(($Y * 180) / Math.PI, ($X * 180) / Math.PI))'},

        // Motion Expansion
        pmMotionExpansion_rotationStyle: {js: '(target.rotationStyle)'},
        pmMotionExpansion_directionto: {inputs: 'X:n Y:n', js: 'pmxDirectionTo(target, $X, $Y)'},
        pmMotionExpansion_distanceto: {inputs: 'X:n Y:n', js: 'pmxDistanceTo(target, $X, $Y)'},
        // (WHAT is a fixed menu, a field; any other value answers undefined)
        pmMotionExpansion_spritewh: {menu: 'WHAT', options: {
            'width': 'pmxSpriteSize(runtime, target, "width")',
            'height': 'pmxSpriteSize(runtime, target, "height")',
            'costume width': 'pmxSpriteSize(runtime, target, "costume width")',
            'costume height': 'pmxSpriteSize(runtime, target, "costume height")'
        }, otherwise: 'undefined'},
        pmMotionExpansion_fence: {stack: 'pmxFence(runtime, target);\n'},
        pmMotionExpansion_steptowards: {inputs: 'STEPS:n X:n Y:n', stack: 'pmxStepTowards(target, $STEPS, $X, $Y);\n'},
        pmMotionExpansion_tweentowards: {inputs: 'PERCENT:n X:n Y:n', stack: 'pmxTweenTowards(target, $PERCENT, $X, $Y);\n'},

        // Sensing Expansion
        pmSensingExpansion_packaged: {js: '(runtime.isPackagedProject)'},
        pmSensingExpansion_spriteName: {js: '(target.getName())'},
        pmSensingExpansion_currentMillisecond: {js: '(runtime.pmDateNow() % 1000)'},
        pmSensingExpansion_maxSpriteLayers: {js: '(runtime.renderer._drawList.length - 1)'},
        pmSensingExpansion_currentKeyPressed: {js: 'pmxCurrentKey(runtime)'},
        pmSensingExpansion_getLastKeyPressed: {js: '(runtime.ioDevices.keyboard.getLastKeyPressed())'},
        pmSensingExpansion_amountOfTimeKeyHasBeenHeld: {inputs: 'KEY:s', js: 'pmxKeyHeld(runtime, $KEY)'},
        pmSensingExpansion_getButtonIsDown: {inputs: 'MOUSE_BUTTON:n', js: '(runtime.ioDevices.mouse.getButtonIsDown($MOUSE_BUTTON))'}
    }
};
