/**
 * Desktop fork (section 293): what the Sensing blocks do, written once for the interpreter and the compiler
 * (src/blocks/shared/index.js explains the format). Moved here from scratch3_sensing.js (the interpreter's functions)
 * and jsgen.js / jsexecute.js (the compiler's code and helpers). Not here: blocks whose compiled code calls the
 * interpreter's own function (sprite touching sprite / clone, x y of touching sprite, sprite with attribute, loudness,
 * loud, clipboard, operating system, on a phone, "of" with a reporter in its menu), "of" with a fixed sprite and
 * "set of" (the compiler picks the property's code and the value's conversion while it compiles), "ask and wait" (it
 * waits for the answer).
 */

const helpers = {
    // "is number?": a number that does not end in "."
    coreIsNumber: `value => (String(value).trim().endsWith('.') ? false : !isNaN(Number(value)))`,
    coreDirectionTo: `(x2, y2, x1, y1, noClamp) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const direction = 90 - (Math.atan2(dy, dx) * 180 / Math.PI);
    if (noClamp) return direction;
    // MathUtil.wrapClamp(direction, -179, 180)
    return direction - (Math.floor((direction - -179) / 360) * 360);
}`,
    coreDistanceTo: `(x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt((dx * dx) + (dy * dy));
}`,
    coreScrolling: `(runtime, option) => {
    const delta = runtime.ioDevices.mouseWheel.getScrollDelta();
    return option === 'up' ? delta < 0 : option === 'down' ? delta > 0 : false;
}`,
    // Days since January 1st, 2000 (Date.UTC(2000, 0, 1) === 946684800000; the interpreter's old formula with the
    // time zones of both dates came to the same number)
    daysSince2000: `runtime => (runtime.pmDateNow() - 946684800000) / (24 * 60 * 60 * 1000)`,
    // "distance to" a sprite or the mouse; 10000 on the stage or for a sprite that does not exist
    distance: `(target, menu) => {
    if (target.isStage) return 10000;

    let targetX = 0;
    let targetY = 0;
    if (menu === '_mouse_') {
        targetX = target.runtime.ioDevices.mouse.getScratchX();
        targetY = target.runtime.ioDevices.mouse.getScratchY();
    } else {
        const distTarget = target.runtime.getSpriteTargetByName(menu);
        if (!distTarget) return 10000;
        targetX = distTarget.x;
        targetY = distTarget.y;
    }

    const dx = target.x - targetX;
    const dy = target.y - targetY;
    return Math.sqrt((dx * dx) + (dy * dy));
}`,
    // A colour as [r, g, b], 0-255
    colorToList: `color => globalState.Cast.toRgbColorList(color)`
};

const blocks = {
    sensing_touchingobject: {inputs: 'TOUCHINGOBJECTMENU:r', js: 'target.isTouchingObject($TOUCHINGOBJECTMENU)'},
    sensing_touchingcolor: {inputs: 'COLOR:r', js: 'target.isTouchingColor(colorToList($COLOR))'},
    // (the second colour is worked out first)
    sensing_coloristouchingcolor: {inputs: 'COLOR2:r COLOR:r',
        js: 'target.colorIsTouchingColor(colorToList($COLOR2), colorToList($COLOR))'},
    sensing_distanceto: {inputs: 'DISTANCETOMENU:s', js: 'distance(target, $DISTANCETOMENU)'},
    sensing_timer: {js: 'runtime.ioDevices.clock.projectTimer()'},
    sensing_resettimer: {stack: 'runtime.ioDevices.clock.resetProjectTimer();\n'},
    sensing_mousex: {js: 'runtime.ioDevices.mouse.getScratchX()'},
    sensing_mousey: {js: 'runtime.ioDevices.mouse.getScratchY()'},
    sensing_mousedown: {js: 'runtime.ioDevices.mouse.getIsDown()'},
    sensing_mouseclicked: {js: 'runtime.ioDevices.mouse.getIsClicked()'},
    sensing_keypressed: {inputs: 'KEY_OPTION:r', js: 'runtime.ioDevices.keyboard.getKeyIsDown($KEY_OPTION)'},
    sensing_keyhit: {inputs: 'KEY_OPTION:r', js: 'runtime.ioDevices.keyboard.getKeyIsHit($KEY_OPTION)'},
    sensing_mousescrolling: {inputs: 'SCROLL_OPTION:r', js: 'coreScrolling(runtime, $SCROLL_OPTION)'},
    // (the touch device counts fingers from 0)
    sensing_fingerdown: {inputs: 'FINGER_OPTION:n', js: 'runtime.ioDevices.touch.getIsDown($FINGER_OPTION - 1)'},
    sensing_fingertapped: {inputs: 'FINGER_OPTION:n', js: 'runtime.ioDevices.touch.getIsTapped($FINGER_OPTION - 1)'},
    sensing_fingerx: {inputs: 'FINGER_OPTION:n', js: 'runtime.ioDevices.touch.getScratchX($FINGER_OPTION - 1)'},
    sensing_fingery: {inputs: 'FINGER_OPTION:n', js: 'runtime.ioDevices.touch.getScratchY($FINGER_OPTION - 1)'},
    // (section 155: the runtime's clock)
    sensing_current: {menu: 'CURRENTMENU', lowerCase: true, options: {
        year: '(new Date(runtime.pmDateNow()).getFullYear())',
        month: '(new Date(runtime.pmDateNow()).getMonth() + 1)',
        date: '(new Date(runtime.pmDateNow()).getDate())',
        dayofweek: '(new Date(runtime.pmDateNow()).getDay() + 1)',
        hour: '(new Date(runtime.pmDateNow()).getHours())',
        minute: '(new Date(runtime.pmDateNow()).getMinutes())',
        second: '(new Date(runtime.pmDateNow()).getSeconds())',
        timestamp: '(runtime.pmDateNow())'
    }, otherwise: '0'},
    sensing_dayssince2000: {js: 'daysSince2000(runtime)'},
    sensing_answer: {js: 'runtime.ext_scratch3_sensing._answer'},
    sensing_thing_is_number: {inputs: 'TEXT1:r', js: 'coreIsNumber($TEXT1)'},
    sensing_thing_has_number: {inputs: 'TEXT1:s', js: '(/\\d/.test($TEXT1))'},
    sensing_thing_is_text: {inputs: 'TEXT1:r', js: '(isNaN(Number($TEXT1)))'},
    sensing_isUpperCase: {inputs: 'text:r', js: '(/[A-Z]/g.test($text))'},
    sensing_directionTo: {inputs: 'x2:r y2:r x1:r y1:r',
        js: 'coreDirectionTo($x2, $y2, $x1, $y1, runtime.runtimeOptions.disableDirectionClamping)'},
    sensing_distanceTo: {inputs: 'x1:r y1:r x2:r y2:r', js: 'coreDistanceTo($x1, $y1, $x2, $y2)'},
    sensing_getdragmode: {js: '(target.draggable)'},
    sensing_setdragmode: {menu: 'DRAG_MODE', command: true, options: {draggable: 'target.setDraggable(true);\n'},
        otherwise: 'target.setDraggable(false);\n'}
};

module.exports = {helpers, blocks};
