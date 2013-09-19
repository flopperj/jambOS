/* ----------------------------------
 DeviceDriverKeyboard.js
 
 Requires deviceDriver.js
 
 The Kernel Keyboard Device Driver.
 ---------------------------------- */

DeviceDriverKeyboard.prototype = new DeviceDriver;  // "Inherit" from prototype DeviceDriver in deviceDriver.js.

function DeviceDriverKeyboard()                     // Add or override specific attributes and method pointers.
{
    // "subclass"-specific attributes.
    // this.buffer = "";    // TODO: Do we need this?
    // Override the base method pointers.
    this.driverEntry = krnKbdDriverEntry;
    this.isr = krnKbdDispatchKeyPress;
    // "Constructor" code.
}

function krnKbdDriverEntry()
{
    // Initialization routine for this, the kernel-mode Keyboard Device Driver.
    this.status = "loaded";
    // More?
}

function krnKbdDispatchKeyPress(params)
{
    // Parse the params.
    var keyCode = params[0];
    var isShifted = params[1];

    // Check that they are valid and osTrapError if not.
    var valid = ((keyCode >= 48) && (keyCode <= 57)) || // digits 
            ((keyCode >= 65) && (keyCode <= 90)) || // A..Z
            ((keyCode >= 97) && (keyCode <= 123)) || // a..z
            (keyCode === 32) || // space
            (keyCode === 13) || // enter
            (keyCode === 8) || // backspace
            (keyCode === 38) || // up
            (keyCode === 40) || // down
            (keyCode >= 186) && (keyCode <= 192) || // punctuation characters
            (keyCode >= 219 && (keyCode <= 222)) || // punctuation characters
            keyCode === 16 || // shift
            keyCode === 20 || // Caps-Lock
            keyCode === 8;  // backspace    

    if (!valid) {
        // throw an error but do not kill the OS
        krnTrapError("Oh bummer, I wish I could have had some use for that key! :(", false);

        // move to new line
        _Console.advanceLine();
        _StdIn.putText(">");
    }


    krnTrace("Key code:" + keyCode + " shifted:" + isShifted);
    var chr = "";
    
    // Check to see if we even want to deal with the key that was pressed.
    if (((keyCode >= 65) && (keyCode <= 90)) || // A..Z
            ((keyCode >= 97) && (keyCode <= 123)))   // a..z
    {
        // Determine the character we want to display.  
        // Assume it's lowercase...
        chr = String.fromCharCode(keyCode + 32);
        
        // ... then check the shift key and re-adjust if necessary.
        // TODO: Check for caps-lock and handle as shifted if so.
        if (isShifted)
        {
            chr = String.fromCharCode(keyCode);
        }
    
        _KernelInputQueue.enqueue(chr);
    }
    else if (((keyCode >= 48) && (keyCode <= 57)) || // digits 
            (keyCode === 32) || // space
            (keyCode === 13) || // enter
            (keyCode === 8) || // backspace
            (keyCode === 38) || // up
            (keyCode === 40) || // down
            (keyCode >= 186) && (keyCode <= 192) ||
            (keyCode >= 219 && (keyCode <= 222)))
    {

        chr = String.fromCharCode(keyCode);

        //==========================================//
        // Handle panctuations
        //==========================================//
        // exclamation-mark
        if (keyCode === 49 && isShifted)
            chr = "!";

        // at-symbol
        if (keyCode === 50 && isShifted)
            chr = "@";

        // hash
        if (keyCode === 51 && isShifted)
            chr = "#";

        // dollar-sign
        if (keyCode === 52 && isShifted)
            chr = "$";

        // percent    
        if (keyCode === 53 && isShifted)
            chr = "%";

        // caret        
        if (keyCode === 54 && isShifted)
            chr = "^";

        // and-percent        
        if (keyCode === 55 && isShifted)
            chr = "&";

        // asterik     
        if (keyCode === 56 && isShifted)
            chr = "*";


        // open-parenthesis        
        if (keyCode === 57 && isShifted)
            chr = "(";

        // close-parenthesis
        if (keyCode === 48 && isShifted)
            chr = ")";

        // semi-colon & colon
        if (keyCode === 186 && !isShifted)
            chr = ";";
        else if (keyCode === 186 && isShifted)
            chr = ":";

        // equal-sign & plus
        if (keyCode === 187 && !isShifted)
            chr = "=";
        else if (keyCode === 187 && isShifted)
            chr = "+";

        // coma & less-than
        if (keyCode === 188 && !isShifted)
            chr = ",";
        else if (keyCode === 188 && isShifted)
            chr = "<";

        // dash & underscore
        if (keyCode === 189 && !isShifted)
            chr = "-";
        else if (keyCode === 189 && isShifted)
            chr = "_";

        // period & greater-than
        if (keyCode === 190 && !isShifted)
            chr = ".";
        else if (keyCode === 190 && isShifted)
            chr = ">";

        // forward-slash & question-mark
        if (keyCode === 191 && !isShifted)
            chr = "/";
        else if (keyCode === 191 && isShifted)
            chr = "?";

        // grave-accent & squiglly
        if (keyCode === 192 && !isShifted)
            chr = "`";
        else if (keyCode === 192 && isShifted)
            chr = "~";

        // open-square-bracket & open-curly-brace
        if (keyCode === 219 && !isShifted)
            chr = "[";
        else if (keyCode === 219 && isShifted)
            chr = "{";

        // back-slash & bar
        if (keyCode === 220 && !isShifted)
            chr = "\\";
        else if (keyCode === 220 && isShifted)
            chr = "|";

        // close-square-bracket & close-curly-brace
        if (keyCode === 221 && !isShifted)
            chr = "]";
        else if (keyCode === 221 && isShifted)
            chr = "}";

        // single-quote & double-quote
        if (keyCode === 222 && !isShifted)
            chr = "'";
        else if (keyCode === 222 && isShifted)
            chr = "\"";


        //==========================================//
        // Handle command history
        //==========================================//
        // store commands when user presses the enter key
        if (keyCode === 13) {

            if (_Console.buffer.trim()) {
                _CommandHistory.push(_Console.buffer);
                _CurrentCommandIndex = _CommandHistory.length - 1;
            }
        }

        // handle moving through command history with up and down
        var command = "";

        // up
        if (keyCode === 38) {

            // scroll to the bottom
            var consoleDiv = document.getElementById("divConsole");

            if (consoleDiv.scrollTop !== consoleDiv.scrollHeight)
                consoleDiv.scrollTop = consoleDiv.scrollHeight;

            if (_CurrentCommandIndex > 0)
                _CurrentCommandIndex -= 1;
            else
                _CurrentCommandIndex = 0;

            command = _CommandHistory[_CurrentCommandIndex];

            var offset = _DrawingContext.measureText(_Console.CurrentFont, _Console.CurrentFontSize, ">");

            _Console.CurrentXPosition = offset;

            var xPos = _Console.CurrentXPosition;
            var yPos = (_Console.CurrentYPosition - _Console.CurrentFontSize) - 1;
            var width = 500;
            var height = _Console.CurrentFontSize + (_Console.CurrentFontSize / 2);

            // erase previous command
            _DrawingContext.clearRect(xPos, yPos, width, height);

            // display command on canvas
            if (command && _CommandHistory.length > 0) {
                _Console.buffer = command;
                _StdIn.putText(command);
            }
        }
        // down
        else if (keyCode === 40) {

            // scroll to the bottom
            var consoleDiv = document.getElementById("divConsole");

            if (consoleDiv.scrollTop !== consoleDiv.scrollHeight)
                consoleDiv.scrollTop = consoleDiv.scrollHeight;

            if (_CurrentCommandIndex < _CommandHistory.length)
                _CurrentCommandIndex += 1;
            else
                _CurrentCommandIndex = _CommandHistory.length - 1;

            command = _CommandHistory[_CurrentCommandIndex];

            var offset = _DrawingContext.measureText(_Console.CurrentFont, _Console.CurrentFontSize, ">");

            _Console.CurrentXPosition = offset;

            var xPos = _Console.CurrentXPosition;
            var yPos = (_Console.CurrentYPosition - _Console.CurrentFontSize) - 1;
            var width = 500;
            var height = _Console.CurrentFontSize + (_Console.CurrentFontSize / 2);

            // erase previous command
            _DrawingContext.clearRect(xPos, yPos, width, height);

            // display command on canvas
            if (command && _CommandHistory.length > 0) {
                _Console.buffer = command;
                _StdIn.putText(command);
            }

        }

        // handle backspace
        if (keyCode === 8 && _Console.buffer.length > 0) {

            var charToDel = _Console.buffer.charAt(_Console.buffer.length - 1);

            // remove last character from the buffer
            _Console.buffer = _Console.buffer.slice(0, -1);

            var charWidth = _DrawingContext.measureText(_Console.CurrentFont, _Console.CurrentFontSize, charToDel);
            _Console.CurrentXPosition -= charWidth;

            var xPos = _Console.CurrentXPosition;
            var yPos = (_Console.CurrentYPosition - _Console.CurrentFontSize) - 1;
            var width = charWidth;
            var height = _Console.CurrentFontSize + (_Console.CurrentFontSize / 2);
            _DrawingContext.clearRect(xPos, yPos, width, height);
        } else if (keyCode !== 38 && keyCode !== 40)
            _KernelInputQueue.enqueue(chr);
    }
}
