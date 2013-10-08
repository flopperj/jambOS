/**
 * =============================================================================
 * Console.js 
 * 
 * The OS Console - stdIn and stdOut by default.
 * Note: This is not the Shell.  The Shell is the "command line interface" (CLI) 
 * or interpreter for this console.
 * 
 * @requires globals.js
 * @public
 * @class Console
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.Console = jambOS.util.createClass(/** @scope jambOS.OS.Console.prototype */{
    /**
     * @property {string}   buffer          - Contains the current typed data
     */
    buffer: "",
    /**
     * @property {string}   currentFont     - current font family
     */
    currentFont: _DefaultFontFamily,
    /**
     * @property {int}      currentFontSize - current fontsize
     */
    currentFontSize: _DefaultFontSize,
    /**
     * @property {int}      currentXPosition - current x position
     */
    currentXPosition: 0,
    /**
     * @property {int}      currentYPosition - current y position
     */
    currentYPosition: _DefaultFontSize,
    /**
     * Constructor
     */
    initialize: function() {
        this.clearScreen();
        this.resetXY();
        this.initTaskbar();
    },
    /**
     * Initializes our taskbar
     * @public
     * @method initTaskbar
     */
    initTaskbar: function() {
        var date = new Date();
        _TaskbarContext.font = "bold 12px Arial";
        _TaskbarContext.fillText(date.toLocaleString(), 16, 16);
        _TaskbarContext.fillText("Status: OS is running...", 200, 16);

        // redraw section every second
        window.setInterval(function() {
            date = new Date();
            _TaskbarContext.clearRect(16, 0, 165, 20);
            _TaskbarContext.fillText(date.toLocaleString(), 16, 16);
        }, 1000);
    },
    /**
     * Clears the canvas
     * @public
     * @method clearScreen
     */
    clearScreen: function() {
        _Canvas.height = 480;
        _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    },
    /**
     * Resets the X & Y positions of the cursor
     * @public
     * @method resetXY
     */
    resetXY: function() {
        this.currentXPosition = 0;
        this.currentYPosition = this.currentFontSize + 5;
    },
    /**
     * Handles console input
     * @public
     * @method handleInput
     */
    handleInput: function() {
        while (_KernelInputQueue.getSize() > 0)
        {
            // Get the next character from the kernel input queue.
            var chr = _KernelInputQueue.dequeue();
            // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
            if (chr === String.fromCharCode(13))  //     Enter key
            {
                // The enter key marks the end of a console command, so ...
                // ... tell the shell ...
                _OsShell.handleInput(this.buffer);
                // ... and reset our buffer.
                this.buffer = "";
            }
            // TODO: Write a case for Ctrl-C.
            else
            {
                // This is a "normal" character, so ...
                // ... draw it on the screen...
                this.putText(chr);
                // ... and add it to our buffer.
                this.buffer += chr;
            }
        }
    },
    /**
     * Outputs text on the canvas console
     * @public
     * @method putText
     * @param {string} text         - Text that will be outputted on the console
     */
    putText: function(text) {
        // My first inclination here was to write two functions: putChar() and putString().
        // Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
        // between the two.  So rather than be like PHP and write two (or more) functions that
        // do the same thing, thereby encouraging confusion and decreasing readability, I
        // decided to write one function and use the term "text" to connote string or char.
        if (text !== "")
        {
            // Draw the text at the current X and Y coordinates.
            _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, text);
            // Move the current X position.
            var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, text);
            this.currentXPosition = this.currentXPosition + offset;
        }
    },
    /**
     * Handles new line advancement of the cursor
     * @public
     * @method advanceLine
     */
    advanceLine: function() {
        this.currentXPosition = 0;
        this.currentYPosition += _DefaultFontSize + _FontHeightMargin;

        // Handle scrolling.
        if ((this.currentYPosition + (this.currentFontSize * 4)) > _Canvas.height) {
            var bufferCanvas = document.createElement('canvas');
            var buffer = bufferCanvas.getContext("2d");

            bufferCanvas.style.diplay = "none";
            bufferCanvas.width = _Canvas.width;
            bufferCanvas.height = _Canvas.height;

            var canvasData = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);

            // draw current canvas image on buffer
            buffer.putImageData(canvasData, 0, 0);

            canvasData = buffer.getImageData(0, 0, _Canvas.width, _Canvas.height);

            _Canvas.height = _Canvas.height + (_Console.currentFontSize * 4);

            // redraw everything on the resized canvas
            _DrawingContext.putImageData(canvasData, 0, 0);

            // scroll to the bottom
            var consoleDiv = $("#divConsole .canvas");
            consoleDiv.scrollTop(consoleDiv.height());
        }
    }
});