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
    /**
     * @property {string} type
     */
    type: "processmanager",
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
    /**
     * Loads program to memory
     * 
     * @param {string} program
     * @returns {jambOS.OS.ProcessControlBlock} pcb
     */
    load: function(program, priority) {

        if (isNaN(priority))
            priority = 0;

        // enable stepover button
        $("#btnStepOver").prop("disabled", false);

        var slots = _Kernel.memoryManager.get("slots");
        var activeSlot = _Kernel.memoryManager.get("activeSlot");

        // move up memory slot when program has been loaded
        if (activeSlot < ALLOCATABLE_MEMORY_SLOTS) {
            _Kernel.memoryManager.activeSlot++;

            // get our base and limit addresses
            var base = slots[activeSlot].base;
            var limit = slots[activeSlot].limit;

            var pcb = null;

            // write program to memory slots
            _Kernel.memoryManager.memory.insert(base, program);

            var pid = _CPU.scheduler.currentProcessID++;
            var pc = base;
            pcb = new jambOS.OS.ProcessControlBlock({
                pid: pid,
                pc: pc,
                base: base,
                limit: limit,
                xReg: 0,
                yReg: 0,
                zFlag: 0,
                slot: activeSlot,
                priority: priority,
                state: "new",
                programSize: program.length
            });
            _StdIn.putText("Process " + pid + " has been added to memory");

        } else {
            var pid = _CPU.scheduler.currentProcessID++;
            var pc = base;
            pcb = new jambOS.OS.ProcessControlBlock({
                pid: pid,
                xReg: 0,
                yReg: 0,
                zFlag: 0,
                slot: -1,
                state: "in disk",
                priority: priority,
                programSize: program.length
            });

            var filename = "process_" + pid;
            var data = program.join(" ");

            _HardDrive.fileSystem.createFile(filename);
            if (_HardDrive.fileSystem.writeFile(filename, data))
                _StdIn.putText("Process " + pid + " loaded to disk");
        }

        _CPU.scheduler.set("currentProcess", pcb);
        _CPU.scheduler.residentList.push(pcb);
        _Kernel.memoryManager.allocate(pcb);

        // sort resident list
        // processes with less priority values will be executed first
        if (_CPU.scheduler.currentSchedulingAlgorithm === PRIORITY_SCHEDULER) {
            function compare(a, b) {
                if (a.priority < b.priority)
                    return -1;
                if (a.priority > b.priority)
                    return 1;
                return 0;
            }
            _CPU.scheduler.residentList.sort(compare);
        }
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

        var templist = [];

        // terminate programs in resident list
        $.each(_CPU.scheduler.residentList, function() {
            if (this.pid === pcb.pid) {
                this.set("state", "terminated");

                // deallocate memory of process
                _Kernel.memoryManager.deallocate(this);
            } else
                templist.push(this);
        });

        _CPU.scheduler.residentList = templist;

        // remove process from ready queue to remove zombie process effect
        $.each(_CPU.scheduler.readyQueue.q, function(i, process) {
            if (process.pid === pcb.pid)
                _CPU.scheduler.readyQueue.q.splice(i, 1);
        });

        // clear up the ready queue if we have no process in the residentlist
        if (!templist.length) {
            _CPU.scheduler.readyQueue.dequeue();
        }

        // we don't want to forget to reset the current process
        if (self.get("currentProcess") && self.get("currentProcess").pid === pcb.pid)
            self.set("currentProcess", null);
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
     * @public
     * @method updatePCBStatusDisplay
     * @param {boolean} isDone - Has cpu completed executing processes? TODO: Find a way to utilize cpu.isExecuting
     */
    updatePCBStatusDisplay: function(isDone) {
        var self = this;
        var tableRows = "";
        var currentProcess = jambOS.util.clone(_CPU.scheduler.get("currentProcess"));
        var pcbs = $.map(jambOS.util.clone(_CPU.scheduler.residentList), function(value, index) {
            return [value];
        });

        // checks if current process is in the ready queue
        var isInReadyQueue = (function(pcb) {
            $.each(pcbs, function() {
                if (this.pid === pcb.pid)
                    return true;
            });

            return false;
        })(currentProcess);

        /*  if (_CPU.isExecuting && !isInReadyQueue)
         pcbs.push(currentProcess);
         else */if (isDone) {
            pcbs = [];

            // clear process status table and populate data
            $("#pcbStatus table tbody").empty().append("<tr><td colspan='6'><strong>No processes available</strong></td></tr>");

        }

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
            var status = process.state;

            tableRows += "<tr class='" + (currentProcess.pid === process.pid ? "active" : "") + "'>\n\
                                <td>\n\
                                    " + id + "\n\
                                </td>\n\
                                <td>\n\
                                    " + (currentProcess.pid === process.pid ? _CPU.pc : pc) + "\n\
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
                                <td>\n\
                                    " + status + "\n\
                                </td>\n\
                              </tr>";

            // clear process status table and populate data
            $("#pcbStatus table tbody").empty().append(tableRows);
        });

    }
});
