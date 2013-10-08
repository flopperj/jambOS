jambOS.OS.ShellCommand = jambOS.util.createClass(/** @scope jambOS.OS.ShellCommand.prototype */{
    type: "shellcommand",
    command: null,
    description: null,
    function: null,
    /**
     * Constructor
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);
        return this;
    },
});