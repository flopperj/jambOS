/**
 * =============================================================================
 * queue.class.js 
 * 
 * A simple Queue, which is really just a dressed-up JavaScript Array.
 * See the Javascript Array documentation at http://www.w3schools.com/jsref/jsref_obj_array.asp .
 * Look at the push and shift methods, as they are the least obvious here.
 * 
 * @public
 * @class Queue
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.Queue = jambOS.util.createClass({
    /**
     * @property {string} type          - Type
     */
    type: "readyqueue",
    /**
     * @property {Array} q              - Our Queue
     */
    q: new Array(),
    /**
     * Gets the size of our queue
     * @public
     * @method getSize
     * @return {int}                    - Size of our queue
     */
    getSize: function() {
        return this.q.length;
    },
    /**
     * Checks if our queue is empty or not
     * @public
     * @method isEmpty
     * @returns {boolean}   true|false
     */
    isEmpty: function() {
        return (this.q.length === 0);
    },
    /**
     * Adds element to queue
     * @public
     * @method enqueue
     * @param {anyType} element   
     */
    enqueue: function(element) {
        this.q.push(element);
    },
    /**
     * Removes first element from queue
     * @public
     * @method dequeue
     * @returns {anyType} retVal
     */
    dequeue: function() {
        var retVal = null;
        if (!this.isEmpty())
        {
            retVal = this.q.shift();
        }
        return retVal;
    },
    /**
     * String representation of our queue
     * @public
     * @returns {string} retVal
     */
    toString: function() {
        var retVal = "";
        for (var i in this.q)
        {
            retVal += "[" + this.q[i] + "] ";
        }
        return retVal;
    }
});