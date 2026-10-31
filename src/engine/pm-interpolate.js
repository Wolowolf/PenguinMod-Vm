// Desktop fork (section 177): "Smooth movement". Only the picture changes: while a frame is drawn between
// two engine steps, drawables sit between where a sprite was and where it is now. Each step starts by
// putting them back, so scripts (touching, bounds) always see the real values.

const scale = [0, 0];

/**
 * Called at the start of a step: puts drawables back and remembers where each sprite is.
 * @param {Runtime} runtime The runtime.
 */
const setupInitialState = runtime => {
    const renderer = runtime.renderer;
    for (const target of runtime.targets) {
        if (target.isStage || !target.visible) {
            target.pmInterpolation = null;
            continue;
        }
        const rendered = target._getRenderedDirectionAndScale();
        const position = target._translatePossitionToCamera();
        let data = target.pmInterpolation;
        if (data && data.moved && renderer) {
            renderer.updateDrawablePosition(target.drawableID, position);
            renderer.updateDrawableDirectionScale(target.drawableID, rendered.direction, rendered.scale, target.transform);
            renderer.updateDrawableEffect(target.drawableID, 'ghost', target.effects.ghost);
        }
        if (!data) data = target.pmInterpolation = {};
        data.moved = false;
        data.x = position[0];
        data.y = position[1];
        data.direction = rendered.direction;
        data.scaleX = rendered.scale[0];
        data.scaleY = rendered.scale[1];
        data.costume = target.currentCostume;
        data.ghost = target.effects.ghost;
    }
};

/**
 * Called before a frame is drawn: moves drawables between the last two steps.
 * @param {Runtime} runtime The runtime.
 * @param {number} time How far from the last step to the next one, 0 to 1.
 */
const interpolate = (runtime, time) => {
    const renderer = runtime.renderer;
    if (!renderer) return;
    for (const target of runtime.targets) {
        const data = target.pmInterpolation;
        if (!data || !target.visible) continue;
        if (target.effects.ghost === 100 && data.ghost === 100) continue;
        const id = target.drawableID;
        const position = target._translatePossitionToCamera();
        const dx = position[0] - data.x;
        const dy = position[1] - data.y;
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
            // A large movement is meant to be instant (a teleport).
            const drawable = renderer._allDrawables[id];
            const bounds = drawable && drawable.getAABB();
            const tolerance = bounds ? Math.min(240, Math.max(50, 1.5 * (bounds.width + bounds.height))) : 50;
            if (Math.sqrt((dx * dx) + (dy * dy)) < tolerance) {
                renderer.updateDrawablePosition(id, [data.x + (dx * time), data.y + (dy * time)]);
                data.moved = true;
            }
        }
        const ghostChange = target.effects.ghost - data.ghost;
        if (ghostChange !== 0 && Math.abs(ghostChange) < 25) {
            renderer.updateDrawableEffect(id, 'ghost', data.ghost + (ghostChange * time));
            data.moved = true;
        }
        if (data.costume !== target.currentCostume) continue;
        const rendered = target._getRenderedDirectionAndScale();
        let direction = rendered.direction;
        let changed = false;
        // Exact 90 degree turns are meant to be instant (tiles).
        if (direction !== data.direction && (direction % 90 !== 0 || data.direction % 90 !== 0)) {
            const to = direction * Math.PI / 180;
            const from = data.direction * Math.PI / 180;
            direction = Math.atan2(
                (Math.sin(to) * time) + (Math.sin(from) * (1 - time)),
                (Math.cos(to) * time) + (Math.cos(from) * (1 - time))
            ) * 180 / Math.PI;
            changed = true;
        }
        scale[0] = rendered.scale[0];
        scale[1] = rendered.scale[1];
        const changeX = scale[0] - data.scaleX;
        const changeY = scale[1] - data.scaleY;
        // A flip or a large change is meant to be instant.
        if ((changeX !== 0 || changeY !== 0) &&
            Math.sign(scale[0]) === Math.sign(data.scaleX) && Math.sign(scale[1]) === Math.sign(data.scaleY) &&
            Math.abs(changeX) < 100 && Math.abs(changeY) < 100) {
            scale[0] = data.scaleX + (changeX * time);
            scale[1] = data.scaleY + (changeY * time);
            changed = true;
        }
        if (changed) {
            renderer.updateDrawableDirectionScale(id, direction, scale, target.transform);
            data.moved = true;
        }
    }
};

module.exports = {
    setupInitialState,
    interpolate
};
