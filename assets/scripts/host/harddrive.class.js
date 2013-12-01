/**
 *==============================================================================
 * harddrive.class.js
 *    
 * @class HardDrive
 * @memberOf jambOS.host 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.host.HardDrive = jambOS.util.createClass(/** @scope jambOS.host.HardDrive.prototype */{
    /**
     * @property {string} type
     */
    type: "harddrive",
    /**
     * @property {localStorage} storage - This is our storage unit
     */
    storage: null,
    /**
     * Constructor
     */
    initialize: function() {
        if (this._canSupportLocalStorage())
            this.storage = localStorage;
    },
    /**
     * Reads data from harddrive
     * @public
     * @method
     * @param {string} address - Adress location to read from
     * @returns {string} data
     */
    read: function(address) {
        return this.storage.getItem(address);
    },
    /**
     * Writes to the harddrive
     * @public
     * @method write
     * @param {string} address - Address location to write to
     * @param {string} data - Data to write to specified data address
     */
    write: function(address, data) {
        this.storage.setItem(address, data);
    },
    /**
     * Checks for html5 storage support
     * @private
     * @method _canSupportLocalStorage
     * @returns {boolean} true|false
     */
    _canSupportLocalStorage: function() {
        try {
            return "localStorage" in window && window["localStorage"] !== null;
        } catch (e) {
            return false;
        }
    }
});