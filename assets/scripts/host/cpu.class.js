/**
 * =============================================================================
 * cpu.class.js
 * Routines for the host CPU simulation, NOT for the OS itself.  
 * In this manner, it's A LITTLE BIT like a hypervisor,
 * in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
 * that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using 
 * JavaScript in both the host and client environments.
 * 
 * This code references page numbers in the text book: 
 * Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
 * 
 * @requires globals.js
 * @public
 * @class Cpu
 * @memberOf jambOS.host
 * =============================================================================
 */
jambOS.host.Cpu = jambOS.util.createClass(/** @scope jambOS.host.Cpu.prototype */{
    pc: 0, // Program Counter
    acc: 0, // Accumulator
    xReg: 0, // X register
    yReg: 0, // Y register
    zFlag: 0, // Z-ero flag (Think of it as "isZero".)
    isExecuting: false,
    currentProcess: null,
    initialize: function() {
    },
    start: function(pcb){
        this.currentProcess = pcb;
        this.isExecuting = true;
    },
    stop: function(){        
        this.pc = 0;
        this.acc = 0;
        this.xReg = 0;
        this.yReg = 0;
        this.zFlag = 0;
        this.isExecuting = false;
        this.currentProcess = null;
    },
    cycle: function() {
        _Kernel.trace("CPU cycle");
        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.
    }
});
