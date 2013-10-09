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
        _Kernel.interruptHandler(PROCESS_INITIATION_IRQ, pcb);
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

        _Kernel.memoryManager.memory.insert(0, program);

        var slots = _Kernel.memoryManager.slots;
        var activeSlot = _Kernel.memoryManager.activeSlot;

        var pid = this.currentProcessID++;
        var pcb = new jambOS.OS.ProcessControlBlock({
            pid: pid,
            pc: 0,
            base: slots[activeSlot].base,
            limit: slots[activeSlot].limit,
            xReg: 0,
            yReg: 0,
            zFlag: 0
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

    }
});
