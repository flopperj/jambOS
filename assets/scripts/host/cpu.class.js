/**
 * =============================================================================
 * cpu.class.js
 * Routines for the host CPU simulation, NOT for the OS itself.  
 * In this manner, it's A LITTLE BIT like a hypervisor,
 * in that the Document environment inside a browser is the "bare metal" 
 * (so to speak) for which we write code that hosts our client OS. But that 
 * analogy only goes so far, and the lines are blurred, because we are using 
 * JavaScript in both the host and client environments.
 * 
 * This code references page numbers in the text book: 
 * Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  
 * ISBN 978-0-470-12872-5
 * 
 * @requires globals.js
 * @public
 * @class Cpu
 * @memberOf jambOS.host
 * =============================================================================
 */
jambOS.host.Cpu = jambOS.util.createClass(/** @scope jambOS.host.Cpu.prototype */{
    /**
     * @property {int} pc                       - Program counter
     */
    pc: 0,
    /**
     * @property {int} acc                      - Accumulator
     */
    acc: 0,
    /**
     * @property {int} xReg                     - X Register
     */
    xReg: 0,
    /**
     * @property {int}  yReg                    - Y Register
     */
    yReg: 0,
    /**
     * @property {int}  zFlag                   - Z-ero flag (Think of it as "isZero".)
     */
    zFlag: 0,
    /**
     * @property {boolean} isExecuting          - Is the CPU executing?
     */
    isExecuting: false,
    /**
     * @property {jambOS.OS.CPUScheduler} scheduler 
     */
    scheduler: null,
    /**
     * Constructor
     */
    initialize: function() {
        // set up our cpu scheduler
        this.scheduler = new jambOS.OS.CPUScheduler();
        return this;
    },
    /**
     * Sets cpu registers ready for process execution
     * @public
     * @method start
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    start: function(pcb) {
        var self = this;

        // set current process in scheduler
        self.scheduler.set("currentProcess", pcb);

        // set cpu with process' pc and start execution
        self.set({
            pc: pcb.pc,
            isExecuting: true
        });

        // Log our switch to kernel mode
        _Kernel.trace("Switching to Kernel Mode");

        // Switch to Kernel mode
        _MODE = 0;

    },
    /**
     * Resets cpu registers to default values to help stop process execution
     * @public
     * @method stop
     */
    stop: function() {
        var self = this;

        // reset our registers
        self.set({
            pc: 0,
            acc: 0,
            xReg: 0,
            yReg: 0,
            zFlag: 0,
            isExecuting: false
        });

        // update PCB status display in real time
        _Kernel.processManager.updatePCBStatusDisplay(true);

        // Log our switch to user mode
        _Kernel.trace("Switching to User Mode");

        // Switch to user mode
        _MODE = 1;

        // disable stepover button
        $("#btnStepOver").prop("disabled", true);
    },
    /**
     * Called every clock cycle
     * @public
     * @method cycle
     */
    cycle: function() {
        var self = this;
        _Kernel.trace("CPU cycle");

        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.

        // update cpu status display in real time
        _Kernel.processManager.updateCpuStatusDisplay(self);

        // update PCB status display in real time
        _Kernel.processManager.updatePCBStatusDisplay();

        // check if our program counter is within our memory addresses bounds
        if (self.pc > (MEMORY_BLOCK_SIZE * ALLOCATABLE_MEMORY_SLOTS)) {
            self.stop();
            _Kernel.trapError("Invalid Operation!", false);
        }

        // get execution operation
        var opCode = _Kernel.memoryManager.memory.read(self.pc++).toString().toLowerCase();
        var operation = self.getOpCode(opCode);

        // execute operation
        if (operation) {

            // highlight all the valid operations as we step through them
            $(".operation").removeClass("currentOperation");
            $(".address_" + (self.pc - 1)).addClass("currentOperation").addClass("validOperation");

            operation(self);

            if (self.scheduler.get("currentProcess"))
                self.scheduler.get("currentProcess").set({acc: self.acc, pc: self.pc, xReg: self.xReg, yReg: self.yReg, zFlag: self.zFlag, state: "running"});
        } else {

            // log invalid opcode
            _Kernel.trace("Invalid Operation!");

            // highlight all invalid operations as we step through them
            $(".operation").removeClass("currentOperation");
            $(".address_" + (self.pc - 1)).addClass("currentOperation").addClass("inValidOperation");

            // change background color of active process
            // Found that trapping the error would be just too much on the
            // console!
            $("#pcbStatus table tbody tr.active").addClass("error").removeClass("active");

            // Set process cycle 1 tick close to the quantum so that we can Whiz 
            // through and get to the next process as quick as posible during
            // the context switch
            self.scheduler.processCycles = self.scheduler.quantum - 1;
            
            // kill process
            var terminationOperation = self.getOpCode("00");
            terminationOperation(self);
        }

        // Perform a context switch if the ready queue is not empty.
        // This is where the magic or realtime multi-processing occurs.
        if (!self.scheduler.readyQueue.isEmpty())
            self.scheduler.scheduleProcess();

    },
    /*------------------Operations -----------------------*/
    /**
     * Gets an opcode function
     * @param {string} opcode
     * @returns {function} opcode routine
     */
    getOpCode: function(opcode) {
        var self = this;
        var opcodes = {
            "a9": self.loadAccWithConstant,
            "ad": self.loadAccFromMemory,
            "8d": self.storeAccInMemory,
            "6d": self.addWithCarry,
            "a2": self.loadXRegWithConstant,
            "ae": self.loadXRegFromMemory,
            "a0": self.loadYRegWithConstant,
            "ac": self.loadYRegFromMemory,
            "00": self.breakOperation,
            "ea": self.noOperation,
            "ec": self.compareXReg,
            "d0": self.branchXBytes,
            "ee": self.incrementByteValue,
            "ff": self.systemCall
        };
        return opcodes[opcode];
    },
    /**
     * Load the accumulator with a constant.
     * opCode: a9     
     * @param {jambOS.host.Cpu} self    
     */
    loadAccWithConstant: function(self)
    {
        var byteCode = _Kernel.memoryManager.memory.read(self.pc++);
        self.acc = parseInt(byteCode, HEX_BASE);
    },
    /**
     * Load the accumulator from memory 
     * opCode: ad
     * @param {jambOS.host.Cpu} self 
     */
    loadAccFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            self.acc = parseInt(value, HEX_BASE);
        }
    },
    /**
     * Store the accumulator in memory
     * opCode: 8d
     * @param {jambOS.host.Cpu} self 
     */
    storeAccInMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Convert value of acc to hex
            var hexValue = _Kernel.memoryManager.decimalToHex(self.acc);

            // Place value of acc in hex byte form in memory
            _Kernel.memoryManager.memory.write(address, hexValue);
        }
    },
    /**
     * Add with carry adds contents of an address to the contents of the 
     * accumulator and keeps the result in the accuculator
     * opCode: 6d
     * @param {jambOS.host.Cpu} self 
     */
    addWithCarry: function(self)
    {

        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Add contents of the memory location and the contents of the acc
            self.acc += parseInt(value, HEX_BASE);
        }
    },
    /**
     * Load the X register with a constant
     * opCode: a2
     * @param {jambOS.host.Cpu} self 
     */
    loadXRegWithConstant: function(self)
    {
        var byteCode = _Kernel.memoryManager.memory.read(self.pc++);
        self.xReg = parseInt(byteCode, HEX_BASE);
    },
    /**
     * Load the X register from memory 
     * opCode: ae
     * @param {jambOS.host.Cpu} self 
     */
    loadXRegFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location (in decimal form) in the x register
            self.xReg = parseInt(value, HEX_BASE);
        }
    },
    /**
     * Load the Y register with a constant 
     * opCode: a0
     * @param {jambOS.host.Cpu} self 
     */
    loadYRegWithConstant: function(self)
    {
        // Place the next byte in memory in the Y register
        self.yReg = _Kernel.memoryManager.memory.read(self.pc++);
    },
    /**
     * Load the Y register from memory 
     * opCode: ac
     * @param {jambOS.host.Cpu} self 
     */
    loadYRegFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location in the y register
            self.yReg = parseInt(value, HEX_BASE);
        }
    },
    /**
     * No Operation 
     * opCode: ea
     * @param {jambOS.host.Cpu} self 
     */
    noOperation: function(self)
    {
        self.pc++;
    },
    /**
     * Break (which is really a system call) 
     * opCode: 00
     * @param {jambOS.host.Cpu} self 
     */
    breakOperation: function(self) {

        var lastProcess = self.scheduler.residentList[self.scheduler.residentList.length - 1];
        var currentProcess = self.scheduler.currentProcess;

        // set the current process state to terminated
        self.scheduler.currentProcess.set("state", "terminated");

        // deallocate program from memory
        _Kernel.processManager.unload(currentProcess);
        

        // we want to terminate everything after all processes have been
        // executed or when we are only executing one process
        if (currentProcess.pid === lastProcess.pid || self.scheduler.readyQueue.isEmpty())
            _Kernel.interruptHandler(PROCESS_TERMINATION_IRQ, self.scheduler.get("currentProcess"));
    },
    /**
     * Compare a byte in memory to the X reg sets the Z (zero) flag if equal 
     * opCode: ec
     * @param {jambOS.host.Cpu} self 
     */
    compareXReg: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Compare contents of the memory location with the x reg
            // Set z flag if they are equal
            self.zFlag = (parseInt(value) === self.xReg) ? 1 : 0;
        }
    },
    /**
     * Branch X bytes if Z flag = 0
     * opCode: d0
     * @param {jambOS.host.Cpu} self 
     */
    branchXBytes: function(self)
    {
        if (self.zFlag === 0)
        {
            var branchValue = parseInt(_Kernel.memoryManager.memory.read(self.pc++), HEX_BASE);
            self.pc += branchValue;

            if (self.pc > self.scheduler.get("currentProcess").limit)
            {
                self.pc -= MEMORY_BLOCK_SIZE;
            }
        } else
            self.pc++;
    },
    /**
     * Increment the value of a byte 
     * opCode: ee
     * @param {jambOS.host.Cpu} self 
     */
    incrementByteValue: function(self)
    {
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = self.scheduler.get("currentProcess");
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            var decimalValue = parseInt(value, HEX_BASE);

            decimalValue++;

            var hexValue = _Kernel.memoryManager.decimalToHex(decimalValue);

            _Kernel.memoryManager.memory.write(address, hexValue);
        }
    },
    /**
     * System Call 
     *  #$01 in X reg = print the integer stored in the Y register. 
     *  #$02 in X reg = print the 00-terminated string stored at the address in 
     *  the Y register. 
     *  opCode: ff
     * @param {jambOS.host.Cpu} self 
     */
    systemCall: function(self)
    {
        if (self.xReg === 1)
        {
            var value = parseInt(self.yReg).toString();

            for (var i = 0; i < value.length; i++)
            {
                _StdIn.putText(value.charAt(i));
            }
            _StdIn.advanceLine();
            _OsShell.putPrompt();

        } else {

            var pcb = self.scheduler.get("currentProcess");

            var address = parseInt(self.yReg, HEX_BASE) + pcb.base;

            var currentByte = _Kernel.memoryManager.memory.read(address);

            var character = "";
            var keyCode = 0;

            while (currentByte !== "00")
            {
                currentByte = _Kernel.memoryManager.memory.read(address++);
                keyCode = parseInt(currentByte, HEX_BASE);


                character = String.fromCharCode(keyCode);
                _StdIn.putText(character);
            }

            _StdIn.advanceLine();
            _OsShell.putPrompt();
        }
    }
});

