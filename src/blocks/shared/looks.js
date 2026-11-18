/**
 * Desktop fork (section 292): what the Looks blocks do, written once for the interpreter and the compiler
 * (src/blocks/shared/index.js explains the format). Moved here from scratch3_looks.js (the interpreter's functions)
 * and jsgen.js / jsexecute.js (the compiler's code and helpers). Not here: blocks whose compiled code already calls
 * the interpreter's own function (say, think, stop talking, bubble font / colour / shape, tint colour, bubble size,
 * costume value), blocks that wait (say / think for secs, switch backdrop and wait: interpreted only).
 */

// The sprite a "[sprite] visible" / "show / hide [sprite]" menu names: myself, the stage or a sprite by name
const OTHER = `option === '_myself_' ? target : option === '_stage_' ? runtime.getTargetForStage() : runtime.getSpriteTargetByName(option)`;

const helpers = {
    coreOtherVisible: `(runtime, target, option) => {
    const other = ${OTHER};
    if (!other) return;
    return other.visible;
}`,
    coreShowOrHide: `(runtime, target, option, show) => {
    const other = ${OTHER};
    if (!other) return;
    other.setVisible(show);
    runtime.ext_scratch3_looks._renderBubble(other);
}`
};

// "go in front of / behind [sprite]": moved by the difference of the two layers (the sprite's own layer counts
// while it moves, hence the 1 on one side)
const targetLayer = (above, below) => `const $other = runtime.getSpriteTargetByName($VISIBLE_OPTION);
if ($other) {
const $myLayer = target.getLayerOrder();
const $otherLayer = $other.getLayerOrder();
if ($otherLayer > $myLayer) target.goForwardLayers($otherLayer - $myLayer${above});
else target.goForwardLayers($otherLayer - $myLayer${below});
}
`;

const blocks = {
    // Desktop fork (section 237): rounded (TurboWarp does the same)
    looks_size: {js: 'Math.round(target.size)'},
    looks_costumenumbername: {menu: 'NUMBER_NAME', otherwise: 'target.getCostumes()[target.currentCostume].name', options: {
        number: '(target.currentCostume + 1)'
    }},
    looks_backdropnumbername: {menu: 'NUMBER_NAME', otherwise: 'stage.getCostumes()[stage.currentCostume].name', options: {
        number: '(stage.currentCostume + 1)'
    }},
    looks_getSpriteVisible: {js: '(target.visible)'},
    looks_getOtherSpriteVisible: {inputs: 'VISIBLE_OPTION:r', js: 'coreOtherVisible(runtime, target, $VISIBLE_OPTION)'},
    looks_getEffectValue: {fields: 'EFFECT:lower', js: '(target.effects.hasOwnProperty($EFFECT) ? coreNumber(target.effects[$EFFECT]) : 0)'},
    looks_layersGetLayer: {js: '(target.getLayerOrder())'},
    looks_stretchGetX: {js: '(target._getRenderedDirectionAndScale().stretch[0])'},
    looks_stretchGetY: {js: '(target._getRenderedDirectionAndScale().stretch[1])'},
    looks_show: {stack: 'target.setVisible(true);\nruntime.ext_scratch3_looks._renderBubble(target);\n'},
    looks_hide: {stack: 'target.setVisible(false);\nruntime.ext_scratch3_looks._renderBubble(target);\n'},
    looks_changeVisibilityOfSpriteShow: {inputs: 'VISIBLE_OPTION:r', stack: 'coreShowOrHide(runtime, target, $VISIBLE_OPTION, true);\n'},
    looks_changeVisibilityOfSpriteHide: {inputs: 'VISIBLE_OPTION:r', stack: 'coreShowOrHide(runtime, target, $VISIBLE_OPTION, false);\n'},
    looks_switchcostumeto: {inputs: 'COSTUME:r', stack: 'runtime.ext_scratch3_looks._setCostume(target, $COSTUME);\n'},
    looks_nextcostume: {stack: 'target.setCostume(target.currentCostume + 1);\n'},
    looks_switchbackdropto: {inputs: 'BACKDROP:r', stack: 'runtime.ext_scratch3_looks._setBackdrop(stage, $BACKDROP);\n'},
    looks_nextbackdrop: {stack: 'runtime.ext_scratch3_looks._setBackdrop(stage, stage.currentCostume + 1, true);\n'},
    looks_seteffectto: {inputs: 'VALUE:n', fields: 'EFFECT:lower', skip: '!target.effects.hasOwnProperty($EFFECT)',
        stack: 'target.setEffect($EFFECT, runtime.ext_scratch3_looks.clampEffect($EFFECT, $VALUE));\n'},
    looks_changeeffectby: {inputs: 'CHANGE:n', fields: 'EFFECT:lower', skip: '!target.effects.hasOwnProperty($EFFECT)',
        stack: 'target.setEffect($EFFECT, runtime.ext_scratch3_looks.clampEffect($EFFECT, $CHANGE + target.effects[$EFFECT]));\n'},
    looks_cleargraphiceffects: {stack: 'target.clearEffects();\nruntime.ext_scratch3_looks._resetBubbles(target);\n'},
    looks_changesizeby: {inputs: 'CHANGE:n', stack: 'target.setSize(target.size + $CHANGE);\n'},
    looks_setsizeto: {inputs: 'SIZE:n', stack: 'target.setSize($SIZE);\n'},
    looks_setStretch: {inputs: 'X:n Y:n', stack: 'target.setStretch($X, $Y);\n'},
    looks_changeStretch: {inputs: 'X:n Y:n', locals: 'x y stretch',
        stack: 'const $x = $X;\nconst $y = $Y;\nconst $stretch = target._getRenderedDirectionAndScale().stretch;\ntarget.setStretch($stretch[0] + $x, $stretch[1] + $y);\n'},
    // Layers: only sprites have them, the stage does nothing
    looks_gotofrontback: {command: true, skip: 'target.isStage', menu: 'FRONT_BACK', otherwise: 'target.goToBack();\n', options: {
        front: 'target.goToFront();\n'
    }},
    looks_goforwardbackwardlayers: {command: true, inputs: 'NUM:n', skip: 'target.isStage', menu: 'FORWARD_BACKWARD',
        otherwise: 'target.goBackwardLayers($NUM);\n', options: {
            forward: 'target.goForwardLayers($NUM);\n'
        }},
    looks_goTargetLayer: {command: true, inputs: 'VISIBLE_OPTION:s', locals: 'other otherLayer myLayer', skip: 'target.isStage',
        menu: 'FORWARD_BACKWARD', otherwise: targetLayer(' - 1', ''), options: {
            infront: targetLayer('', ' + 1')
        }},
    looks_layersSetLayer: {inputs: 'NUM:n', stack: 'target.goForwardLayers($NUM - target.getLayerOrder());\n'}
};

module.exports = {helpers, blocks};
