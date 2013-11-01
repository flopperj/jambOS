/**
 *==============================================================================
 * Class Shell
 * 
 * still in the works for re-working will implement this when time allows
 * Trying to have a cleaner shell class
 *    
 * @class Shell
 * @memberOf jambOS.OS
 * @inheritsFrom jambOS.OS.SystemServices
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.Shell = jambOS.util.createClass(jambOS.OS.SystemServices, /** @scope jambOS.OS.Shell.prototype */ {
    /**
     * @property {string} promptStr
     */
    promptStr: ">",
    /**
     * @property {array} commandList
     */
    commandList: [],
    /**
     * @property {string} curses 
     */
    curses: "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]",
    /**
     * @property {string} appologies
     */
    apologies: "[sorry]",
    /**
     * Constructor
     */
    initialize: function() {
        var sc = null;
        //
        // Load the command list.

        // date
        sc = new jambOS.OS.ShellCommand({
            command: "date",
            description: "- Displays the current date and time",
            behavior: function()
            {
                var date = new Date();
                _StdIn.putText(date.toString());
            }});
        this.commandList.push(sc);

        // whereami
        sc = new jambOS.OS.ShellCommand({
            command: "whereami",
            description: "- Displays the current location",
            behavior: function() {

                var output = window.location.href;

                _StdIn.putText(output);
            }});
        this.commandList.push(sc);

        // whoisawesome
        sc = new jambOS.OS.ShellCommand({
            command: "whoisawesome",
            description: "- Displays emotiocon of person",
            behavior: function() {
                _StdIn.putText("YOU ARE!!!!! d(*_*)b");
            }});
        this.commandList.push(sc);

        // status
        sc = new jambOS.OS.ShellCommand({
            command: "status",
            description: "<string> - Sets status message on taskbar",
            behavior: function(args) {
                _TaskbarContext.font = "bold 12px Arial";
                if (args.length > 0) {
                    _TaskbarContext.clearRect(165, 0, 400, 20);
                    _TaskbarContext.fillText("Status: " + args.join(" "), 200, 16);
                } else {
                    _TaskbarContext.clearRect(165, 0, 400, 20);
                    _TaskbarContext.fillText("Status: OS is running...", 200, 16);
                    _StdIn.putText("Usage: status <String> - Sets status message on taskbar");
                }
            }});
        this.commandList.push(sc);

        // load
        sc = new jambOS.OS.ShellCommand({
            command: "load",
            description: "- loads commands from the user input text area",
            behavior: function() {
                var textInput = $("#taProgramInput").val();
                var isValid = /^[0-9a-f]{2}( [0-9a-f]{2})*$/i.test(textInput);
                var process = isValid ? _Kernel.processManager.load(textInput.split(/\s/)) : null;
                if (isValid && textInput.trim() && process !== undefined) {
                    _StdIn.putText("Process " + process.pid + " has been added to memory");
                } else if (!textInput.trim())
                    _StdIn.putText("Please enter an input value then call the load command");
                else
                    _StdIn.putText("Invalid program");
            }});
        this.commandList.push(sc);

        // psod
        sc = new jambOS.OS.ShellCommand({
            command: "psod",
            description: "- simulates an OS error",
            behavior: function() {
                _TaskbarCanvas.style.backgroundColor = "pink";
                $("#divConsole, #taLog, #taProgramInput, #memory .content, #cpuStatus .content").css({background: "pink"});
                return _Kernel.trapError("Pink screen of death!", true);
            }});
        this.commandList.push(sc);

        // ver
        sc = new jambOS.OS.ShellCommand({
            command: "ver",
            description: "- Displays the current version data.",
            behavior: function(args)
            {
                _StdIn.putText(jambOS.name + " version " + jambOS.version);
            }});
        this.commandList.push(sc);

        // help
        sc = new jambOS.OS.ShellCommand({
            command: "help",
            description: "- This is the help command. Seek help.",
            behavior: function(args)
            {
                _StdIn.putText("Commands:");
                for (var i in _OsShell.commandList)
                {
                    _StdIn.advanceLine();
                    _StdIn.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
                }
                _StdIn.advanceLine();
            }});
        this.commandList.push(sc);

        // shutdown
        sc = new jambOS.OS.ShellCommand({
            command: "shutdown",
            description: "- Shuts down the virtual OS but leaves the underlying hardware simulation running.",
            behavior: function(args) {
                _StdIn.putText("Shutting down...");
                // Call Kernel shutdown routine.
                _Kernel.shutdown();
                // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
            }});
        this.commandList.push(sc);

        // clear
        sc = new jambOS.OS.ShellCommand({
            command: "clear",
            description: "- Clears the screen and resets the cursor position.",
            behavior: function(args)
            {
                _StdIn.clearScreen();
                _StdIn.resetXY();
            }});
        this.commandList.push(sc);

        // man <topic>
        sc = new jambOS.OS.ShellCommand({
            command: "man",
            description: "<topic> - Displays the MANual page for <topic>.",
            behavior: function(args)
            {
                if (args.length > 0)
                {
                    var topic = args[0];
                    switch (topic)
                    {
                        case "help":
                            _StdIn.putText("Help displays a list of (hopefully) valid commands.");
                            break;
                        default:
                            _StdIn.putText("No manual entry for " + args[0] + ".");
                    }
                }
                else
                {
                    _StdIn.putText("Usage: man <topic>  Please supply a topic.");
                }
            }});
        this.commandList.push(sc);

        // trace <on | off>
        sc = new jambOS.OS.ShellCommand({
            command: "trace",
            description: "<on | off> - Turns the OS trace on or off.",
            behavior: function(args)
            {
                if (args.length > 0)
                {
                    var setting = args[0];
                    switch (setting)
                    {
                        case "on":
                            if (_Trace && _SarcasticMode)
                            {
                                _StdIn.putText("Trace is already on, dumbass.");
                            }
                            else
                            {
                                _Trace = true;
                                _StdIn.putText("Trace ON");
                            }

                            break;
                        case "off":
                            _Trace = false;
                            _StdIn.putText("Trace OFF");
                            break;
                        default:
                            _StdIn.putText("Invalid arguement.  Usage: trace <on | off>.");
                    }
                }
                else
                {
                    _StdIn.putText("Usage: trace <on | off>");
                }
            }});
        this.commandList.push(sc);

        // rot13 <string>
        sc = new jambOS.OS.ShellCommand({
            command: "rot13",
            description: "<string> - Does rot13 obfuscation on <string>.",
            behavior: function(args)
            {
                if (args.length > 0)
                {
                    _StdIn.putText(args[0] + " = '" + jambOS.util.rot13(args[0]) + "'");     // Requires Utils.js for jambOS.util.rot13() function.
                }
                else
                {
                    _StdIn.putText("Usage: rot13 <string>  Please supply a string.");
                }
            }});
        this.commandList.push(sc);

        // prompt <string>
        sc = new jambOS.OS.ShellCommand({
            command: "prompt",
            description: "<string> - Sets the prompt.",
            behavior: function(args)
            {
                if (args.length > 0)
                {
                    _OsShell.promptStr = args[0];
                }
                else
                {
                    _StdIn.putText("Usage: prompt <string>  Please supply a string.");
                }
            }});
        this.commandList.push(sc);

        // processes - list the running processes and their IDs
        // kill <id> - kills the specified process id.


        // run <id>
        sc = new jambOS.OS.ShellCommand({
            command: "run",
            description: "<id> - Runs program already in memory",
            behavior: function(args) {
                var pid = parseInt(args[0]);
                var pcb = $.grep(_Kernel.processManager.processes, function(el) {
                    return el.pid === pid;
                })[0];                

                if (args[0] && pcb && !_Stepover) {
                    _Kernel.processManager.set("activeSlot", pcb.slot);
                    _Kernel.processManager.execute(pcb);
                } else if (args[0] && pcb && _Stepover) {
                    _StdIn.putText("stepover is ON. Use the stepover button to run program.");
                } else if (args[0] && !pcb)
                    _StdIn.putText("Invalid Process ID");
                else
                    _StdIn.putText("Usage: run <id> - Runs program already in memory");
            }});
        this.commandList.push(sc);

        // stepover <on | off>
        sc = new jambOS.OS.ShellCommand({
            command: "stepover",
            description: "<on | off> - Turns the OS stepover on or off.",
            behavior: function(args)
            {
                if (args.length > 0)
                {
                    var setting = args[0];
                    switch (setting)
                    {
                        case "on":
                            if (_Stepover && _SarcasticMode)
                            {
                                _StdIn.putText("Stepover is already on, dumbass.");
                            }
                            else
                            {
                                _Stepover = true;
                                _StdIn.putText("Stepover ON");
                            }

                            break;
                        case "off":
                            _Stepover = false;
                            _StdIn.putText("Stepover OFF");
                            break;
                        default:
                            _StdIn.putText("Invalid arguement.  Usage: stepover <on | off>.");
                    }
                }
                else
                {
                    _StdIn.putText("Usage: stepover <on | off>");
                }
            }});
        this.commandList.push(sc);


        //
        // Display the initial prompt.
        this.putPrompt();
    }
});
