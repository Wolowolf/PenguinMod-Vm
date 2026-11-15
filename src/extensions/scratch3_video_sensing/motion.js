/**
 * @file motion.js
 * Desktop fork (extension merges): the motion part of Scratch's Video Sensing extension (was index.js), used by the
 * merged camera extension (extensions/turbowarp_gallery/lab/face-sensing.js, ID videoSensing): it samples the camera
 * and answers "video [motion / direction] on [sprite / stage]" and "when video motion > []".
 */
const Runtime = require('../../engine/runtime');
const Clone = require('../../util/clone');
const Video = require('../../io/video');
const VideoMotion = require('./library');

/**
 * Sensor attribute video sensor block should report.
 * @readonly
 * @enum {string}
 */
const SensingAttribute = {
    /** The amount of motion. */
    MOTION: 'motion',

    /** The direction of the motion. */
    DIRECTION: 'direction'
};

/**
 * Subject video sensor block should report for.
 * @readonly
 * @enum {string}
 */
const SensingSubject = {
    /** The sensor traits of the whole stage. */
    STAGE: 'Stage',

    /** The senosr traits of the area overlapped by this sprite. */
    SPRITE: 'this sprite'
};

class VideoMotionSensing {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        /**
         * The motion detection algoritm used to power the motion amount and
         * direction values.
         * @type {VideoMotion}
         */
        this.detect = new VideoMotion();

        /**
         * The last millisecond epoch timestamp that the video stream was
         * analyzed.
         * @type {number}
         */
        this._lastUpdate = null;

        if (this.runtime.ioDevices) {
            // Clear target motion state values when the project starts.
            this.runtime.on(Runtime.PROJECT_RUN_START, this.reset.bind(this));

            // Kick off looping the analysis logic.
            this._loop();

            // PMDESKTOP_EDGEHATS (section 127): "when video motion >" can only change while the detector holds
            // camera frames (and in the frame after they were cleared)
            this._pmHadFrames = false;
            this.runtime.on(Runtime.RUNTIME_STEP_START, () => {
                const hasFrames = this.detect.curr !== null;
                if (hasFrames || this._pmHadFrames) this.runtime.pmEdgeHatsChanged('videoSensing');
                this._pmHadFrames = hasFrames;
            });
        }
    }

    /**
     * After analyzing a frame the amount of milliseconds until another frame
     * is analyzed.
     * @type {number}
     */
    static get INTERVAL () {
        return 33;
    }

    /**
     * Dimensions the video stream is analyzed at after its rendered to the
     * sample canvas.
     * @type {Array.<number>}
     */
    static get DIMENSIONS () {
        return [480, 360];
    }

    /**
     * The key to load & store a target's motion-related state.
     * @type {string}
     */
    static get STATE_KEY () {
        return 'Scratch.videoSensing';
    }

    /**
     * The default motion-related state, to be used when a target has no existing motion state.
     * @type {MotionState}
     */
    static get DEFAULT_MOTION_STATE () {
        return {
            motionFrameNumber: 0,
            motionAmount: 0,
            motionDirection: 0
        };
    }

    static get SensingAttribute () {
        return SensingAttribute;
    }

    static get SensingSubject () {
        return SensingSubject;
    }

    /**
     * Reset the extension's data motion detection data. This will clear out
     * for example old frames, so the first analyzed frame will not be compared
     * against a frame from before reset was called.
     */
    reset () {
        this.detect.reset();

        const targets = this.runtime.targets;
        for (let i = 0; i < targets.length; i++) {
            const state = targets[i].getCustomState(VideoMotionSensing.STATE_KEY);
            if (state) {
                state.motionAmount = 0;
                state.motionDirection = 0;
            }
        }
    }

    /**
     * Occasionally step a loop to sample the video, stamp it to the preview
     * skin, and add a frame to be analyzed.
     * @private
     */
    _loop () {
        // Desktop fork (section 156): the runtime's timer
        this.runtime.pmSetTimeout(this._loop.bind(this), Math.max(this.runtime.currentStepTime, VideoMotionSensing.INTERVAL));

        // Add frame to detector
        const time = this.runtime.pmDateNow(); // Desktop fork (section 154): the runtime's clock
        if (this._lastUpdate === null) {
            this._lastUpdate = time;
        }
        const offset = time - this._lastUpdate;
        if (offset > VideoMotionSensing.INTERVAL) {
            const frame = this.runtime.ioDevices.video.getFrame({
                format: Video.FORMAT_IMAGE_DATA,
                dimensions: VideoMotionSensing.DIMENSIONS
            });
            if (frame) {
                this._lastUpdate = time;
                this.detect.addFrame(frame.data);
            }
        }
    }

    /**
     * Get the latest values for video motion state for the given target.
     * @param {RenderedTarget} target - the target to query.
     * @returns {MotionState} the motion state.
     * @private
     */
    _getMotionState (target) {
        let motionState = target.getCustomState(VideoMotionSensing.STATE_KEY);
        if (!motionState) {
            motionState = Clone.simple(VideoMotionSensing.DEFAULT_MOTION_STATE);
            target.setCustomState(VideoMotionSensing.STATE_KEY, motionState);
        }
        return motionState;
    }

    /**
     * Analyze a part of the frame that a target overlaps.
     * @param {Target} target - a target to determine where to analyze
     * @returns {MotionState} the motion state for the given target
     */
    _analyzeLocalMotion (target) {
        const drawable = this.runtime.renderer._allDrawables[target.drawableID];
        const state = this._getMotionState(target);
        this.detect.getLocalMotion(drawable, state);
        return state;
    }

    /**
     * A scratch reporter block handle that analyzes the last two frames and
     * depending on the arguments, returns the motion or direction for the
     * whole stage or just the target sprite.
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {number} the motion amount or direction of the stage or sprite
     */
    videoOn (args, util) {
        this.detect.analyzeFrame();

        let state = this.detect;
        if (args.SUBJECT === SensingSubject.SPRITE) {
            state = this._analyzeLocalMotion(util.target);
        }

        if (args.ATTRIBUTE === SensingAttribute.MOTION) {
            return state.motionAmount;
        }
        return state.motionDirection;
    }

    /**
     * A scratch hat block edge handle that analyzes the last two frames where
     * the target sprite overlaps and if it has more motion than the given
     * reference value.
     * @param {object} args - the block arguments
     * @param {BlockUtility} util - the block utility
     * @returns {boolean} true if the sprite overlaps more motion than the
     *   reference
     */
    whenMotionGreaterThan (args, util) {
        this.detect.analyzeFrame();
        const state = this._analyzeLocalMotion(util.target);
        return state.motionAmount > Number(args.REFERENCE);
    }
}

module.exports = VideoMotionSensing;
