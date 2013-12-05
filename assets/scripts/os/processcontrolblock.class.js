/**
 *==============================================================================
 * Class ProcessControlBlock
 *    
 * @class ProcessControlBlock
 * @memberOf jambOS.OS 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.ProcessControlBlock = jambOS.util.createClass(/** @scope jambOS.OS.ProcessControlBlock.prototype */ {
    /**
     * @property {int} pid                  - process id
     */
    pid: 0,
    /**
     * @property {int} pc                   - Program Counter
     */
    pc: 0,
    /**
     * @property {int} acc                  - Accumulator
     */
    acc: 0,
    /**
     * @property {int} xReg                 - X Register
     */
    xReg: 0,
    /**
     * @property {int} yReg                 - Y Register
     */
    yReg: 0,
    /**
     * @property {int} zFlag                - zero flag
     */
    zFlag: 0,
    /**
     * @property {int} priority             - Process Priority
     */
    priority: 0,
    /**
     * @property {array} slots              - Memory addresses in which the process is occupying
     */
    slots: [],
    /**
     * @property {string} state             - Process State (new, running, waiting, ready, terminated)
     */
    state: "new",
    /**
     * @property {int} slot                 - slot in which the process is loaded
     */
    slot: 0,
    /**
     * @property {int} base                 - Base for a process
     */
    base: 0,
    /**
     * @property {int} limit                - Memory limit for a process
     */
    limit: 0,
    /**
     * @property {int} programSize          - Size of program
     */
    programSize: 0,
    /**
     * Constructor
     * @param {object} options
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);
    }
});