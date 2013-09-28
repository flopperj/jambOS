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
    // Properties
    q: new Array(),
    // Methods
    getSize: function() {
        return this.q.length;
    },
    isEmpty: function() {
        return (this.q.length === 0);
    },
    enqueue: function(element) {
        this.q.push(element);
    },
    dequeue: function() {
        var retVal = null;
        if (this.q.length > 0)
        {
            retVal = this.q.shift();
        }
        return retVal;
    },
    toString: function() {
        var retVal = "";
        for (var i in this.q)
        {
            retVal += "[" + this.q[i] + "] ";
        }
        return retVal;
    }
});