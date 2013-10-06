jambOS.OS.ProcessManager = jambOS.util.createClass({
    type: "processmanager",
    /**
     * @property {[jambOS.OS.ProcessControlBlock]} processes
     */
    processes: [],
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
    execute: function(pcb) {
        _Kernel.interruptHandler(PROCESS_INITIATION_IRQ, pcb);
    },
    /**
     * Loads program to memory
     * 
     * @param {string} program
     * @returns {jambOS.OS.ProcessControlBlock} pcb
     */
    load: function(program){
        
        _Kernel.memoryManager.memory.insert(0, program);

        var pid = this.processes.length;
        var pcb = new jambOS.OS.ProcessControlBlock({
            pid: pid,
            pc: 0,
            base: null,
            limit: null,
            ir: 0,
            xReg: 0,
            yReg: 0,
            zFlag: 0
        });
        
        this.processes.push(pcb);
        
        return pcb;   
    },
    
    /**
     * Unloads process from memory
     * 
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    unload: function(pcb){
        _Kernel.memoryManager.deallocate(pcb);
        var index = this.processes.indexOf(pcb);
        if(index > -1)
            this.processes.splice(index, 1);
    }
});
