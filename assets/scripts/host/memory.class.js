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
jambOS.host.Memory = jambOS.util.createClass( /** @scopee jambOS.host.Memory.prototype */{
    /**
     * @property {int} size             - Size of Memory
     */
    size: 0,
    /**
     * @property {array} storage
     */
    storage: new Array(),
    /**
     * @property {string} type
     */
    type: "memory",
    /**
     * Constructor
     * @param {object} options
     * @returns {jambOS.host.Memory}
     */
    initialize: function(options) {
        var self = this;
    
        options || (options = {});
        self.setOptions(options);

        // initialize storage memory array with zeros
        for (var i = 0; i < self.size; i++) {
            self.write(i, 00);
        }
        
        return this;
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
    insert: function(start, data) {

        var self = this;

        // write to memory
        for (var i = 0; i < data.length; i++) {
            self.write(i + start, data[i]);
        }        

        _Kernel.memoryManager.updateMemoryDisplay();
    }
});