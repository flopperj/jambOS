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
    /**
     * Constructor
     */
    initialize: function() {
        // initalize our ready queue
        this.readyQueue = new jambOS.OS.ProcessQueue();
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

            // perform a swithc when we the cycles hit our scheduling quantum to
            // simulate the real time execution
            if (!self.readyQueue.isEmpty() && self.processCycles === self.quantum) {
                self.processCycles = 0;
                _Kernel.processManager.currentProcess.timeslice = 0;
                _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
            }
        }
    },
    /**
     * Switches what pracess is to be run next
     * @public
     * @method switchContext
     * @param {jambOS.OS.ProcessControlBlock} process 
     */
    switchContext: function() {
        var self = this;

        var process = _Kernel.processManager.currentProcess;

        // Log our context switch
        _Control.hostLog("Switching Context", "OS");

        console.log("Process: " + process.pid + ", state: " + process.state);
        console.log(_CPU.pc);

        // set our process with appropraite values
        process.set({
            pc: _CPU.pc,
            acc: _CPU.acc,
            xReg: _CPU.xReg,
            yReg: _CPU.yReg,
            zFlag: _CPU.zFlag,
            state: process.state !== "terminated" ? "waiting" : process.state
        });

        // set our previous process
        _Kernel.processManager.set("previousProcess", process);

        // get the next process to execute from ready queue
        var nextProcess = _CPU.scheduler.readyQueue.dequeue();
        console.log("Process: " + nextProcess.pid + ", state: " + nextProcess.state);
        console.log(nextProcess.base);

        // if there is a process available then we'll set it to run
        if (nextProcess) {

            // Add the current process being passed to the ready queue
            if (process !== null && process.state !== "terminated")
                _CPU.scheduler.readyQueue.enqueue(process);

            // change our next process state to running
            nextProcess.set("state", "running");


            // set our current active process and slot
            _Kernel.processManager.set({
                currentProcess: nextProcess,
                activeSlot: nextProcess.slot
            });

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

