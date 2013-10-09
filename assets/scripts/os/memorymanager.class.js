/**
 *==============================================================================
 * Class MemoryManager
 *    
 * @class MemoryManager
 * @memberOf jambOS.OS
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.MemoryManager = jambOS.util.createClass({
    /**
     * @property {jambOS.host.Memory} memory
     */
    memory: null,
    /**
     * @property {string} type
     */
    type: "memorymanager",
    /**
     * @property {int} memorySize
     */
    memorySize: 768,
    /**
     * @property {object} slots                 
     */
    slots: {},
    activeSlot: 1,
    /**
     * Constructor
     */
    initialize: function() {
        var self = this;
        self.memory = new jambOS.host.Memory({size: self.memorySize});
        self.slots = {
            1: {
                base: 0,
                limit: 255,
                open: true
            },
            2: {
                base: 256,
                limit: 512,
                open: false
            },
            3: {
                base: 513,
                limit: 767,
                open: false
            }
        };
        self.updateMemoryDisplay();
    },
    /**
     * Allocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    allocate: function(pcb) {
        var self = this;
        pcb.set({base: self.slots[1].base, limit: self.slots[1].limit});
        _CPU.currentProcess = pcb;
    },
    /**
     * Deallocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    deallocate: function(pcb) {
        var self = this;
        for (var i = pcb.base; i < pcb.limit; i++)
        {
            self.memory.write(i, 0);
        }
        pcb.base = null;
        pcb.limit = null;

        self.updateMemoryDisplay();

        _Kernel.processManager.processes = [];
    },
    /**
     * Validates if memory address is within available allocated slot
     * @param {int} address 
     */
    validateAddress: function(address) {
        var self = this;
        return (address <= self.slots[self.activeSlot].limit);
    },
    /**
     * Updates content that is on memory for display on the OS 
     * @method updateDisplay
     */
    updateMemoryDisplay: function() {
        var self = this;
        var table = "<table class='table table-bordered'><tr>";
        var i = 0;
        while (self.memory.size > i) {
            if (i % 8 === 0) {
                table += "</tr><tr class='" + (self.memory.read(i) !== 0 ? "has-value" : "") + "'>";
                table += "<td>0x" + self.decimalToHex(i, 4) + "</td>";
                table += "<td>" + self.memory.read(i) + "</td>";
            } else
                table += "<td>" + self.memory.read(i) + "</td>";
            i++;
        }
        table += "</table>";

        // add to the memory div
        $("#memory .content").html(table);
    },
    /**
     * Converts decimal values to hex
     * @method decimalToHex
     * @param {Number} d
     * @param {int} padding
     * @returns {string} hex
     */
    decimalToHex: function(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex.toUpperCase();
    }
});