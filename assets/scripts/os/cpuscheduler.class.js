/**
 *==============================================================================
 * cpuscheduler.class.js
 *    
 * @class CPUScheduler
 * @memberOf jambOS.OS
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.CPUScheduler = jambOS.util.createClass(/** @scope jambOS.OS.CPUScheduler.prototype */ {
    /**
     * @property {int} processCycles
     */
    processCycles: 0,
    /**
     * @property {int} quantum
     */
    quantum: 6,
    /**
     * @property {jambOS.OS.ProcessQueue} readyQueue
     */
    readyQueue: null,
    jobQueue: null,
    /**
     * @property {[jambOS.OS.ProcessControlBlock]} residentList
     */
    residentList: [],
    /**
     * @property {int} currentProcessID
     */
    currentProcessID: 0,
    /**
     * @property {jambOS.OS.ProcessControlBlock} currentProcess
     */
    currentProcess: null,
    /**
     * @property {jambOS.OS.ProcessControlBlock} previousProcess    
     */
    previousProcess: null,
    /**
     * @property {int} currentSchedulingAlgorithm
     */
    currentSchedulingAlgorithm: RR_SCHEDULER,
    /**
     * Constructor
     */
    initialize: function() {
        // initalize our ready queue
        this.readyQueue = new jambOS.OS.ProcessQueue();
        this.jobQueue = new jambOS.OS.ProcessQueue();
    },
    /**
     * Shechules a process
     * @public
     * @method scheduleProcess
     */
    scheduleProcess: function() {
        var self = this;
        if (_CPU.isExecuting) {

            self.processCycles++;

            switch (self.get("currentSchedulingAlgorithm")) {
                case RR_SCHEDULER: // Round Robin

                    // perform a swithc when we the cycles hit our scheduling quantum to
                    // simulate the real time execution
                    if (!self.readyQueue.isEmpty() && self.processCycles === self.quantum) {
                        self.processCycles = 0;
                        _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
                    }
                    break;
                case FCFS_SCHEDULER: // First Come First Served
                    //
                    // perform a swithc when we the cycles hit our scheduling quantum to
                    // simulate the real time execution
                    if (!self.readyQueue.isEmpty() && self.processCycles === MEMORY_BLOCK_SIZE) {
                        self.processCycles = 0;
                        _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
                    }
                    break;
                case PRIORITY_SCHEDULER: // Priority Scheduler
                    break;

            }
        }
    },
    /**
     * Switches what pracess is to be run next
     * @public
     * @method switchContext
     */
    switchContext: function() {
        var self = this;

        var process = self.get("currentProcess");

        // Log our context switch
        _Kernel.trace("Switching Context");

        // set our process with appropraite values
        process.set({
            pc: _CPU.pc,
            acc: _CPU.acc,
            xReg: _CPU.xReg,
            yReg: _CPU.yReg,
            zFlag: _CPU.zFlag,
            state: process.state !== "terminated" || process.state !== "in disk" ? "ready" : process.state
        });

        // get the next process to execute from ready queue
        var nextProcess = self.readyQueue.dequeue();

        console.log(nextProcess.pid + " => " + nextProcess.state);

        // if there is a process available then we'll set it to run
        if (nextProcess) {


            // Add the current process being passed to the ready queue
            if (process !== null && process.state !== "terminated")
                _CPU.scheduler.readyQueue.enqueue(process);

            // handle next process if from disk
            if (nextProcess.state === "in disk") {
                if (!_Kernel.memoryManager.findOpenSlot()) {
                    var processToRollOut = _Kernel.memoryManager.getProcessToRollOut();
                    _Kernel.memoryManager.rollOutProcess(processToRollOut);
                }
                _Kernel.memoryManager.rollInProcess(nextProcess);
            }



            // change our next process state to running
            nextProcess.set("state", "running");

            // set our current active process as well as previous
            self.set({
                previousProcess: process,
                currentProcess: nextProcess
            });

            // set active memory slot
            _Kernel.memoryManager.set("activeSlot", nextProcess.slot);

            // set the appropraite values of the CPU from our process to continue
            // executing
            _CPU.set({
                pc: nextProcess.pc,
                acc: nextProcess.acc,
                xReg: nextProcess.xReg,
                yReg: nextProcess.yReg,
                zFlag: nextProcess.zFlag,
                isExecuting: true
            });

        }
    }
});

