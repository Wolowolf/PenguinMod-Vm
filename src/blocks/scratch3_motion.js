const Cast = require('../util/cast');
const MathUtil = require('../util/math-util');
const Timer = require('../util/timer');
// Desktop fork (section 292): what most Motion blocks do is in shared/motion.js, used by the compiler too
const SharedBlocks = require('./shared');

const STAGE_ALIGNMENT = {
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right',
    TOP: 'top',
    LEFT: 'left',
    RIGHT: 'right',
    MIDDLE: 'middle',
    BOTTOM: 'bottom'
};

class Scratch3MotionBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
        // Desktop fork (section 292)
        this._shared = SharedBlocks.interpreterBlocks(runtime);
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        const primitives = {
            motion_movesteps: this.moveSteps,
            motion_turnright: this.turnRight,
            motion_turnleft: this.turnLeft,
            motion_glidesecstoxy: this.glide,
            motion_glideto: this.glideTo,
            motion_ifonedgebounce: this.ifOnEdgeBounce,
            motion_ifonxybounce: this.ifOnXYBounce,
            motion_ifonspritebounce: this.ifOnSpriteBounce,
            motion_move_sprite_to_scene_side: this.moveToStageSide,
        };
        for (const opcode of Object.keys(this._shared)) {
            if (opcode.startsWith('motion_')) primitives[opcode] = this._shared[opcode];
        }
        return primitives;
    }

    moveToStageSide(args, util) {
        if (!this.runtime.renderer) return;
        const side = Cast.toString(args.ALIGNMENT);
        const stageWidth = this.runtime.stageWidth / 2;
        const stageHeight = this.runtime.stageHeight / 2;
        const snap = [];
        switch (side) {
        case STAGE_ALIGNMENT.TOP:
            util.target.setXY(0, stageHeight);
            snap.push('top');
            break;
        case STAGE_ALIGNMENT.LEFT:
            util.target.setXY(0 - stageWidth, 0);
            snap.push('left');
            break;
        case STAGE_ALIGNMENT.MIDDLE:
            util.target.setXY(0, 0);
            break;
        case STAGE_ALIGNMENT.RIGHT:
            util.target.setXY(stageWidth, 0);
            snap.push('right');
            break;
        case STAGE_ALIGNMENT.BOTTOM:
            util.target.setXY(0, 0 - stageHeight);
            snap.push('bottom');
            break;
        case STAGE_ALIGNMENT.TOP_LEFT:
            util.target.setXY(0 - stageWidth, stageHeight);
            snap.push('top');
            snap.push('left');
            break;
        case STAGE_ALIGNMENT.TOP_RIGHT:
            util.target.setXY(stageWidth, stageHeight);
            snap.push('top');
            snap.push('right');
            break;
        case STAGE_ALIGNMENT.BOTTOM_LEFT:
            util.target.setXY(0 - stageWidth, 0 - stageHeight);
            snap.push('bottom');
            snap.push('left');
            break;
        case STAGE_ALIGNMENT.BOTTOM_RIGHT:
            util.target.setXY(stageWidth, 0 - stageHeight);
            snap.push('bottom');
            snap.push('right');
            break;
        }
        const drawableID = util.target.drawableID;
        const drawable = this.runtime.renderer._allDrawables[drawableID];
        const boundingBox = drawable._skin.getFenceBounds(drawable);
        snap.forEach(side => {
            switch (side) {
            case 'top':
                util.target.setXY(util.target.x, boundingBox.bottom);
                break;
            case 'bottom':
                util.target.setXY(util.target.x, boundingBox.top);
                break;
            case 'left':
                util.target.setXY(boundingBox.right, util.target.y);
                break;
            case 'right':
                util.target.setXY(boundingBox.left, util.target.y);
                break;
            }
        });
    }

    getMonitored () {
        return {
            motion_xposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_xposition`
            },
            motion_yposition: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_yposition`
            },
            motion_direction: {
                isSpriteSpecific: true,
                getId: targetId => `${targetId}_direction`
            }
        };
    }

    moveSteps (args, util) {
        const steps = Cast.toNumber(args.STEPS);
        this._moveSteps(steps, util.target);
    }
    _moveSteps (steps, target) { // used by compiler
        const radians = MathUtil.degToRad(90 - target.direction);
        const dx = steps * Math.cos(radians);
        const dy = steps * Math.sin(radians);
        target.setXY(target.x + dx, target.y + dy);
    }

    getTargetXY (targetName, util) {
        let targetX = 0;
        let targetY = 0;
        if (targetName === '_mouse_') {
            targetX = util.ioQuery('mouse', 'getScratchX');
            targetY = util.ioQuery('mouse', 'getScratchY');
        } else if (targetName === '_random_') {
            const stageWidth = this.runtime.stageWidth;
            const stageHeight = this.runtime.stageHeight;
            // Desktop fork (section 155): random numbers come from the runtime, here and below
            targetX = Math.round(stageWidth * (this.runtime.pmRandom() - 0.5));
            targetY = Math.round(stageHeight * (this.runtime.pmRandom() - 0.5));
        } else {
            targetName = Cast.toString(targetName);
            const goToTarget = this.runtime.getSpriteTargetByName(targetName);
            if (!goToTarget) return;
            targetX = goToTarget.x;
            targetY = goToTarget.y;
        }
        return [targetX, targetY];
    }

    turnRight (args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction + degrees);
    }

    turnLeft (args, util) {
        const degrees = Cast.toNumber(args.DEGREES);
        util.target.setDirection(util.target.direction - degrees);
    }

    pointTowards (args, util) { // called by Hyper Sense V2
        this._shared.motion_pointtowards(args, util);
    }

    glide (args, util) {
        if (util.stackFrame.timer) {
            const timeElapsed = util.stackFrame.timer.timeElapsed();
            if (timeElapsed < util.stackFrame.duration * 1000) {
                // In progress: move to intermediate position.
                const frac = timeElapsed / (util.stackFrame.duration * 1000);
                const dx = frac * (util.stackFrame.endX - util.stackFrame.startX);
                const dy = frac * (util.stackFrame.endY - util.stackFrame.startY);
                util.target.setXY(
                    util.stackFrame.startX + dx,
                    util.stackFrame.startY + dy
                );
                util.yield();
            } else {
                // Finished: move to final position.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
            }
        } else {
            // First time: save data for future use.
            // Desktop fork (section 155): the runtime's clock (a plain Timer reads Date.now)
            util.stackFrame.timer = new Timer({now: () => this.runtime.pmDateNow()});
            util.stackFrame.timer.start();
            util.stackFrame.duration = Cast.toNumber(args.SECS);
            util.stackFrame.startX = util.target.x;
            util.stackFrame.startY = util.target.y;
            util.stackFrame.endX = Cast.toNumber(args.X);
            util.stackFrame.endY = Cast.toNumber(args.Y);
            if (util.stackFrame.duration <= 0) {
                // Duration too short to glide.
                util.target.setXY(util.stackFrame.endX, util.stackFrame.endY);
                return;
            }
            util.yield();
        }
    }

    glideTo (args, util) {
        const targetXY = this.getTargetXY(args.TO, util);
        if (targetXY) {
            this.glide({SECS: args.SECS, X: targetXY[0], Y: targetXY[1]}, util);
        }
    }

    ifOnEdgeBounce (args, util) {
        this._ifOnEdgeBounce(util.target);
    }
    _ifOnEdgeBounce (target) { // used by compiler
        const stageWidth = this.runtime.stageWidth;
        const stageHeight = this.runtime.stageHeight;
        // Desktop fork (section 172): far from every edge the exact outline is not needed
        if (target.renderer && this.runtime.renderer.pmIsWellInside(target.drawableID, stageWidth / 2, stageHeight / 2)) {
            return;
        }
        const bounds = target.getBounds();
        if (!bounds) {
            return;
        }
        // Measure distance to edges.
        // Values are positive when the sprite is far away,
        // and clamped to zero when the sprite is beyond.
        const distLeft = Math.max(0, (stageWidth / 2) + bounds.left);
        const distTop = Math.max(0, (stageHeight / 2) - bounds.top);
        const distRight = Math.max(0, (stageWidth / 2) - bounds.right);
        const distBottom = Math.max(0, (stageHeight / 2) + bounds.bottom);
        // Find the nearest edge.
        let nearestEdge = '';
        let minDist = Infinity;
        if (distLeft < minDist) {
            minDist = distLeft;
            nearestEdge = 'left';
        }
        if (distTop < minDist) {
            minDist = distTop;
            nearestEdge = 'top';
        }
        if (distRight < minDist) {
            minDist = distRight;
            nearestEdge = 'right';
        }
        if (distBottom < minDist) {
            minDist = distBottom;
            nearestEdge = 'bottom';
        }
        if (minDist > 0) {
            return; // Not touching any edge.
        }
        // Point away from the nearest edge.
        const radians = MathUtil.degToRad(90 - target.direction);
        let dx = Math.cos(radians);
        let dy = -Math.sin(radians);
        if (nearestEdge === 'left') {
            dx = Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'top') {
            dy = Math.max(0.2, Math.abs(dy));
        } else if (nearestEdge === 'right') {
            dx = 0 - Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'bottom') {
            dy = 0 - Math.max(0.2, Math.abs(dy));
        }
        const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
        target.setDirection(newDirection);
        // Keep within the stage.
        const fencedPosition = target.keepInFence(target.x, target.y);
        target.setXY(fencedPosition[0], fencedPosition[1]);
    }
    ifOnXYBounce(args, util, _, __, ___, touchingCondition) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const target = util.target;
        const bounds = target.getBounds();
        if (!bounds) {
            return;
        }
        // Check to see if the point is inside the bounding box.
        const xInBounds = (x >= bounds.left) && (x <= bounds.right);
        const yInBounds = (y >= bounds.bottom) && (y <= bounds.top);
        if (touchingCondition !== true) {
            if (!(xInBounds && yInBounds)) {
                return; // Not inside the bounding box.
            }
        }
        // Find the distance to the point for all sides.
        // We use this to figure out which side to bounce on.
        let nearestEdge = '';
        let minDist = Infinity;
        for (let i = 0; i < 4; i++) {
            const sides = ['left', 'top', 'right', 'bottom'];
            let distx;
            let disty;
            switch (sides[i]) {
            case 'left':
            case 'right':
                distx = x - bounds[sides[i]];
                disty = y - target.y;
                break;
            case 'top':
            case 'bottom':
                distx = x - target.x;
                disty = y - bounds[sides[i]];
                break;
            }
            const distance = Math.sqrt((distx * distx) + (disty * disty));
            if (distance < minDist) {
                minDist = distance;
                nearestEdge = sides[i];
            }
        }
        // Point away from the nearest edge.
        const radians = MathUtil.degToRad(90 - target.direction);
        let dx = Math.cos(radians);
        let dy = -Math.sin(radians);
        if (nearestEdge === 'left') {
            dx = Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'top') {
            dy = Math.max(0.2, Math.abs(dy));
        } else if (nearestEdge === 'right') {
            dx = 0 - Math.max(0.2, Math.abs(dx));
        } else if (nearestEdge === 'bottom') {
            dy = 0 - Math.max(0.2, Math.abs(dy));
        }
        const newDirection = MathUtil.radToDeg(Math.atan2(dy, dx)) + 90;
        target.setDirection(newDirection);
        // Keep within the stage.
        const fencedPosition = target.keepInFence(target.x, target.y);
        target.setXY(fencedPosition[0], fencedPosition[1]);
    }
    ifOnSpriteBounce (args, util) {
        if (args.SPRITE === '_mouse_') {
            const x = util.ioQuery('mouse', 'getScratchX');
            const y = util.ioQuery('mouse', 'getScratchY');
            return this.ifOnXYBounce({ X: x, Y: y }, util);
        } else if (args.SPRITE === '_random_') {
            const stageWidth = this.runtime.stageWidth;
            const stageHeight = this.runtime.stageHeight;
            const x = Math.round(stageWidth * (this.runtime.pmRandom() - 0.5));
            const y = Math.round(stageHeight * (this.runtime.pmRandom() - 0.5));
            return this.ifOnXYBounce({ X: x, Y: y }, util);
        } 
        const spriteName = Cast.toString(args.SPRITE);
        const bounceTarget = this.runtime.getSpriteTargetByName(spriteName);
        if (!bounceTarget) return;
        const point = util.target.spriteTouchingPoint(spriteName);
        if (!point) return;
        return this.ifOnXYBounce({ X: point[0], Y: point[1] }, util);
        
    }

}

module.exports = Scratch3MotionBlocks;
