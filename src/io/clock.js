const Timer = require('../util/timer');

class Clock {
    constructor (runtime) {
        this._projectTimer = new Timer({now: () => runtime.currentMSecs});
        this._projectTimer.start();
        this._paused = false;
        /**
         * Reference to the owning Runtime.
         * @type{!Runtime}
         */
        this.runtime = runtime;
    }

    projectTimer () {
        return this._projectTimer.timeElapsed() / 1000;
    }

    pause () {
        this._paused = true;
        this._projectTimer.pause();
    }

    resume () {
        this._paused = false;
        this._projectTimer.play();
    }

    resetProjectTimer () {
        this._projectTimer.start();
    }

    // Desktop fork (section 158): the project timer's state for runtime.pmSaveStates / pmRestoreStates

    pmSaveState () {
        return {
            startTime: this._projectTimer.startTime,
            pausedTime: this._projectTimer._pausedTime,
            paused: this._paused
        };
    }

    pmRestoreState (state, time) {
        // the timer reads runtime.currentMSecs, which is pmDateNow() at the start of each frame
        this._projectTimer.startTime = state.startTime + time.dateShift;
        this._projectTimer._pausedTime = state.pausedTime;
        this._paused = state.paused;
    }
}

module.exports = Clock;
