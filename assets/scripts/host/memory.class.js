/**
 *==============================================================================
 * Class Memory
 *    
 * @class Memory
 * @memberOf jambOS 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.host.Memory = jambOS.util.createClass(/** @scopee jambOS.host.Memory.prototype */{
    /**
     * @property {array} storage
     */
    storage: new Array(),
    /**
     * Constructor
     */
    initialize: function() {

        var self = this;

        // initialize storage memory array with zeros
        for (var i = 0; i < TOTAL_MEMORY; i++) {
            self.write(i, 00);
        }

        self.updateMemoryDisplay();
    },
    /**
     * Reads data from storage
     * @param {string} address
     * @returns data
     */
    read: function(address) {
        return this.storage[address];
    },
    /**
     * Writes to storage
     * 
     * @public
     * @param {string} address
     * @param {object} data
     */
    write: function(address, data) {
        this.storage[address] = data;
    },
    /**
     * Inserts data to storage starting from the specified storage address
     * 
     * @public
     * @param {int} start starting address point
     * @param {array} data data to add to storage
     */
    insert: function(start, data){
        
        var self = this;
        
        var lastAddress = data.length + start;

        // write to memory
        for (var i = start; i < lastAddress; i++)
            self.write(i, data[i]);

        self.updateMemoryDisplay();
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
        while (TOTAL_MEMORY > i) {
            if (i % 8 === 0) {
                table += "</tr><tr class='" + (self.read(i) !== 0 ? "has-value" : "") + "'>";
                table += "<td>0x" + self._decimalToHex(i, 4) + "</td>";
                table += "<td>" + self.read(i) + "</td>";
            } else
                table += "<td>" + self.read(i) + "</td>";
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