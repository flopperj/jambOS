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
     * @process {jambOS.OS.ProcessControl}      - currentProcess that is running
     */
    currentProcess: null,
    /**
     * Constructor
     */
    initialize: function() {
        return this;
    },
    /**
     * Sets cpu registers ready for process execution
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    start: function(pcb) {
        this.currentProcess = pcb;
        this.pc = pcb.base;
        this.isExecuting = true;
    },
    /**
     * Resets cpu registers to default values to help stop process execution
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    stop: function() {
        this.pc = 0;
        this.acc = 0;
        this.xReg = 0;
        this.yReg = 0;
        this.zFlag = 0;
        this.isExecuting = false;
        
        // update PCB status display
        _Kernel.processManager.updatePCBStatusDisplay(this.currentProcess);
        
        this.currentProcess = null;


        // disable stepover button
        $("#btnStepOver").prop("disabled", true);
    },
    /**
     * Called every clock cycle
     */
    cycle: function() {
        var self = this;
        _Kernel.trace("CPU cycle");

        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.

        // update cpu status display
        _Kernel.processManager.updateCpuStatusDisplay(self);

        var opCode = _Kernel.memoryManager.memory.read(self.pc++).toString().toLowerCase();
        var operation = self.getOpCode(opCode);

        if (operation) {
            operation(self);

            if (self.currentProcess)
                self.currentProcess.set({acc: self.acc, pc: self.pc, xReg: self.xReg, yReg: self.yReg, zFlag: self.zFlag, state: "running"});

        }

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
        self.acc = parseInt(byteCode, 16);
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            self.acc = parseInt(value, 16);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Convert value of acc to hex
            var hexValue = _Kernel.memoryManager.decimalToHex(self.acc);

            // Place value of acc in hex byte form in memory
            _Kernel.memoryManager.memory.write(address, hexValue);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Add contents of the memory location and the contents of the acc
            self.acc += parseInt(value, 16);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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
        self.xReg = parseInt(byteCode, 16);
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location (in decimal form) in the x register
            self.xReg = parseInt(value, 16);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location in the y register
            self.yReg = parseInt(value, 16);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * No Operation 
     * opCode: ea
     * @param {jambOS.host.Cpu} self 
     */
    noOperation: function(self)
    {
        self.PC++;
    },
    /**
     * Break (which is really a system call) 
     * opCode: 00
     */
    breakOperation: function(self) {
        _Kernel.interruptHandler(PROCESS_TERMINATION_IRQ, self.currentProcess);
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

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Compare contents of the memory location with the x reg
            // Set z flag if they are equal
            self.zFlag = (parseInt(value) === self.xReg) ? 1 : 0;
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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
            var branchValue = parseInt(_Kernel.memoryManager.memory.read(self.pc++), 16);
            self.pc += branchValue;

            if (self.pc > self.currentProcess.limit)
            {
                self.pc -= self.currentProcess.limit + 1;
            }
        }
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

        var address = parseInt((byteCodeTwo + byteCodeOne), 16);
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            var decimalValue = parseInt(value, 16);

            decimalValue++;

            var hexValue = _Kernel.memoryManager.decimalToHex(decimalValue);

            _Kernel.memoryManager.memory.write(address, hexValue);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
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

            var address = parseInt(self.yReg, 16);

            var currentByte = _Kernel.memoryManager.memory.read(address);

            var character = "";

            while (currentByte !== "00")
            {
                currentByte = _Kernel.memoryManager.memory.read(address++);
                character = String.fromCharCode(parseInt(currentByte, 16));
                _StdIn.putText(character);
            }

            _StdIn.advanceLine();
            _OsShell.putPrompt();
        }
    }
});
