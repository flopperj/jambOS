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
            if (!self.readyQueue.isEmpty() && self.processCycles >= self.quantum) {
                _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
            }
        }
    }
});

