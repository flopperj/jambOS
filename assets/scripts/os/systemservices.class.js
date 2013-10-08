jambOS.OS.SystemServices = jambOS.util.createClass({
    type: "systemservices",
    /**
     * Construct
     */
    initialize: function() {
    },
    shellPutPrompt: function()
    {
        _StdIn.putText(this.promptStr);
    },
    shellHandleInput: function(buffer)
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
    },
    shellParseInput: function(buffer)
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
    },
    shellExecute: function(fn, args)
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
});
