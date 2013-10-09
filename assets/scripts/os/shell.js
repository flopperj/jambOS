/* ------------
 Shell.js
 
 The OS Shell - The "command line interface" (CLI) for the console.
 ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

function Shell() {
    // Properties
    this.promptStr = ">";
    this.commandList = [];
    this.curses = "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
    this.apologies = "[sorry]";

    // Methods
    this.init = shellInit;
    this.putPrompt = shellPutPrompt;
    this.handleInput = shellHandleInput;
    this.execute = shellExecute;
}

function shellInit() {
    var sc = null;
    //
    // Load the command list.

    // date
    sc = new ShellCommand("date", "- Displays the current date and time", function()
    {
        var date = new Date();
        _StdIn.putText(date.toString());
    });
    this.commandList.push(sc);

    // whereami
    sc = new ShellCommand("whereami", "- Displays the current location", function() {

        var output = window.location.href;

        _StdIn.putText(output);
    });
    this.commandList.push(sc);

    // whoisawesome
    sc = new ShellCommand("whoisawesome", "- Displays emotiocon of person", function() {
        _StdIn.putText("YOU ARE!!!!! d(*_*)b");
    });
    this.commandList.push(sc);

    // status
    sc = new ShellCommand("status", "<string> - Sets status message on taskbar", function(args) {
        _TaskbarContext.font = "bold 12px Arial";
        if (args[0]) {
            _TaskbarContext.clearRect(165, 0, 300, 20);
            _TaskbarContext.fillText(args[0], 200, 16);
        } else {
            _TaskbarContext.clearRect(165, 0, 300, 20);
            _TaskbarContext.fillText("OS is running...", 200, 16);
            _StdIn.putText("Usage: status <String> - Sets status message on taskbar");
        }
    });
    this.commandList.push(sc);

    // load
    sc = new ShellCommand("load", "- loads commands from the user input text area", function() {
        var textInput = $("#taProgramInput").val();
        if (/^[0-9a-f]{2}( [0-9a-f]{2})*$/i.test(textInput) && textInput.trim()) {
            var proccess = _Kernel.processManager.load(textInput.split(/\s/));
            _StdIn.putText("Process " + proccess.pid + " has been added to memory");

        } else if (!textInput.trim())
            _StdIn.putText("Please enter an input value then call the load command");
        else
            _StdIn.putText("Sorry I can only accept valid hex digit values :(");
    });
    this.commandList.push(sc);

    // psod
    sc = new ShellCommand("psod", "- simulates an OS error", function() {
        _TaskbarCanvas.style.backgroundColor = "pink";
        $("#divConsole, #taLog, #taProgramInput").css({background: "pink"});
        return _Kernel.trapError("Pink screen of death!", true);
    });
    this.commandList.push(sc);

    // ver
    sc = new ShellCommand("ver", "- Displays the current version data.", function(args)
    {
        _StdIn.putText(jambOS.name + " version " + jambOS.version);
    });
    this.commandList.push(sc);

    // help
    sc = new ShellCommand("help", "- This is the help command. Seek help.", function(args)
    {
        _StdIn.putText("Commands:");
        for (var i in _OsShell.commandList)
        {
            _StdIn.advanceLine();
            _StdIn.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
        }
    });
    this.commandList.push(sc);

    // shutdown
    sc = new ShellCommand("shutdown", "- Shuts down the virtual OS but leaves the underlying hardware simulation running.", function(args)
    {
        _StdIn.putText("Shutting down...");
        // Call Kernel shutdown routine.
        _Kernel.shutdown();
        // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
    });
    this.commandList.push(sc);

    // cls
    sc = new ShellCommand("cls", "- Clears the screen and resets the cursor position.", function(args)
    {
        _StdIn.clearScreen();
        _StdIn.resetXY();
    });
    this.commandList.push(sc);

    // man <topic>
    sc = new ShellCommand("man", "<topic> - Displays the MANual page for <topic>.", function(args)
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
    });
    this.commandList.push(sc);

    // trace <on | off>
    sc = new ShellCommand("trace", "<on | off> - Turns the OS trace on or off.", function(args)
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
    });
    this.commandList.push(sc);

    // rot13 <string>
    sc = new ShellCommand("rot13", "<string> - Does rot13 obfuscation on <string>.", function(args)
    {
        if (args.length > 0)
        {
            _StdIn.putText(args[0] + " = '" + rot13(args[0]) + "'");     // Requires Utils.js for rot13() function.
        }
        else
        {
            _StdIn.putText("Usage: rot13 <string>  Please supply a string.");
        }
    });
    this.commandList.push(sc);

    // prompt <string>
    sc = new ShellCommand("prompt", "<string> - Sets the prompt.",
            function(args)
            {
                if (args.length > 0)
                {
                    _OsShell.promptStr = args[0];
                }
                else
                {
                    _StdIn.putText("Usage: prompt <string>  Please supply a string.");
                }
            });
    this.commandList.push(sc);

    // processes - list the running processes and their IDs
    // kill <id> - kills the specified process id.


    // run
    sc = new ShellCommand("run", "<id> - Runs program already in memory", function(args) {
        var pid = parseInt(args[0]);
        var pcb = $.grep(_Kernel.processManager.processes, function(el) {
            return el.pid === pid;
        })[0];

        if (pcb) {
            _Kernel.processManager.execute(pcb);
        } else
            _StdIn.putText("Invalid Process ID");
    });
    this.commandList.push(sc);

    //
    // Display the initial prompt.
    this.putPrompt();
}

function shellPutPrompt()
{
    _StdIn.putText(this.promptStr);
}

function shellHandleInput(buffer)
{
    _Kernel.trace("Shell Command~" + buffer);
    // 
    // Parse the input...
    //
    var userCommand = new UserCommand();
    userCommand = shellParseInput(buffer);
    // ... and assign the command and args to local variables.
    var cmd = userCommand.command;
    var args = userCommand.args;
    //
    // Determine the command and execute it.
    //
    // JavaScript may not support associative arrays in all browsers so we have to
    // iterate over the command list in attempt to find a match.  TODO: Is there a better way? Probably.
    var index = 0;
    var found = false;
    while (!found && index < this.commandList.length)
    {
        if (this.commandList[index].command === cmd)
        {
            found = true;
            var fn = this.commandList[index].function;
        }
        else
        {
            ++index;
        }
    }
    if (found)
    {
        this.execute(fn, args);
    }
    else
    {
        // It's not found, so check for curses and apologies before declaring the command invalid.
        if (this.curses.indexOf("[" + rot13(cmd) + "]") >= 0)      // Check for curses.
        {
            this.execute(shellCurse);
        }
        else if (this.apologies.indexOf("[" + cmd + "]") >= 0)      // Check for apologies.
        {
            this.execute(shellApology);
        }
        else    // It's just a bad command.
        {
            this.execute(shellInvalidCommand);
        }
    }
}

function shellParseInput(buffer)
{
    var retVal = new UserCommand();

    // 1. Remove leading and trailing spaces.
    buffer = trim(buffer);

    // 2. Lower-case it.
    buffer = buffer.toLowerCase();

    // 3. Separate on spaces so we can determine the command and command-line args, if any.
    var tempList = buffer.split(" ");

    // 4. Take the first (zeroth) element and use that as the command.
    var cmd = tempList.shift();  // Yes, you can do that to an array in JavaScript.  See the Queue class.
    // 4.1 Remove any left-over spaces.
    cmd = trim(cmd);
    // 4.2 Record it in the return value.
    retVal.command = cmd;

    // 5. Now create the args array from what's left.
    for (var i in tempList)
    {
        var arg = trim(tempList[i]);
        if (arg !== "")
        {
            retVal.args[retVal.args.length] = tempList[i];
        }
    }
    return retVal;
}

function shellExecute(fn, args)
{
    // We just got a command, so advance the line...
    _StdIn.advanceLine();
    // ... call the command function passing in the args...
    fn(args);
    // Check to see if we need to advance the line again
    if (_StdIn.currentXPosition > 0)
    {
        _StdIn.advanceLine();
    }
    // ... and finally write the prompt again.
    this.putPrompt();
}


//
// The rest of these functions ARE NOT part of the Shell "class" (prototype, more accurately), 
// as they are not denoted in the constructor.  The idea is that you cannot execute them from
// elsewhere as shell.xxx .  In a better world, and a more perfect JavaScript, we'd be
// able to make then private.  (Actually, we can. have a look at Crockford's stuff and Resig's JavaScript Ninja cook.)
//

//
// An "interior" or "private" class (prototype) used only inside Shell() (we hope).
//
function ShellCommand(command, description, fn)
{
    // Properties
    this.command = command;
    this.description = description;
    this.function = fn;

}

//
// Another "interior" or "private" class (prototype) used only inside Shell() (we hope).
//
function UserCommand()
{
    // Properties
    this.command = "";
    this.args = [];
}


//
// Shell Command Functions.  Again, not part of Shell() class per se', just called from there.
//
function shellInvalidCommand()
{
    _StdIn.putText("Invalid Command. ");
    if (_SarcasticMode)
    {
        _StdIn.putText("Duh. Go back to your Speak & Spell.");
    }
    else
    {
        _StdIn.putText("Type 'help' for, well... help.");
    }
}

function shellCurse()
{
    _StdIn.putText("Oh, so that's how it's going to be, eh? Fine.");
    _StdIn.advanceLine();
    _StdIn.putText("Bitch.");
    _SarcasticMode = true;
}

function shellApology()
{
    if (_SarcasticMode) {
        _StdIn.putText("Okay. I forgive you. This time.");
        _SarcasticMode = false;
    } else {
        _StdIn.putText("For what?");
    }
}
