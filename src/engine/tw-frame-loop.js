// Due to the existence of features such as interpolation and "0 FPS" being treated as "screen refresh rate",
// The VM loop logic has become much more complex

// Use setTimeout to polyfill requestAnimationFrame in Node.js environments
const _requestAnimationFrame = typeof requestAnimationFrame === 'function' ?
    requestAnimationFrame :
    (f => setTimeout(f, 1000 / 60));
const _cancelAnimationFrame = typeof requestAnimationFrame === 'function' ?
    cancelAnimationFrame :
    clearTimeout;

// PMDESKTOP: a minimised window gets no animation frames; a timer takes over until they come back,
// so "screen refresh rate" projects keep running in the background.
const animationFrameWrapper = callback => {
    let id;
    let timer;
    let interval = null;
    const onStall = () => {
        // No frame for 100 ms: step 60 times a second (an interval keeps that rate on Windows,
        // chained timeouts get rounded up to every other clock tick) until frames come back.
        interval = setInterval(callback, 1000 / 60);
        callback();
    };
    const watch = () => {
        id = _requestAnimationFrame(onFrame);
        timer = setTimeout(onStall, 100);
    };
    const onFrame = () => {
        clearTimeout(timer);
        clearInterval(interval);
        interval = null;
        watch();
        callback();
    };
    const cancel = () => {
        _cancelAnimationFrame(id);
        clearTimeout(timer);
        clearInterval(interval);
    };
    watch();
    return {
        cancel
    };
};

class FrameLoop {
    constructor (runtime) {
        this.runtime = runtime;
        this.running = false;
        this.setFramerate(30);

        this.stepCallback = this.stepCallback.bind(this);

        this._stepInterval = null; // PMDESKTOP_STAGE_PATCH: no interpolation (section 21)
        this._stepAnimation = null;
        this._stepCounter = 0;
    }

    setFramerate (fps) {
        this.framerate = fps;
        this._restart();
    }

    stepCallback () {
        this.runtime._step();
    }

    _restart () {
        if (this.running) {
            this.stop();
            this.start();
        }
    }

    start () {
        this.running = true;
        if (this.framerate === 0) {
            this._stepAnimation = animationFrameWrapper(this.stepCallback);
            this.runtime.currentStepTime = 1000 / 60;
        } else {
            this._stepInterval = setInterval(this.stepCallback, 1000 / this.framerate);
            this.runtime.currentStepTime = 1000 / this.framerate;
        }
    }

    stop () {
        this.running = false;
        clearInterval(this._stepInterval);
        if (this._stepAnimation) {
            this._stepAnimation.cancel();
        }
        this._stepAnimation = null;
    }
}

module.exports = FrameLoop;
