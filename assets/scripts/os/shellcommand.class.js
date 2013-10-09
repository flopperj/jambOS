/**
 *==============================================================================
 * Class ShellCommand
 *    
 * @class ShellCommand
 * @memberOf jambOS.OS
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.ShellCommand = jambOS.util.createClass(/** @scope jambOS.OS.ShellCommand.prototype */{
    type: "shellcommand",
    command: null,
    description: null,
    behavior: null,
    /**
     * Constructor
     * @param {object} options              - values to initialize the class with
     */
    initialize: function(options) {
        this.command = options.command;
        this.description = options.description;
        this.behavior = options.behavior;
        return this;
    },
    /**
     * Executes shell command
     * @returns {function} behavior
     */
    execute: function() {
        return this.behavior();
    }
});