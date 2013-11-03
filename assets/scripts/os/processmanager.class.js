/**
 *==============================================================================
 * Class ProcessManager
 *    
 * @class ProcessManager
 * @memberOf jambOS 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.ProcessManager = jambOS.util.createClass({
    type: "processmanager",
    /**
     * @property {[jambOS.OS.ProcessControlBlock]} processes
     */
    processes: [],
    /**
     * @property {int} currentProcessID
     */
    currentProcessID: 0,
    /**
     * @property {jambOS.OS.ProcessControlBlock} currentProcess
     */
    currentProcess: null,
    readyQueue: [],
    processCycles: 0,
    schedulingQuantum: 6,
    /**
     * Constructor
     * @param {object} options
     * @returns {jambOS.OS.ProcessManager}
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);

        return this;
    },
    /**
     * Executes a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    execute: function(pcb) {
        pcb.set("state", "ready");
        _Kernel.interruptHandler(PROCESS_INITIATION_IRQ, pcb);
    },
    scheduleProcess: function() {
        var self = this;
        if (_CPU.isExecuting) {
            self.processCycles++;

            // perform a swithc when we the cycles hit our scheduling quantum to
            // simulate the real time execution
            if (self.readyQueue.length && self.processCycles >= self.schedulingQuantum) {
                _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
            } else if (self.readyQueue.length) {
                var process = self.readyQueue[0];
                process.set("state", "running");
                self.set("currentProcess", process);
            }
        }
    },
    /**
     * Loads program to memory
     * 
     * @param {string} program
     * @returns {jambOS.OS.ProcessControlBlock} pcb
     */
    load: function(program) {

        // enable stepover button
        $("#btnStepOver").prop("disabled", false);

        var slots = _Kernel.memoryManager.get("slots");
        var activeSlot = _Kernel.memoryManager.get("activeSlot");

        // move up memory slot when program has been loaded
        if (activeSlot < ALLOCATABLE_MEMORY_SLOTS)
            _Kernel.memoryManager.activeSlot++;
        else
            return _Kernel.trapError("No memory is available! \n Deallocate processes from memory before proceeding!", false);

        var base = slots[activeSlot].base;
        var limit = slots[activeSlot].limit;

        _Kernel.memoryManager.memory.insert(base, program);

        var pid = this.currentProcessID++;
        var pcb = new jambOS.OS.ProcessControlBlock({
            pid: pid,
            pc: 0,
            base: base,
            limit: limit,
            xReg: 0,
            yReg: 0,
            zFlag: 0,
            slot: activeSlot
        });

        this.processes.push(pcb);
        _Kernel.memoryManager.allocate(pcb);

        return pcb;
    },
    /**
     * Unloads process from memory
     * 
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    unload: function(pcb) {

        _Kernel.memoryManager.deallocate(pcb);
        var index = this.processes.indexOf(pcb);
        if (index > -1)
            this.processes.splice(index, 1);
    },
    /**
     * Updates cpu status display
     * @param {jambOS.host.Cpu} cpu
     */
    updateCpuStatusDisplay: function(cpu) {
        var pc = cpu.pc;
        var acc = cpu.acc;
        var xReg = cpu.xReg;
        var yReg = parseInt(cpu.yReg, 16);
        var zFlag = cpu.zFlag;

        $("#cpuStatus .pc").text(pc);
        $("#cpuStatus .acc").text(acc);
        $("#cpuStatus .x-register").text(xReg);
        $("#cpuStatus .y-register").text(yReg);
        $("#cpuStatus .z-flag").text(zFlag);

    },
    /**
     * Updates pcb status display
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    updatePCBStatusDisplay: function(pcb) {
        var id = pcb.pid;
        var pc = pcb.pc;
        var acc = pcb.acc;
        var xReg = pcb.xReg;
        var yReg = parseInt(pcb.yReg, 16);
        var zFlag = pcb.zFlag;

        $("#pcbStatus .pid").text(id);
        $("#pcbStatus .pc").text(pc);
        $("#pcbStatus .acc").text(acc);
        $("#pcbStatus .x-register").text(xReg);
        $("#pcbStatus .y-register").text(yReg);
        $("#pcbStatus .z-flag").text(zFlag);

    }
});
