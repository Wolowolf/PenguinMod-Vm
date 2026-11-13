const Timer = require('../util/timer');
const Thread = require('./thread');
const execute = require('./execute.js');
const compilerExecute = require('../compiler/jsexecute');

/**
 * Profiler frame name for stepping a single thread.
 * @const {string}
 */
const stepThreadProfilerFrame = 'Sequencer.stepThread';

/**
 * Profiler frame name for the inner loop of stepThreads.
 * @const {string}
 */
const stepThreadsInnerProfilerFrame = 'Sequencer.stepThreads#inner';

/**
 * Profiler frame name for execute.
 * @const {string}
 */
const executeProfilerFrame = 'execute';

/**
 * Profiler frame ID for stepThreadProfilerFrame.
 * @type {number}
 */
let stepThreadProfilerId = -1;

/**
 * Profiler frame ID for stepThreadsInnerProfilerFrame.
 * @type {number}
 */
let stepThreadsInnerProfilerId = -1;

/**
 * Profiler frame ID for executeProfilerFrame.
 * @type {number}
 */
let executeProfilerId = -1;

class Sequencer {
    constructor (runtime) {
        /**
         * A utility timer for timing thread sequencing.
         * @type {!Timer}
         */
        this.timer = new Timer();

        /**
         * Reference to the runtime owning this sequencer.
         * @type {!Runtime}
         */
        this.runtime = runtime;

        this.activeThreadIndex = null;
        this.activeThread = null;

        // Desktop fork (section 250): false while none of the four per-thread events
        // (BEFORE/AFTER_THREAD_CONSIDERED, BEFORE/AFTER_THREAD_STEP) has a listener, so the
        // thread loop skips their lookups. Recomputed at the start of every pass over the
        // threads; a listener added mid-pass turns it on at once through 'newListener'.
        this.pmThreadEvents = false;
        if (runtime && typeof runtime.on === 'function') {
            runtime.on('newListener', name => {
                if (name === 'BEFORE_THREAD_CONSIDERED' || name === 'AFTER_THREAD_CONSIDERED' ||
                    name === 'BEFORE_THREAD_STEP' || name === 'AFTER_THREAD_STEP') {
                    this.pmThreadEvents = true;
                }
            });
        }
    }

    /**
     * Time to run a warp-mode thread, in ms.
     * @type {number}
     */
    static get WARP_TIME () {
        return 500;
    }

    /**
     * Most ticks stepThreads runs between two reads of the clock (section 251).
     * @type {number}
     */
    static get MAX_ITERATIONS_PER_TIME_CHECK () {
        return 64;
    }

    /**
     * Step through all threads in `this.runtime.threads`, running them in order.
     * @return {Array.<!Thread>} List of inactive threads after stepping.
     */
    stepThreads () {
        // Work time is 75% of the thread stepping interval.
        const WORK_TIME = 0.75 * this.runtime.currentStepTime;
        // For compatibility with Scatch 2, update the millisecond clock
        // on the Runtime once per step (see Interpreter.as in Scratch 2
        // for original use of `currentMSecs`)
        this.runtime.updateCurrentMSecs();
        // Start counting toward WORK_TIME.
        this.timer.start();
        // Count of active threads.
        let numActiveThreads = Infinity;
        // Whether `stepThreads` has run through a full single tick.
        let ranFirstTick = false;
        const doneThreads = [];
        // Desktop fork (section 251): the clock is read every few ticks, not after each one (as in TurboWarp).
        let iterationsUntilTimeCheck = 1;
        let iterationsSinceTimeCheck = 0;
        let elapsedAtLastTimeCheck = 0;
        // Conditions for continuing to stepping threads:
        // 1. We must have threads in the list, and some must be active.
        // 2. Time elapsed must be less than WORK_TIME (checked at the end of a tick, adaptively).
        // 3. Either turbo mode, or no redraw has been requested by a primitive.
        while (this.runtime.threads.length > 0 &&
               numActiveThreads > 0 &&
               (this.runtime.turboMode || !this.runtime.redrawRequested)) {
            if (this.runtime.profiler !== null) {
                if (stepThreadsInnerProfilerId === -1) {
                    stepThreadsInnerProfilerId = this.runtime.profiler.idByName(stepThreadsInnerProfilerFrame);
                }
                this.runtime.profiler.start(stepThreadsInnerProfilerId);
            }

            numActiveThreads = 0;
            let stoppedThread = false;
            // Attempt to run each thread one time.
            const threads = this.runtime.threads;
            this.runtime.emit('BEFORE_TICK', threads);
            // Desktop fork (section 250): decide once per pass whether the per-thread events have listeners.
            const events = this.runtime._events;
            this.pmThreadEvents = !!(events.BEFORE_THREAD_CONSIDERED || events.AFTER_THREAD_CONSIDERED ||
                events.BEFORE_THREAD_STEP || events.AFTER_THREAD_STEP);
            for (this.activeThreadIndex = 0; this.activeThreadIndex < threads.length; this.activeThreadIndex++,
                 this.pmThreadEvents && this.runtime._events.AFTER_THREAD_CONSIDERED &&
                 this.runtime.emit('AFTER_THREAD_CONSIDERED', this.activeThread)) {
                const i = this.activeThreadIndex;
                const activeThread = this.activeThread = threads[i];
                // Desktop fork (section 169): these four events fire per script per frame; emit makes an array even with no listener.
                if (this.pmThreadEvents && this.runtime._events.BEFORE_THREAD_CONSIDERED) {
                    this.runtime.emit('BEFORE_THREAD_CONSIDERED', activeThread);
                }
                // Check if the thread is done so it is not executed.
                if (activeThread.stack.length === 0 ||
                    activeThread.status === Thread.STATUS_DONE) {
                    // Finished with this thread.
                    stoppedThread = true;
                    continue;
                }
                if (activeThread.status === Thread.STATUS_PAUSED) {
                    if (activeThread.timer && !activeThread.timer._pausedTime) {
                        activeThread.timer.pause();
                    }
                    continue;
                }
                if (activeThread.status === Thread.STATUS_YIELD_TICK &&
                    !ranFirstTick) {
                    // Clear single-tick yield from the last call of `stepThreads`.
                    activeThread.status = Thread.STATUS_RUNNING;
                }
                if (activeThread.status === Thread.STATUS_RUNNING ||
                    activeThread.status === Thread.STATUS_YIELD) {
                    // Normal-mode thread: step.
                    if (this.runtime.profiler !== null) {
                        if (stepThreadProfilerId === -1) {
                            stepThreadProfilerId = this.runtime.profiler.idByName(stepThreadProfilerFrame);
                        }

                        // Increment the number of times stepThread is called.
                        this.runtime.profiler.increment(stepThreadProfilerId);
                    }
                    try {
                        this.stepThread(activeThread);
                    } catch (error) {
                        this.pmThreadFailed(activeThread, error);
                    }
                    activeThread.warpTimer = null;
                }
                if (activeThread.status === Thread.STATUS_RUNNING) {
                    numActiveThreads++;
                }
                // Check if the thread completed while it just stepped to make
                // sure we remove it before the next iteration of all threads.
                if (activeThread.stack.length === 0 ||
                    activeThread.status === Thread.STATUS_DONE) {
                    // Finished with this thread.
                    stoppedThread = true;
                }
            }
            this.runtime.emit('AFTER_TICK', threads);
            // We successfully ticked once. Prevents running STATUS_YIELD_TICK
            // threads on the next tick.
            ranFirstTick = true;

            if (this.runtime.profiler !== null) {
                this.runtime.profiler.stop();
            }

            // Filter inactive threads from `this.runtime.threads`.
            if (stoppedThread) {
                let nextActiveThread = 0;
                for (let i = 0; i < this.runtime.threads.length; i++) {
                    const thread = this.runtime.threads[i];
                    if (thread.stack.length !== 0 &&
                        thread.status !== Thread.STATUS_DONE) {
                        this.runtime.threads[nextActiveThread] = thread;
                        nextActiveThread++;
                    } else {
                        this.runtime.threadMap.delete(thread.getId());
                        thread.pmLeaveTarget();
                        doneThreads.push(thread);
                    }
                }
                this.runtime.threads.length = nextActiveThread;
            }

            // Read the clock only every few ticks: as many as fit in a quarter of the remaining
            // work time at the measured time per tick, at most 64.
            iterationsSinceTimeCheck++;
            if (--iterationsUntilTimeCheck > 0) continue;
            const elapsed = this.timer.timeElapsed();
            // Written as !(<) so a WORK_TIME that is not a number stops at once, as before.
            if (!(elapsed < WORK_TIME)) break;
            const elapsedSinceLastTimeCheck = elapsed - elapsedAtLastTimeCheck;
            if (elapsedSinceLastTimeCheck > 0) {
                const perIteration = elapsedSinceLastTimeCheck / iterationsSinceTimeCheck;
                const affordable = Math.floor((WORK_TIME - elapsed) / (perIteration * 4));
                iterationsUntilTimeCheck = Math.min(Sequencer.MAX_ITERATIONS_PER_TIME_CHECK, Math.max(1, affordable));
            } else {
                iterationsUntilTimeCheck = Math.min(Sequencer.MAX_ITERATIONS_PER_TIME_CHECK, iterationsSinceTimeCheck * 2);
            }
            elapsedAtLastTimeCheck = elapsed;
            iterationsSinceTimeCheck = 0;
        }

        this.activeThread = null;
        this.activeThreadIndex = null;

        return doneThreads;
    }

    /**
     * Step the requested thread for as long as necessary.
     * @param {!Thread} thread Thread object to step.
     */
    stepThread (thread) {
        if (this.pmThreadEvents && this.runtime._events.BEFORE_THREAD_STEP) this.runtime.emit('BEFORE_THREAD_STEP', thread);
        
        if (thread.isCompiled) {
            compilerExecute(thread);
            if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
            return;
        }

        let currentBlockId = thread.peekStack();
        if (!currentBlockId) {
            // A "null block" - empty branch.
            thread.popStack();

            // Did the null follow a hat block?
            if (thread.stack.length === 0) {
                thread.status = Thread.STATUS_DONE;
                this.runtime.emit('THREAD_FINISHED', thread);
                if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                return;
            }
        }
        // Save the current block ID to notice if we did control flow.
        while ((currentBlockId = thread.peekStack())) {
            let isWarpMode = thread.peekStackFrame().warpMode;
            if (isWarpMode && !thread.warpTimer) {
                // Initialize warp-mode timer if it hasn't been already.
                // This will start counting the thread toward `Sequencer.WARP_TIME`.
                thread.warpTimer = new Timer();
                thread.warpTimer.start();
            }
            // Execute the current block.
            if (this.runtime.profiler !== null) {
                if (executeProfilerId === -1) {
                    executeProfilerId = this.runtime.profiler.idByName(executeProfilerFrame);
                }

                // Increment the number of times execute is called.
                this.runtime.profiler.increment(executeProfilerId);
            }
            if (thread.target === null) {
                this.retireThread(thread);
            } else {
                execute(this, thread);
            }
            thread.blockGlowInFrame = currentBlockId;
            // If the thread has yielded or is waiting, yield to other threads.
            if (thread.status === Thread.STATUS_YIELD) {
                // Mark as running for next iteration.
                thread.status = Thread.STATUS_RUNNING;
                // In warp mode, yielded blocks are re-executed immediately.
                if (isWarpMode &&
                    thread.warpTimer.timeElapsed() <= Sequencer.WARP_TIME) {
                    continue;
                }
                return;
            } else if (thread.status === Thread.STATUS_PROMISE_WAIT) {
                // A promise was returned by the primitive. Yield the thread
                // until the promise resolves. Promise resolution should reset
                // thread.status to Thread.STATUS_RUNNING.
                if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                return;
            } else if (thread.status === Thread.STATUS_YIELD_TICK) {
                // stepThreads will reset the thread to Thread.STATUS_RUNNING
                if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                return;
            } else if (thread.status === Thread.STATUS_DONE) {
                // Nothing more to execute.
                if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                return;
            }
            // If no control flow has happened, switch to next block.
            if (thread.peekStack() === currentBlockId) {
                thread.goToNextBlock();
            }
            // If no next block has been found at this point, look on the stack.
            while (!thread.peekStack()) {
                thread.popStack();

                if (thread.stack.length === 0) {
                    // No more stack to run!
                    thread.status = Thread.STATUS_DONE;
                    this.runtime.emit('THREAD_FINISHED', thread);
                    if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                    return;
                }

                const stackFrame = thread.peekStackFrame();
                isWarpMode = stackFrame.warpMode;

                if (stackFrame.isLoop) {
                    // The current level of the stack is marked as a loop.
                    // Return to yield for the frame/tick in general.
                    // Unless we're in warp mode - then only return if the
                    // warp timer is up.
                    if (!isWarpMode ||
                        thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
                        // Don't do anything to the stack, since loops need
                        // to be re-executed.
                        if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                        return;
                    }
                    // Don't go to the next block for this level of the stack,
                    // since loops need to be re-executed.
                    if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                    continue;

                } else if (stackFrame.waitingReporter) {
                    // This level of the stack was waiting for a value.
                    // This means a reporter has just returned - so don't go
                    // to the next block for this level of the stack.
                    if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
                    return;
                }
                // Get next block of existing block on the stack.
                thread.goToNextBlock();
            }
        }

        if (this.pmThreadEvents && this.runtime._events.AFTER_THREAD_STEP) this.runtime.emit('AFTER_THREAD_STEP', thread);
    }

    /**
     * Step a thread into a block's branch.
     * @param {!Thread} thread Thread object to step to branch.
     * @param {number} branchNum Which branch to step to (i.e., 1, 2).
     * @param {boolean} isLoop Whether this block is a loop.
     */
    stepToBranch (thread, branchNum, isLoop) {
        if (!branchNum) {
            branchNum = 1;
        }
        const currentBlockId = thread.peekStack();
        const branchId = thread.target.blocks.getBranch(
            currentBlockId,
            branchNum
        );
        thread.peekStackFrame().isLoop = isLoop;
        if (branchId) {
            // Push branch ID to the thread's stack.
            thread.pushStack(branchId);
        } else {
            thread.pushStack(null);
        }
    }

    /**
     * Step a procedure.
     * @param {!Thread} thread Thread object to step to procedure.
     * @param {!string} procedureCode Procedure code of procedure to step to.
     */
    stepToProcedure (thread, procedureCode) {
        const definition = thread.target.blocks.getProcedureDefinition(procedureCode);
        if (!definition) {
            return;
        }
        // Check if the call is recursive.
        // If so, set the thread to yield after pushing.
        const isRecursive = thread.isRecursiveCall(procedureCode);
        // To step to a procedure, we put its definition on the stack.
        // Execution for the thread will proceed through the definition hat
        // and on to the main definition of the procedure.
        // When that set of blocks finishes executing, it will be popped
        // from the stack by the sequencer, returning control to the caller.
        thread.pushStack(definition);
        // In known warp-mode threads, only yield when time is up.
        if (thread.peekStackFrame().warpMode &&
            thread.warpTimer.timeElapsed() > Sequencer.WARP_TIME) {
            thread.status = Thread.STATUS_YIELD;
        } else {
            // Look for warp-mode flag on definition, and set the thread
            // to warp-mode if needed.
            const definitionBlock = thread.target.blocks.getBlock(definition);
            const innerBlock = thread.target.blocks.getBlock(
                definitionBlock.inputs.custom_block.block);
            let doWarp = false;
            if (innerBlock && innerBlock.mutation) {
                const warp = innerBlock.mutation.warp;
                if (typeof warp === 'boolean') {
                    doWarp = warp;
                } else if (typeof warp === 'string') {
                    doWarp = JSON.parse(warp);
                }
            }
            if (doWarp) {
                thread.peekStackFrame().warpMode = true;
            } else if (isRecursive) {
                // In normal-mode threads, yield any time we have a recursive call.
                thread.status = Thread.STATUS_YIELD;
            }
        }
    }

    /**
     * Retire a thread in the middle, without considering further blocks.
     * @param {!Thread} thread Thread object to retire.
     */
    /**
     * Desktop fork (section 215): a block of this script threw. Like a compiled script (jsgen.js wraps each one): the
     * error is logged and shown on the script (BLOCK_STACK_ERROR), and only this script stops. Before, the error left
     * the whole step, so every frame ended at this script: the scripts after it barely ran and the stage wasn't drawn.
     * @param {!Thread} thread The thread whose block threw.
     * @param {*} error What it threw.
     */
    pmThreadFailed (thread, error) {
        // eslint-disable-next-line no-console
        console.error(error);
        this.runtime.emit('BLOCK_STACK_ERROR', {
            id: thread.topBlock,
            value: String(error)
        });
        this.retireThread(thread);
    }

    retireThread (thread) {
        thread.stack = [];
        thread.stackFrame = [];
        thread.requestScriptGlowInFrame = false;
        thread.status = Thread.STATUS_DONE;
        this.runtime.emit('THREAD_FINISHED', thread);
        if (thread.isCompiled) {
            thread.procedures = null;
            thread.generator = null;
        }
    }
}

module.exports = Sequencer;
