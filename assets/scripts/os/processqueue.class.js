/**
 * =============================================================================
 * processqueue.class.js 
 * 
 * Our implementation of the process queue based on the Queue Class
 * 
 * @public
 * @class ProcessQueue
 * @inheritsFrom jambOS.OS.Queue
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.ProcessQueue = jambOS.util.createClass(jambOS.OS.Queue, /** @scope jambOS.OS.ReadyQueue.prototype */ {
    /**
     * @property {string} type          - Type
     */
    type: "processqueue",
    /**
     * @property {Array} q              - Our Queue
     */
    q: [],
    /**
     * Constructor
     * @public
     * @param {object} options constructor arguments we wish to pass
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);
    },
    /**
     * Will have to work on this in the future but in the meantime we'll just return
     * a string representation of readyqueue by it's  type.
     * @returns {string} type
     */
    toString: function() {
        return "<jambOS.OS." + this.type + ">";
    }
});