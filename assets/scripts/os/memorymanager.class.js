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
     * @property {object} slots                 
     */
    slots: [],
    /**
     * @property {int} activeSlot
     */
    activeSlot: 0,
    /**
     * Constructor
     */
    initialize: function() {
        var self = this;

        // set up memory slots
        for (var i = 0; i < ALLOCATABLE_MEMORY_SLOTS; i++) {

            // for our bases we are going to use the previous slot's data
            // unless its the first slot which we'll use 0 as the base and 
            // the block size minus 1 as the limit
            var base = i > 0 ? self.slots[i - 1].limit + 1 : 0;
            var limit = i > 0 ? self.slots[ i - 1].limit + MEMORY_BLOCK : MEMORY_BLOCK - 1;

            self.slots.push({
                base: base,
                limit: limit,
                open: true
            });
        }

        // initialize our memory. We are going to use the last slot's limit + 1
        // as the total memory size
        var memorySize = self.slots[self.slots.length - 1].limit + 1;
        self.set({
            memory: new jambOS.host.Memory({size: memorySize})
        });

        // update memory table
        self.updateMemoryDisplay();
    },
    /**
     * Allocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    allocate: function(pcb) {
        var self = this;
        var activeSlot = pcb.slot;
        self.slots[activeSlot].open = false;
        pcb.set({base: self.slots[activeSlot].base, limit: self.slots[activeSlot].limit});
        _Kernel.processManager.set("currentProcess", pcb);
    },
    /**
     * Deallocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    deallocate: function(pcb) {
        var self = this;
        var slot = pcb.slot;

        // clear out process from memory
        for (var i = pcb.base; i <= pcb.limit; i++)
        {
            self.memory.write(i, 00);
        }

        self.slots[slot].open = true;
        self.activeSlot = pcb.slot;

        // update memory table
        self.updateMemoryDisplay();
    },
    /**
     * Validates if memory address is within available allocated slot
     * @param {int} address 
     */
    validateAddress: function(address) {
        var self = this;
        var activeSlot = _Kernel.processManager.get("currentProcess").slot;
        var isValid = (address <= self.slots[activeSlot].limit && address >= self.slots[activeSlot].base)
        return isValid;
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
        var hex = Number(d).toString(HEX_BASE);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex.toUpperCase();
    }
});