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
    /**
     * @property {jambOS.OS.ProcessControlBlock} previousProcess    
     */
    previousProcess: null,
    /**
     * @property {jambOS.OS.ProcessQueue} readyQueue
     */
    readyQueue: null,
    /**
     * @property {int} processCycles
     */
    processCycles: 0,
    /**
     * @property {int} schedulingQuantum
     */
    schedulingQuantum: 6,
    /**
     * Constructor
     * @param {object} options
     * @returns {jambOS.OS.ProcessManager}
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);
        this.readyQueue = new jambOS.OS.ProcessQueue();
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
            if (!self.readyQueue.isEmpty() && self.processCycles >= self.schedulingQuantum) {
                _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
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
     * Unloads process from memoryhelp
     * @public
     * @method unload
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    unload: function(pcb) {
        var self = this;
        var tempProcesses = jambOS.util.clone(self.processes);

        // remove pcb from processes list
        // also make sure all other terminated prcoesses are removed
        $.each(tempProcesses, function(index, process) {
            if (process.pid === pcb.pid || process.state === "terminated") {
                _Kernel.memoryManager.deallocate(process);
                self.processes.splice(index, 1);
            }
        });
    },
    /**
     * Updates cpu status display
     * @public
     * @method updateCpuStatusDisplay
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
     * Updates the process status table results
     */
    updatePCBStatusDisplay: function() {
        var self = this;
        var tableRows = "";
        var currentProcess = jambOS.util.clone(self.get("currentProcess"));
        var pcbs = $.map(jambOS.util.clone(self.readyQueue.q), function(value, index) {
            return [value];
        });

        pcbs.push(currentProcess);

        // loop through the ready queue and get all processes that are ready to
        // be executed
        $.each(pcbs.reverse(), function() {
            var process = this;
            var id = process.pid;
            var pc = process.pc;
            var acc = process.acc;
            var xReg = process.xReg;
            var yReg = parseInt(process.yReg, 16);
            var zFlag = process.zFlag;

            tableRows += "<tr class='" + (currentProcess.pid === process.pid ? "active" : "") + "'>\n\
                                <td>\n\
                                    " + id + "\n\
                                </td>\n\
                                <td>\n\
                                    " + pc + "\n\
                                </td>\n\
                                <td>\n\
                                    " + acc + "\n\
                                </td>\n\
                                <td>\n\
                                    " + xReg + "\n\
                                </td>\n\
                                <td>\n\
                                    " + yReg + "\n\
                                </td>\n\
                                <td>\n\
                                    " + zFlag + "\n\
                                </td>\n\
                              </tr>";

            // clear process status table and populate data
            $("#pcbStatus table tbody").empty().append(tableRows);
        });

    }
});
