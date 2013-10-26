/**
 * =============================================================================
 * interrupt.class.js 
 * 
 * Interrupt Class
 * 
 * @public
 * @class Interrupt
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.Interrupt = jambOS.util.createClass(/** @scope jambOS.OS.Interrupt.prototype */{
    /**
     * @property {string} type
     */
    type: "Interrupt",
    /**
     * @property {int} iqr
     */
    irq: null,
    /**
     * @params {object} params
     */
    params: null,
    /**
     * Constructor
     */
    initialize: function(options) {
        var self = this;

        options || (options = {});
        self.setOptions(options);
    }
});