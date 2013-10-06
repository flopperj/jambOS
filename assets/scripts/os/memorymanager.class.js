/**
 *==============================================================================
 * Class MemoryManager
 *    
 * @class MemoryManager
 * @memberOf jambOS 
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
     * Constructor
     */
    initialize: function(){
        var self = this;
        self.memory = new jambOS.host.Memory({size: self.memorySize});
        self.updateMemoryDisplay();
    },
    deallocate: function(pcb){
        
    },
    /**
     * Updates content that is on memory for display on the OS
     * 
     * @public
     * @method updateDisplay
     */
    updateMemoryDisplay: function() {
        var self = this;
        var table = "<table><tr>";
        var i = 0;
        while (self.memory.size > i) {
            if (i % 8 === 0) {
                table += "</tr><tr class='" + (self.memory.read(i) !== 0 ? "has-value" : "") + "'>";
                table += "<td>0x" + self._decimalToHex(i, 4) + "</td>";
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
     * 
     * @private
     * @method _decimalToHex
     * @param {Number} d
     * @param {int} padding
     * @returns {string} hex
     */
    _decimalToHex: function(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex.toUpperCase();
    }
});