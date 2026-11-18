/**
 * Desktop fork (section 292): what the Motion blocks do, written once for the interpreter and the compiler
 * (src/blocks/shared/index.js explains the format). Moved here from scratch3_motion.js (the interpreter's functions)
 * and jsgen.js / jsexecute.js (the compiler's code and helpers). Not here: blocks whose compiled code already calls
 * the interpreter's own function (move steps, if on edge bounce, if touching x y bounce, sprite bounce, move to stage
 * side), turn right / left (irgen.js builds them from "point in direction" and the shared "+" / "-"), glides
 * (interpreted only: they wait).
 */

const helpers = {
    // This corresponds to snapToInteger in Scratch 2: a number very close to a whole number becomes that number
    limitPrecision: `value => {
    const rounded = Math.round(value);
    const delta = value - rounded;
    return (Math.abs(delta) < 1e-9) ? rounded : value;
}`,
    coreTurnAround: `(target, degrees, x, y) => {
    const radians = (Math.PI * degrees) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = target.x - x;
    const dy = target.y - y;
    target.setXY((cos * dx) - (sin * dy) + x, (cos * dy) + (sin * dx) + y);
}`,
    // "go to": the mouse, a random position or a sprite (section 155: random numbers from the runtime)
    coreGoTo: `(runtime, target, to) => {
    let x;
    let y;
    if (to === '_mouse_') {
        x = runtime.ioDevices.mouse.getScratchX();
        y = runtime.ioDevices.mouse.getScratchY();
    } else if (to === '_random_') {
        x = Math.round(runtime.stageWidth * (runtime.pmRandom() - 0.5));
        y = Math.round(runtime.stageHeight * (runtime.pmRandom() - 0.5));
    } else {
        const other = runtime.getSpriteTargetByName(String(to));
        if (!other) return;
        x = other.x;
        y = other.y;
    }
    target.setXY(x, y);
}`,
    corePointTowards: `(runtime, target, towards) => {
    let x;
    let y;
    if (towards === '_mouse_') {
        x = runtime.ioDevices.mouse.getScratchX();
        y = runtime.ioDevices.mouse.getScratchY();
    } else if (towards === '_random_') {
        target.setDirection(Math.round(runtime.pmRandom() * 360) - 180);
        return;
    } else {
        const other = runtime.getSpriteTargetByName(String(towards));
        if (!other) return;
        x = other.x;
        y = other.y;
    }
    const dx = x - target.x;
    const dy = y - target.y;
    target.setDirection(90 - (Math.atan2(dy, dx) * 180 / Math.PI));
}`
};

const blocks = {
    motion_xposition: {js: 'limitPrecision(target.x)'},
    motion_yposition: {js: 'limitPrecision(target.y)'},
    motion_direction: {js: 'target.direction'},
    motion_gotoxy: {inputs: 'X:n Y:n', stack: 'target.setXY($X, $Y);\n'},
    motion_setx: {inputs: 'X:n', stack: 'target.setXY($X, target.y);\n'},
    motion_sety: {inputs: 'Y:n', stack: 'target.setXY(target.x, $Y);\n'},
    motion_changexby: {inputs: 'DX:n', stack: 'target.setXY(target.x + $DX, target.y);\n'},
    motion_changeyby: {inputs: 'DY:n', stack: 'target.setXY(target.x, target.y + $DY);\n'},
    // (the inputs first: they could move the sprite)
    motion_changebyxy: {inputs: 'DX:n DY:n', locals: 'dx dy',
        stack: 'const $dx = $DX;\nconst $dy = $DY;\ntarget.setXY(target.x + $dx, target.y + $dy);\n'},
    motion_pointindirection: {inputs: 'DIRECTION:n', stack: 'target.setDirection($DIRECTION);\n'},
    motion_pointtowardsxy: {inputs: 'X:n Y:n', locals: 'x y',
        stack: 'const $x = $X;\nconst $y = $Y;\ntarget.setDirection(90 - (Math.atan2($y - target.y, $x - target.x) * 180 / Math.PI));\n'},
    motion_turnrightaroundxy: {inputs: 'DEGREES:n X:n Y:n', stack: 'coreTurnAround(target, -($DEGREES), $X, $Y);\n'},
    motion_turnleftaroundxy: {inputs: 'DEGREES:n X:n Y:n', stack: 'coreTurnAround(target, $DEGREES, $X, $Y);\n'},
    motion_goto: {inputs: 'TO:r', stack: 'coreGoTo(runtime, target, $TO);\n'},
    motion_pointtowards: {inputs: 'TOWARDS:r', stack: 'corePointTowards(runtime, target, $TOWARDS);\n'},
    motion_setrotationstyle: {fields: 'STYLE', stack: 'target.setRotationStyle($STYLE);\n'}
};

module.exports = {helpers, blocks};
