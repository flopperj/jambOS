/**
 * jambOS
 * 
 * @author                  James Arama
 * @copyright               2012-2013
 * @version                 1.0
 */


var jambOS = jambOS || {version: "1.0"};


/**
 * Utility scope for jambOS
 * @property {scope}
 */
jambOS.util = {};

/**
 * OS scope for jambOS
 * @property {scope}
 */
jambOS.OS = {};

/**
 * Host scope for jambOS
 * @property {scope}
 */
jambOS.host = {};

//
// Global CONSTANTS
//
var APP_NAME = "JambOS";  // 'cause I was at a loss for a better name.
var APP_VERSION = "1.00";   // What did you expect?

var CPU_CLOCK_INTERVAL = 100;   // This is in ms, or milliseconds, so 1000 = 1 second.

var TIMER_IRQ = 0;  // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
                    // NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
var KEYBOARD_IRQ = 1;  


//
// Global Variables
//
var _CPU = null;

var _OSclock = 0;       // Page 23.

var _Mode = 0;   // 0 = Kernel Mode, 1 = User Mode.  See page 21.

var _Canvas = null;               // Initialized in hostInit().
var _TaskbarCanvas = null;        // Initialized in hostInit().
var _DrawingContext = null;       // Initialized in hostInit().
var _TaskbarContext = null;       // Initialized in hostInit().
var _DefaultFontFamily = "sans";  // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
var _DefaultFontSize = 13;
var _FontHeightMargin = 4;        // Additional space added to font size when advancing a line.

// Default the OS trace to be on.
var _Trace = true;

// OS queues
var _KernelInterruptQueue = null;
var _KernelBuffers = null;
var _KernelInputQueue = null;

// Standard input and output
var _StdIn  = null;
var _StdOut = null;

// UI
var _Console = null;
var _OsShell = null;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode = false;

// Kernel
var _Kernel = null;

// Control 
var _Control = null;

// Device
var _Device = null;

// For testing...
var _GLaDOS = null;

// for command history
var _CommandHistory = [];
var _CurrentCommandIndex = -1;

// bakward compatibility vars with previous code base
krnInterruptHandler = null;
(function() {

    var slice = Array.prototype.slice, emptyFunction = function() {
    };

    var IS_DONTENUM_BUGGY = (function() {
        for (var p in {toString: 1}) {
            if (p === 'toString')
                return false;
        }
        return true;
    })();

    /** @ignore */
    var addMethods = function(klass, source, parent) {
        for (var property in source) {

            if (property in klass.prototype &&
                    typeof klass.prototype[property] === 'function' &&
                    (source[property] + '').indexOf('callSuper') > -1) {

                klass.prototype[property] = (function(property) {
                    return function() {

                        var superclass = this.constructor.superclass;
                        this.constructor.superclass = parent;
                        var returnValue = source[property].apply(this, arguments);
                        this.constructor.superclass = superclass;

                        if (property !== 'initialize') {
                            return returnValue;
                        }
                    };
                })(property);
            }
            else {
                klass.prototype[property] = source[property];
            }

            if (IS_DONTENUM_BUGGY) {
                if (source.toString !== Object.prototype.toString) {
                    klass.prototype.toString = source.toString;
                }
                if (source.valueOf !== Object.prototype.valueOf) {
                    klass.prototype.valueOf = source.valueOf;
                }
            }
        }
    };

    function Subclass() {
    }

    function callSuper(methodName) {
        var fn = this.constructor.superclass.prototype[methodName];
        return (arguments.length > 1)
                ? fn.apply(this, slice.call(arguments, 1))
                : fn.call(this);
    }

    /**
     * Helper for creation of "classes". Note that pr
     * @method createClass
     * @param parent optional "Class" to inherit from
     * @param properties Properties shared by all instances of this class
     *                  (be careful modifying objects defined here as this would affect all instances)
     * @memberOf fabric.util
     */
    function createClass() {
        var parent = null,
                properties = slice.call(arguments, 0);

        if (typeof properties[0] === 'function') {
            parent = properties.shift();
        }
        function klass() {
            this.initialize.apply(this, arguments);
        }

        klass.superclass = parent;
        klass.subclasses = [];

        if (parent) {
            Subclass.prototype = parent.prototype;
            klass.prototype = new Subclass();
            parent.subclasses.push(klass);
        }
        for (var i = 0, length = properties.length; i < length; i++) {
            addMethods(klass, properties[i], parent);
        }
        if (!klass.prototype.initialize) {
            klass.prototype.initialize = emptyFunction;
        }
        klass.prototype.constructor = klass;
        klass.prototype.callSuper = callSuper;

        /**
         * @property {string} type                 - type of klass
         */
        klass.prototype.type = klass.prototype.type ? klass.prototype.type : "Klass";

        /**
         * Returns a string representation of an instance      
         * @method toString                     
         * @return {String}                        - String representation of a
         *                                           Klass object
         */
        klass.prototype.toString = function() {
            return "#<jambOS." + this.type.capitalize() + ">";
        };

        /**
         * Basic getter
         * @public
         * @method get
         * @param {String} property               - Key of property we want to get
         *                                          from the monument
         * @return {Any}                          - value of a property
         */
        klass.prototype.get = function(property) {
            return this[property];
        };
        /**
         * Sets property to a given value
         * @public
         * @method set
         * @param {String} key                    - Key we want to set the value for
         * @param {Object|Function} value         - Value of property we want to set
         * @return {jambOS.Klass} thisArg
         * @chainable
         */
        klass.prototype.set = function(key, value) {
            if (typeof key === 'object') {
                for (var prop in key) {
                    this._set(prop, key[prop]);
                }
            }
            else {
                if (typeof value === 'function') {
                    this._set(key, value(this.get(key)));
                }
                else {
                    this._set(key, value);
                }
            }
            return this;
        };

        /**
         * @private
         * @method _set
         * @param key
         * @param value
         */
        klass.prototype._set = function(key, value) {

            this[key] = value;

            return this;
        };

        /**
         * Sets object's properties from options provided
         * @public
         * @method setOptions
         * @param {Object} [options]
         * @returns {jambOS.Monument}
         */
        klass.prototype.setOptions = function(options) {
            for (var prop in options) {
                this.set(prop, options[prop]);
            }
            return this;
        };

        return klass;
    }

    jambOS.util.createClass = createClass;

})();

// initialize host
$(document).ready(function(){
    _Control = new jambOS.host.Control();
});


function trim(str) {     // Use a regular expression to remove leading and trailing spaces.
    return str.replace(/^\s+ | \s+$/g, "");
    /* 
     Huh?  Take a breath.  Here we go:
     - The "|" separates this into two expressions, as in A or B.
     - "^\s+" matches a sequence of one or more whitespace characters at the beginning of a string.
     - "\s+$" is the same thing, but at the end of the string.
     - "g" makes is global, so we get all the whitespace.
     - "" is nothing, which is what we replace the whitespace with.
     */

}

function rot13(str) {   // An easy-to understand implementation of the famous and common Rot13 obfuscator.
    // You can do this in three lines with a complex regular expression, but I'd have
    var retVal = "";    // trouble explaining it in the future.  There's a lot to be said for obvious code.
    for (var i in str) {
        var ch = str[i];
        var code = 0;
        if ("abcedfghijklmABCDEFGHIJKLM".indexOf(ch) >= 0) {
            code = str.charCodeAt(i) + 13;  // It's okay to use 13.  It's not a magic number, it's called rot13.
            retVal = retVal + String.fromCharCode(code);
        } else if ("nopqrstuvwxyzNOPQRSTUVWXYZ".indexOf(ch) >= 0) {
            code = str.charCodeAt(i) - 13;  // It's okay to use 13.  See above.
            retVal = retVal + String.fromCharCode(code);
        } else {
            retVal = retVal + ch;
        }
    }
    return retVal;
}


/**
 * =============================================================================
 * Control.js
 * 
 * Routines for the hardware simulation, NOT for our client OS itself. In this manner, it's A LITTLE BIT like a hypervisor,
 * in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code that
 * hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using JavaScript in 
 * both the host and client environments.
 * 
 * This (and other host/simulation scripts) is the only place that we should see "web" code, like 
 * DOM manipulation and JavaScript event handling, and so on.  (Index.html is the only place for markup.)
 * 
 * This code references page numbers in the text book: 
 * Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
 * 
 * @requires globals.js
 * @public
 * @class Control
 * @memberOf jambOS.host
 * =============================================================================
 */

jambOS.host.Control = jambOS.util.createClass(/** @scope jambOS.host.Control.prototype */{
    /**
     * Constructor
     */
    initialize: function() {

        var self = this;

        // initialize Kernel
        _Kernel = new jambOS.OS.Kernel();
        
        // initialize host device routines
        _Device = new jambOS.host.Device();

        // Get a global reference to the canvas.  TODO: Move this stuff into a Display Device Driver, maybe?
        _Canvas = document.getElementById('display');
        _Canvas.width = $("#divConsole").width() - 10;
        _TaskbarCanvas = document.createElement('canvas');
        _TaskbarCanvas.id = "taskbar";
        _TaskbarCanvas.width = $("#divConsole").width() - 10;
        _TaskbarCanvas.height = 22;
        _TaskbarCanvas.style.zIndex = 8;
        _TaskbarCanvas.style.position = "absolute";
        _TaskbarCanvas.style.borderBottom = "2px solid #000000";
        _TaskbarCanvas.style.background = "#DFDBC3";

        document.getElementById("divConsole").insertBefore(_TaskbarCanvas, _Canvas);

        // Get a global reference to the drawing context.
        _DrawingContext = _Canvas.getContext('2d');
        _TaskbarContext = _TaskbarCanvas.getContext('2d');

        // Enable the added-in canvas text functions (see canvastext.js for provenance and details).
        CanvasTextFunctions.enable(_DrawingContext);   // TODO: Text functionality is now built in to the HTML5 canvas. Consider using that instead.

        // Clear the log text box.
        document.getElementById("taLog").value = "";

        // Set focus on the start button.
        document.getElementById("btnStartOS").focus();

        // Check for our testing and enrichment core.
        if (typeof Glados === "function") {
            _GLaDOS = new Glados();
            _GLaDOS.init();
        }

        // host start, halt & reset buttons
        // start
        $("#btnStartOS").click(function() {
            self.startOS($(this));
        });

        // halt
        $("#btnHaltOS").click(function() {
            self.haltOS($(this));
        });

        // reset
        $("#btnReset").click(function() {
            self.resetOS($(this));
        });

    },
    /**
     * Helps keep a the log textarea updated
     * @public
     * @param {string} msg
     * @param {string} source
     */
    hostLog: function(msg, source)
    {
        // Check the source.
        if (!source) {
            source = "?";
        }

        // Note the OS CLOCK.
        var clock = _OSclock;

        // Note the REAL clock in milliseconds since January 1, 1970.
        var now = new Date().getTime();

        // Build the log string.   
        var str = "({ clock:" + clock + ", source:" + source + ", msg:" + msg + ", now:" + now + " })" + "\n";

        // Update the log console.
        var taLog = document.getElementById("taLog");
        taLog.value = str + taLog.value;
        // Optionally update a log database or some streaming service.
    },
    /**
     * Helps with starting the OS
     * @public
     * @param {HTMLElement} btn
     */
    startOS: function(btn)
    {
        // Disable the start button...
        btn.prop("disabled", true);

        // .. enable the Halt and Reset buttons ...
        $("#btnHaltOS").prop("disabled", false);
        $("#btnReset").prop("disabled", false);

        // .. set focus on the OS console display ... 
        document.getElementById("display").focus();

        // ... Create and initialize the CPU ...
        _CPU = new Cpu();
        _CPU.init();

        // ... then set the host clock pulse ...
        _hardwareClockID = setInterval(_Device.hostClockPulse, CPU_CLOCK_INTERVAL);
        // .. and call the OS Kernel Bootstrap routine.
        _Kernel.bootstrap();
    },
    /**
     * Halts the OS
     * @public
     * @param {HTMLElement} btn
     */
    haltOS: function(btn)
    {
        this.hostLog("emergency halt", "host");
        this.hostLog("Attempting Kernel shutdown.", "host");
        // Call the OS shutdown routine.
        _Kernel.shutdown();
        // Stop the JavaScript interval that's simulating our clock pulse.
        clearInterval(_hardwareClockID);
        // TODO: Is there anything else we need to do here?
    },
    /**
     * Helps with resets the the OS
     * @public
     * @param {HTMLElement} btn
     */
    resetOS: function(btn)
    {
        // The easiest and most thorough way to do this is to reload (not refresh) the document.
        location.reload(true);
        // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
        // be reloaded from the server. If it is false or not specified, the browser may reload the 
        // page from its cache, which is not what we want.
    }
});
/* ------------  
 Devices.js
 
 Requires global.js.
 
 Routines for the hardware simulation, NOT for our client OS itself. In this manner, it's A LITTLE BIT like a hypervisor,
 in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
 that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
 JavaScript in both the host and client environments.
 
 This (and simulation scripts) is the only place that we should see "web" code, like 
 DOM manipulation and JavaScript event handling, and so on.  (Index.html is the only place for markup.)
 
 This code references page numbers in the text book: 
 Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
 ------------ */

var _hardwareClockID = -1;

jambOS.host.Device = jambOS.util.createClass({
//
// Hardware/Host Clock Pulse
//
    hostClockPulse: function()
    {
        // Increment the hardware (host) clock.
        _OSclock++;
        // Call the kernel clock pulse event handler.
        _Kernel.onCPUClockPulse();
    },
//
// Keyboard Interrupt, a HARDWARE Interrupt Request. (See pages 560-561 in text book.)
//
    hostEnableKeyboardInterrupt: function()
    {
        // Listen for key press (keydown, actually) events in the Document
        // and call the simulation processor, which will in turn call the 
        // OS interrupt handler.
        document.addEventListener("keydown", _Device.hostOnKeypress, false);
    },
    hostDisableKeyboardInterrupt: function()
    {
        document.removeEventListener("keydown", _Device.hostOnKeypress, false);
    },
    hostOnKeypress: function(event)
    {
        var keyCode = (event.keyCode ? event.keyCode : event.which);

        // The canvas element CAN receive focus if you give it a tab index, which we have.
        // Check that we are processing keystrokes only from the canvas's id (as set in index.html).
        if (event.target.id === "display")
        {
            event.preventDefault();

            // Note the pressed key code in the params (Mozilla-specific).
            var params = new Array(keyCode, event.shiftKey);
            // Enqueue this interrupt on the kernel interrupt queue so that it gets to the Interrupt handler.
            _KernelInterruptQueue.enqueue(new Interrupt(KEYBOARD_IRQ, params));
        }
    }
});
/* ------------  
   CPU.js

   Requires global.js.
   
   Routines for the host CPU simulation, NOT for the OS itself.  
   In this manner, it's A LITTLE BIT like a hypervisor,
   in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
   that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
   JavaScript in both the host and client environments.

   This code references page numbers in the text book: 
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

function Cpu() {
    this.PC    = 0;     // Program Counter
    this.Acc   = 0;     // Accumulator
    this.Xreg  = 0;     // X register
    this.Yreg  = 0;     // Y register
    this.Zflag = 0;     // Z-ero flag (Think of it as "isZero".)
    this.isExecuting = false;
    
    this.init = function() {
        this.PC    = 0;
        this.Acc   = 0;
        this.Xreg  = 0;
        this.Yreg  = 0;
        this.Zflag = 0;      
        this.isExecuting = false;  
    };
    
    this.cycle = function() {
        _Kernel.trace("CPU cycle");
        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.
    };
}

/* ------------
   Interrupt.js   
   ------------ */
   
function Interrupt(_irq, _params) {
    // Properties
    this.irq = _irq;
    this.params = _params;
}

/* ----------------- *
 *   CanvasText.js   *
 *
 * Downloaded from http://www.federated.com/~jim/canvastext.
 *
 * This code is released to the public domain by Jim Studt, 2007.
 * He may keep some sort of up to date copy at http://www.federated.com/~jim/canvastext/
 *
 * Modifications by Alan G. Labouseur.
 *  - fixed comma
 *  - added semi-colon.
 *
 * ----------------- */

var CanvasTextFunctions = { };

CanvasTextFunctions.letters = {
    ' ': { width: 16, points: [] },
    '!': { width: 10, points: [[5,21],[5,7],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
    '"': { width: 16, points: [[4,21],[4,14],[-1,-1],[12,21],[12,14]] },
    '#': { width: 21, points: [[11,25],[4,-7],[-1,-1],[17,25],[10,-7],[-1,-1],[4,12],[18,12],[-1,-1],[3,6],[17,6]] },
    '$': { width: 20, points: [[8,25],[8,-4],[-1,-1],[12,25],[12,-4],[-1,-1],[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
    '%': { width: 24, points: [[21,21],[3,0],[-1,-1],[8,21],[10,19],[10,17],[9,15],[7,14],[5,14],[3,16],[3,18],[4,20],[6,21],[8,21],[10,20],[13,19],[16,19],[19,20],[21,21],[-1,-1],[17,7],[15,6],[14,4],[14,2],[16,0],[18,0],[20,1],[21,3],[21,5],[19,7],[17,7]] },
    '&': { width: 26, points: [[23,12],[23,13],[22,14],[21,14],[20,13],[19,11],[17,6],[15,3],[13,1],[11,0],[7,0],[5,1],[4,2],[3,4],[3,6],[4,8],[5,9],[12,13],[13,14],[14,16],[14,18],[13,20],[11,21],[9,20],[8,18],[8,16],[9,13],[11,10],[16,3],[18,1],[20,0],[22,0],[23,1],[23,2]] },
    '\'': { width: 10, points: [[5,19],[4,20],[5,21],[6,20],[6,18],[5,16],[4,15]] },
    '(': { width: 14, points: [[11,25],[9,23],[7,20],[5,16],[4,11],[4,7],[5,2],[7,-2],[9,-5],[11,-7]] },
    ')': { width: 14, points: [[3,25],[5,23],[7,20],[9,16],[10,11],[10,7],[9,2],[7,-2],[5,-5],[3,-7]] },
    '*': { width: 16, points: [[8,21],[8,9],[-1,-1],[3,18],[13,12],[-1,-1],[13,18],[3,12]] },
    '+': { width: 26, points: [[13,18],[13,0],[-1,-1],[4,9],[22,9]] },

    '-': { width: 26, points: [[4,9],[22,9]] },
    '.': { width: 10, points: [[5,2],[4,1],[5,0],[6,1],[5,2]] },
    '/': { width: 22, points: [[20,25],[2,-7]] },
    '0': { width: 20, points: [[9,21],[6,20],[4,17],[3,12],[3,9],[4,4],[6,1],[9,0],[11,0],[14,1],[16,4],[17,9],[17,12],[16,17],[14,20],[11,21],[9,21]] },
    '1': { width: 20, points: [[6,17],[8,18],[11,21],[11,0]] },
    '2': { width: 20, points: [[4,16],[4,17],[5,19],[6,20],[8,21],[12,21],[14,20],[15,19],[16,17],[16,15],[15,13],[13,10],[3,0],[17,0]] },
    '3': { width: 20, points: [[5,21],[16,21],[10,13],[13,13],[15,12],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
    '4': { width: 20, points: [[13,21],[3,7],[18,7],[-1,-1],[13,21],[13,0]] },
    '5': { width: 20, points: [[15,21],[5,21],[4,12],[5,13],[8,14],[11,14],[14,13],[16,11],[17,8],[17,6],[16,3],[14,1],[11,0],[8,0],[5,1],[4,2],[3,4]] },
    '6': { width: 20, points: [[16,18],[15,20],[12,21],[10,21],[7,20],[5,17],[4,12],[4,7],[5,3],[7,1],[10,0],[11,0],[14,1],[16,3],[17,6],[17,7],[16,10],[14,12],[11,13],[10,13],[7,12],[5,10],[4,7]] },
    '7': { width: 20, points: [[17,21],[7,0],[-1,-1],[3,21],[17,21]] },
    '8': { width: 20, points: [[8,21],[5,20],[4,18],[4,16],[5,14],[7,13],[11,12],[14,11],[16,9],[17,7],[17,4],[16,2],[15,1],[12,0],[8,0],[5,1],[4,2],[3,4],[3,7],[4,9],[6,11],[9,12],[13,13],[15,14],[16,16],[16,18],[15,20],[12,21],[8,21]] },
    '9': { width: 20, points: [[16,14],[15,11],[13,9],[10,8],[9,8],[6,9],[4,11],[3,14],[3,15],[4,18],[6,20],[9,21],[10,21],[13,20],[15,18],[16,14],[16,9],[15,4],[13,1],[10,0],[8,0],[5,1],[4,3]] },
    ':': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[5,2],[4,1],[5,0],[6,1],[5,2]] },
    ',': { width: 10, points: [[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
    ';': { width: 10, points: [[5,14],[4,13],[5,12],[6,13],[5,14],[-1,-1],[6,1],[5,0],[4,1],[5,2],[6,1],[6,-1],[5,-3],[4,-4]] },
    '<': { width: 24, points: [[20,18],[4,9],[20,0]] },
    '=': { width: 26, points: [[4,12],[22,12],[-1,-1],[4,6],[22,6]] },
    '>': { width: 24, points: [[4,18],[20,9],[4,0]] },
    '?': { width: 18, points: [[3,16],[3,17],[4,19],[5,20],[7,21],[11,21],[13,20],[14,19],[15,17],[15,15],[14,13],[13,12],[9,10],[9,7],[-1,-1],[9,2],[8,1],[9,0],[10,1],[9,2]] },
    '@': { width: 27, points: [[18,13],[17,15],[15,16],[12,16],[10,15],[9,14],[8,11],[8,8],[9,6],[11,5],[14,5],[16,6],[17,8],[-1,-1],[12,16],[10,14],[9,11],[9,8],[10,6],[11,5],[-1,-1],[18,16],[17,8],[17,6],[19,5],[21,5],[23,7],[24,10],[24,12],[23,15],[22,17],[20,19],[18,20],[15,21],[12,21],[9,20],[7,19],[5,17],[4,15],[3,12],[3,9],[4,6],[5,4],[7,2],[9,1],[12,0],[15,0],[18,1],[20,2],[21,3],[-1,-1],[19,16],[18,8],[18,6],[19,5]] },
    'A': { width: 18, points: [[9,21],[1,0],[-1,-1],[9,21],[17,0],[-1,-1],[4,7],[14,7]] },
    'B': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[-1,-1],[4,11],[13,11],[16,10],[17,9],[18,7],[18,4],[17,2],[16,1],[13,0],[4,0]] },
    'C': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5]] },
    'D': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[11,21],[14,20],[16,18],[17,16],[18,13],[18,8],[17,5],[16,3],[14,1],[11,0],[4,0]] },
    'E': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11],[-1,-1],[4,0],[17,0]] },
    'F': { width: 18, points: [[4,21],[4,0],[-1,-1],[4,21],[17,21],[-1,-1],[4,11],[12,11]] },
    'G': { width: 21, points: [[18,16],[17,18],[15,20],[13,21],[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[18,8],[-1,-1],[13,8],[18,8]] },
    'H': { width: 22, points: [[4,21],[4,0],[-1,-1],[18,21],[18,0],[-1,-1],[4,11],[18,11]] },
    'I': { width: 8, points: [[4,21],[4,0]] },
    'J': { width: 16, points: [[12,21],[12,5],[11,2],[10,1],[8,0],[6,0],[4,1],[3,2],[2,5],[2,7]] },
    'K': { width: 21, points: [[4,21],[4,0],[-1,-1],[18,21],[4,7],[-1,-1],[9,12],[18,0]] },
    'L': { width: 17, points: [[4,21],[4,0],[-1,-1],[4,0],[16,0]] },
    'M': { width: 24, points: [[4,21],[4,0],[-1,-1],[4,21],[12,0],[-1,-1],[20,21],[12,0],[-1,-1],[20,21],[20,0]] },
    'N': { width: 22, points: [[4,21],[4,0],[-1,-1],[4,21],[18,0],[-1,-1],[18,21],[18,0]] },
    'O': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21]] },
    'P': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,14],[17,12],[16,11],[13,10],[4,10]] },
    'Q': { width: 22, points: [[9,21],[7,20],[5,18],[4,16],[3,13],[3,8],[4,5],[5,3],[7,1],[9,0],[13,0],[15,1],[17,3],[18,5],[19,8],[19,13],[18,16],[17,18],[15,20],[13,21],[9,21],[-1,-1],[12,4],[18,-2]] },
    'R': { width: 21, points: [[4,21],[4,0],[-1,-1],[4,21],[13,21],[16,20],[17,19],[18,17],[18,15],[17,13],[16,12],[13,11],[4,11],[-1,-1],[11,11],[18,0]] },
    'S': { width: 20, points: [[17,18],[15,20],[12,21],[8,21],[5,20],[3,18],[3,16],[4,14],[5,13],[7,12],[13,10],[15,9],[16,8],[17,6],[17,3],[15,1],[12,0],[8,0],[5,1],[3,3]] },
    'T': { width: 16, points: [[8,21],[8,0],[-1,-1],[1,21],[15,21]] },
    'U': { width: 22, points: [[4,21],[4,6],[5,3],[7,1],[10,0],[12,0],[15,1],[17,3],[18,6],[18,21]] },
    'V': { width: 18, points: [[1,21],[9,0],[-1,-1],[17,21],[9,0]] },
    'W': { width: 24, points: [[2,21],[7,0],[-1,-1],[12,21],[7,0],[-1,-1],[12,21],[17,0],[-1,-1],[22,21],[17,0]] },
    'X': { width: 20, points: [[3,21],[17,0],[-1,-1],[17,21],[3,0]] },
    'Y': { width: 18, points: [[1,21],[9,11],[9,0],[-1,-1],[17,21],[9,11]] },
    'Z': { width: 20, points: [[17,21],[3,0],[-1,-1],[3,21],[17,21],[-1,-1],[3,0],[17,0]] },
    '[': { width: 14, points: [[4,25],[4,-7],[-1,-1],[5,25],[5,-7],[-1,-1],[4,25],[11,25],[-1,-1],[4,-7],[11,-7]] },
    '\\': { width: 14, points: [[0,21],[14,-3]] },
    ']': { width: 14, points: [[9,25],[9,-7],[-1,-1],[10,25],[10,-7],[-1,-1],[3,25],[10,25],[-1,-1],[3,-7],[10,-7]] },
    '^': { width: 16, points: [[6,15],[8,18],[10,15],[-1,-1],[3,12],[8,17],[13,12],[-1,-1],[8,17],[8,0]] },
    '_': { width: 16, points: [[0,-2],[16,-2]] },
    '`': { width: 10, points: [[6,21],[5,20],[4,18],[4,16],[5,15],[6,16],[5,17]] },
    'a': { width: 19, points: [[15,14],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'b': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
    'c': { width: 18, points: [[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'd': { width: 19, points: [[15,21],[15,0],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'e': { width: 18, points: [[3,8],[15,8],[15,10],[14,12],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'f': { width: 12, points: [[10,21],[8,21],[6,20],[5,17],[5,0],[-1,-1],[2,14],[9,14]] },
    'g': { width: 19, points: [[15,14],[15,-2],[14,-5],[13,-6],[11,-7],[8,-7],[6,-6],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'h': { width: 19, points: [[4,21],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
    'i': { width: 8, points: [[3,21],[4,20],[5,21],[4,22],[3,21],[-1,-1],[4,14],[4,0]] },
    'j': { width: 10, points: [[5,21],[6,20],[7,21],[6,22],[5,21],[-1,-1],[6,14],[6,-3],[5,-6],[3,-7],[1,-7]] },
    'k': { width: 17, points: [[4,21],[4,0],[-1,-1],[14,14],[4,4],[-1,-1],[8,8],[15,0]] },
    'l': { width: 8, points: [[4,21],[4,0]] },
    'm': { width: 30, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0],[-1,-1],[15,10],[18,13],[20,14],[23,14],[25,13],[26,10],[26,0]] },
    'n': { width: 19, points: [[4,14],[4,0],[-1,-1],[4,10],[7,13],[9,14],[12,14],[14,13],[15,10],[15,0]] },
    'o': { width: 19, points: [[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3],[16,6],[16,8],[15,11],[13,13],[11,14],[8,14]] },
    'p': { width: 19, points: [[4,14],[4,-7],[-1,-1],[4,11],[6,13],[8,14],[11,14],[13,13],[15,11],[16,8],[16,6],[15,3],[13,1],[11,0],[8,0],[6,1],[4,3]] },
    'q': { width: 19, points: [[15,14],[15,-7],[-1,-1],[15,11],[13,13],[11,14],[8,14],[6,13],[4,11],[3,8],[3,6],[4,3],[6,1],[8,0],[11,0],[13,1],[15,3]] },
    'r': { width: 13, points: [[4,14],[4,0],[-1,-1],[4,8],[5,11],[7,13],[9,14],[12,14]] },
    's': { width: 17, points: [[14,11],[13,13],[10,14],[7,14],[4,13],[3,11],[4,9],[6,8],[11,7],[13,6],[14,4],[14,3],[13,1],[10,0],[7,0],[4,1],[3,3]] },
    't': { width: 12, points: [[5,21],[5,4],[6,1],[8,0],[10,0],[-1,-1],[2,14],[9,14]] },
    'u': { width: 19, points: [[4,14],[4,4],[5,1],[7,0],[10,0],[12,1],[15,4],[-1,-1],[15,14],[15,0]] },
    'v': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0]] },
    'w': { width: 22, points: [[3,14],[7,0],[-1,-1],[11,14],[7,0],[-1,-1],[11,14],[15,0],[-1,-1],[19,14],[15,0]] },
    'x': { width: 17, points: [[3,14],[14,0],[-1,-1],[14,14],[3,0]] },
    'y': { width: 16, points: [[2,14],[8,0],[-1,-1],[14,14],[8,0],[6,-4],[4,-6],[2,-7],[1,-7]] },
    'z': { width: 17, points: [[14,14],[3,0],[-1,-1],[3,14],[14,14],[-1,-1],[3,0],[14,0]] },
    '{': { width: 14, points: [[9,25],[7,24],[6,23],[5,21],[5,19],[6,17],[7,16],[8,14],[8,12],[6,10],[-1,-1],[7,24],[6,22],[6,20],[7,18],[8,17],[9,15],[9,13],[8,11],[4,9],[8,7],[9,5],[9,3],[8,1],[7,0],[6,-2],[6,-4],[7,-6],[-1,-1],[6,8],[8,6],[8,4],[7,2],[6,1],[5,-1],[5,-3],[6,-5],[7,-6],[9,-7]] },
    '|': { width: 8, points: [[4,25],[4,-7]] },
    '}': { width: 14, points: [[5,25],[7,24],[8,23],[9,21],[9,19],[8,17],[7,16],[6,14],[6,12],[8,10],[-1,-1],[7,24],[8,22],[8,20],[7,18],[6,17],[5,15],[5,13],[6,11],[10,9],[6,7],[5,5],[5,3],[6,1],[7,0],[8,-2],[8,-4],[7,-6],[-1,-1],[8,8],[6,6],[6,4],[7,2],[8,1],[9,-1],[9,-3],[8,-5],[7,-6],[5,-7]] },
    '~': { width: 24, points: [[3,6],[3,8],[4,11],[6,12],[8,12],[10,11],[14,8],[16,7],[18,7],[20,8],[21,10],[-1,-1],[3,8],[4,10],[6,11],[8,11],[10,10],[14,7],[16,6],[18,6],[20,7],[21,10],[21,12]] }
};

CanvasTextFunctions.letter = function (ch) 
{
    return CanvasTextFunctions.letters[ch];
};

CanvasTextFunctions.ascent = function(font, size) 
{
    return size;
};

CanvasTextFunctions.descent = function(font, size) 
{
    return 7.0*size/25.0;
};

CanvasTextFunctions.measure = function(font, size, str) 
{
    var total = 0;
    var len = str.length;

    for (var i = 0; i < len; i++) 
	{
		var c = CanvasTextFunctions.letter(str.charAt(i));
		if (c) 
		{
			total += c.width * size / 25.0;
		}
    }
    return total;
};

CanvasTextFunctions.draw = function(ctx,font,size,x,y,str) 
{
    var total = 0;
    var len = str.length;
    var mag = size / 25.0;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 2.0 * mag;
	ctx.strokeStyle = "black";

    for (var i = 0; i < len; i++) 
	{
		var c = CanvasTextFunctions.letter( str.charAt(i));
		if (!c)
		{
			continue;	
		} 
		ctx.beginPath();
		var penUp = 1;
		var needStroke = 0;
		for (var j = 0; j < c.points.length; j++) 
		{
		    var a = c.points[j];
		    if ( a[0] === -1 && a[1] === -1) 
			{
				penUp = 1;
				continue;
		    }
		    if ( penUp) 
			{
				ctx.moveTo( x + a[0]*mag, y - a[1]*mag);
				penUp = false;
		    } 
			else 
			{
				ctx.lineTo( x + a[0]*mag, y - a[1]*mag);
		    }
		}
		ctx.stroke();
		x += c.width*mag;
    }
    ctx.restore();
    return total;
};

CanvasTextFunctions.enable = function(ctx) 
{
    ctx.drawText = function(font,size,x,y,text) { return CanvasTextFunctions.draw( ctx, font,size,x,y,text); };
    ctx.measureText = function(font,size,text) { return CanvasTextFunctions.measure( font,size,text); };
    ctx.fontAscent = function(font,size) { return CanvasTextFunctions.ascent(font,size); };
    ctx.fontDescent = function(font,size) { return CanvasTextFunctions.descent(font,size); };
    ctx.drawTextRight = function(font,size,x,y,text) {  
		var w = CanvasTextFunctions.measure(font,size,text);
		return CanvasTextFunctions.draw( ctx, font,size,x-w,y,text); 
    };
    ctx.drawTextCenter = function(font,size,x,y,text) { 
		var w = CanvasTextFunctions.measure(font,size,text);
		return CanvasTextFunctions.draw( ctx, font,size,x-w/2,y,text); 
    };
};

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
        this.currentYPosition = this.currentFontSize + 30;
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
            var consoleDiv = document.getElementById("divConsole");
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }
    }
});
/**
 * =============================================================================
 * deviceDriver.js 
 * 
 * Base class for all Device Drivers
 * 
 * @public
 * @class DeviceDriver
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.DeviceDriver = jambOS.util.createClass({
    /**
     * @property {string} version
     */
    version: "1.00",
    /**
     * @property {string} status
     */
    status: "unloaded",
    /**
     * @property {boolean} preemptable
     */
    preemptable: false,
    // queue: new jambOS.OS.Queue(),     // TODO: We will eventually want a queue for, well, queueing requests for this device to be handled by deferred procedure calls (DPCs).

    // Base Method pointers.
    /**
     * Initialization routine.  Should be called when the driver is loaded.
     */
    driverEntry: null,
    /**
     * Interrupt Service Routine
     */
    isr: null
            // TODO: this.dpc: null   // Deferred Procedure Call routine - Start next queued operation on this device.
});

/**
 * =============================================================================
 * deviceDriverKeyboard.js 
 * 
 * The Kernel Keyboard Device Driver.
 * "Inherit" from DeviceDriver in deviceDriver.js.
 * Add or override specific attributes and method pointers.
 * 
 * @public
 * @requires deviceDrive.js
 * @class DeviceDriverKeyboard
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.DeviceDriverKeyboard = jambOS.util.createClass(jambOS.OS.DeviceDriver, /** @scope jambOS.OS.DeviceDriverKeyboard.prototype*/{
    // this.buffer = "";    // TODO: Do we need this?
    /**
     * Constructor
     */
    initialize: function() {

    },
    // Override the base method pointers.
    /**
     * Initialization routine for this, the kernel-mode Keyboard Device Driver.
     */
    driverEntry: function()
    {
        this.status = "loaded";
        // More?
    },
    isr: function(params)
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
            _Kernel.trapError("Oh bummer, I wish I could have had some use for that key! :(", false);

            // move to new line
            _Console.advanceLine();
            _StdIn.putText(">");
        }


        _Kernel.trace("Key code:" + keyCode + " shifted:" + isShifted);
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

                var offset = _DrawingContext.measureText(_Console.currentFont, _Console.currentFontSize, ">");

                _Console.currentXPosition = offset;

                var xPos = _Console.currentXPosition;
                var yPos = (_Console.currentYPosition - _Console.currentFontSize) - 1;
                var width = 500;
                var height = _Console.currentFontSize + (_Console.currentFontSize / 2);

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

                var offset = _DrawingContext.measureText(_Console.currentFont, _Console.currentFontSize, ">");

                _Console.currentXPosition = offset;

                var xPos = _Console.currentXPosition;
                var yPos = (_Console.currentYPosition - _Console.currentFontSize) - 1;
                var width = 500;
                var height = _Console.currentFontSize + (_Console.currentFontSize / 2);

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

                var charWidth = _DrawingContext.measureText(_Console.currentFont, _Console.currentFontSize, charToDel);
                _Console.currentXPosition -= charWidth;

                var xPos = _Console.currentXPosition;
                var yPos = (_Console.currentYPosition - _Console.currentFontSize) - 1;
                var width = charWidth;
                var height = _Console.currentFontSize + (_Console.currentFontSize / 2);
                _DrawingContext.clearRect(xPos, yPos, width, height);
            } else if (keyCode !== 38 && keyCode !== 40)
                _KernelInputQueue.enqueue(chr);
        }
    }
});
/* ------------
   Queue.js
   
   A simple Queue, which is really just a dressed-up JavaScript Array.
   See the Javascript Array documentation at http://www.w3schools.com/jsref/jsref_obj_array.asp .
   Look at the push and shift methods, as they are the least obvious here.
   
   ------------ */
   
function Queue()
{
    // Properties
    this.q = new Array();

    // Methods
    this.getSize = function() {
        return this.q.length;    
    };

    this.isEmpty = function(){
        return (this.q.length == 0);    
    };

    this.enqueue = function(element) {
        this.q.push(element);        
    };
    
    this.dequeue = function() {
        var retVal = null;
        if (this.q.length > 0)
        {
            retVal = this.q.shift();
        }
        return retVal;        
    };
    
    this.toString = function() {
        var retVal = "";
        for (var i in this.q)
        {
            retVal += "[" + this.q[i] + "] ";
        }
        return retVal;
    };
}

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
    sc = new ShellCommand();
    sc.command = "date";
    sc.description = "- Displays the current date and time";
    sc.function = shellDateTime;
    this.commandList[this.commandList.length] = sc;

    // whereami
    sc = new ShellCommand();
    sc.command = "whereami";
    sc.description = "- Displays the current location";
    sc.function = shellWhereAmI;
    this.commandList[this.commandList.length] = sc;
    
    // whoisawesome
    sc = new ShellCommand();
    sc.command = "whoisawesome";
    sc.description = "- Displays emotiocon of person";
    sc.function = shellWhoIsAwesome;
    this.commandList[this.commandList.length] = sc;
    
    // status
    sc = new ShellCommand();
    sc.command = "status";
    sc.description = "<string> - Sets status message on taskbar";
    sc.function = shellStatus;
    this.commandList[this.commandList.length] = sc;
    
    // status
    sc = new ShellCommand();
    sc.command = "load";
    sc.description = "- loads commands from the user input text area";
    sc.function = shellLoad;
    this.commandList[this.commandList.length] = sc;
    
    // psod
    sc = new ShellCommand();
    sc.command = "psod";
    sc.description = "- simulates an OS error";
    sc.function = shellPSOD;
    this.commandList[this.commandList.length] = sc;

    // ver
    sc = new ShellCommand();
    sc.command = "ver";
    sc.description = "- Displays the current version data.";
    sc.function = shellVer;
    this.commandList[this.commandList.length] = sc;

    // help
    sc = new ShellCommand();
    sc.command = "help";
    sc.description = "- This is the help command. Seek help.";
    sc.function = shellHelp;
    this.commandList[this.commandList.length] = sc;

    // shutdown
    sc = new ShellCommand();
    sc.command = "shutdown";
    sc.description = "- Shuts down the virtual OS but leaves the underlying hardware simulation running.";
    sc.function = shellShutdown;
    this.commandList[this.commandList.length] = sc;

    // cls
    sc = new ShellCommand();
    sc.command = "cls";
    sc.description = "- Clears the screen and resets the cursor position.";
    sc.function = shellCls;
    this.commandList[this.commandList.length] = sc;

    // man <topic>
    sc = new ShellCommand();
    sc.command = "man";
    sc.description = "<topic> - Displays the MANual page for <topic>.";
    sc.function = shellMan;
    this.commandList[this.commandList.length] = sc;

    // trace <on | off>
    sc = new ShellCommand();
    sc.command = "trace";
    sc.description = "<on | off> - Turns the OS trace on or off.";
    sc.function = shellTrace;
    this.commandList[this.commandList.length] = sc;

    // rot13 <string>
    sc = new ShellCommand();
    sc.command = "rot13";
    sc.description = "<string> - Does rot13 obfuscation on <string>.";
    sc.function = shellRot13;
    this.commandList[this.commandList.length] = sc;

    // prompt <string>
    sc = new ShellCommand();
    sc.command = "prompt";
    sc.description = "<string> - Sets the prompt.";
    sc.function = shellPrompt;
    this.commandList[this.commandList.length] = sc;

    // processes - list the running processes and their IDs
    // kill <id> - kills the specified process id.

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
function ShellCommand()
{
    // Properties
    this.command = "";
    this.description = "";
    this.function = "";
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

function shellDateTime()
{
    var date = new Date();
    _StdIn.putText(date.toString());
}

function shellWhereAmI() {

    var output = window.location.href;

    _StdIn.putText(output);
}

function shellWhoIsAwesome(){
    _StdIn.putText("YOU ARE!!!!! d(*_*)b");
}

function shellStatus() {
    var typedText = _Console.buffer.split(" ");
    var clensedText = typedText.join(" ").replace("status", "Status:");

    _TaskbarContext.font = "bold 12px Arial";
    _TaskbarContext.clearRect(165, 0, 300, 20);
    _TaskbarContext.fillText(clensedText, 200, 16);
}

function shellLoad(){
    var textarea = document.getElementById("taProgramInput");
    if(/[0-9A-F]/.test(textarea.value.trim()) && textarea.value.trim().length % 2 === 0)
        _StdIn.putText("The user input value passed the test!");
    else if(!textarea.value.trim())
        _StdIn.putText("Please enter an input value then call the load command");
    else
        _StdIn.putText("Sorry I can only accept valid hex digit values :(");
}

function shellPSOD(){
    _TaskbarCanvas.style.backgroundColor = "pink";
    $("#divConsole, #taLog, #taProgramInput").css({background: "pink"});
    return _Kernel.trapError("Pink screen of death!", true);
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

function shellVer(args)
{
    _StdIn.putText(APP_NAME + " version " + APP_VERSION);
}

function shellHelp(args)
{
    _StdIn.putText("Commands:");
    for (var i in _OsShell.commandList)
    {
        _StdIn.advanceLine();
        _StdIn.putText("  " + _OsShell.commandList[i].command + " " + _OsShell.commandList[i].description);
    }
}

function shellShutdown(args)
{
    _StdIn.putText("Shutting down...");
    // Call Kernel shutdown routine.
    _Kernel.shutdown();
    // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
}

function shellCls(args)
{
    _StdIn.clearScreen();
    _StdIn.resetXY();
}

function shellMan(args)
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
}

function shellTrace(args)
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
}

function shellRot13(args)
{
    if (args.length > 0)
    {
        _StdIn.putText(args[0] + " = '" + rot13(args[0]) + "'");     // Requires Utils.js for rot13() function.
    }
    else
    {
        _StdIn.putText("Usage: rot13 <string>  Please supply a string.");
    }
}

function shellPrompt(args)
{
    if (args.length > 0)
    {
        _OsShell.promptStr = args[0];
    }
    else
    {
        _StdIn.putText("Usage: prompt <string>  Please supply a string.");
    }
}

/**
 * =============================================================================
 * kernel.js  
 * 
 * Routines for the Operating System, NOT the host. 
 * 
 * This code references page numbers in the text book: 
 * Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  
 * ISBN 978-0-470-12872-5
 * 
 * @public
 * @requires global.js
 * @class DeviceDriver
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.Kernel = jambOS.util.createClass({
    keyboardDrive: null,
    /**
     * Constructor
     */
    initialize: function() {

        // support Previous calls from outside
        krnInterruptHandler = this.interruptHandler;
    },
    /**
     * Contains OS Startup and shutdown routines
     * @public
     * @returns {undefined}
     */
    bootstrap: function()      // Page 8.
    {
        _Control.hostLog("bootstrap", "host");  // Use hostLog because we ALWAYS want this, even if _Trace is off.

        // Initialize our global queues.
        _KernelInterruptQueue = new Queue();  // A (currently) non-priority queue for interrupt requests (IRQs).
        _KernelBuffers = new Array();         // Buffers... for the kernel.
        _KernelInputQueue = new Queue();      // Where device input lands before being processed out somewhere.

        // The command line interface / console I/O device.
        _Console = new jambOS.OS.Console();

        // Initialize standard input and output to the _Console.
        _StdIn = _Console;
        _StdOut = _Console;

        // Load the Keyboard Device Driver
        this.trace("Loading the keyboard device driver.");
        this.keyboardDriver = new jambOS.OS.DeviceDriverKeyboard();     // Construct it.  TODO: Should that have a _global-style name?
        this.keyboardDriver.driverEntry();                    // Call the driverEntry() initialization routine.
        this.trace(this.keyboardDriver.status);

        //
        // ... more?
        //

        // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
        this.trace("Enabling the interrupts.");
        this.enableInterupts();

        // Launch the shell.
        this.trace("Creating and Launching the shell.");
        _OsShell = new Shell();
        _OsShell.init();

        // Finally, initiate testing.
        if (_GLaDOS) {
            _GLaDOS.afterStartup();
        }
    },
    shutdown: function()
    {
        this.trace("begin shutdown OS");
        // TODO: Check for running processes.  Alert if there are some, alert and stop.  Else...    
        // ... Disable the Interrupts.
        this.trace("Disabling the interrupts.");
        this.disableInterupts();
        // 
        // Unload the Device Drivers?
        // More?
        //
        this.trace("end shutdown OS");
    },
    onCPUClockPulse: function()
    {
        /* This gets called from the host hardware sim every time there is a hardware clock pulse.
         This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
         This, on the other hand, is the clock pulse from the hardware (or host) that tells the kernel 
         that it has to look for interrupts and process them if it finds any.                           */

        // Check for an interrupt, are any. Page 560
        if (_KernelInterruptQueue.getSize() > 0)
        {
            // Process the first interrupt on the interrupt queue.
            // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
            var interrupt = _KernelInterruptQueue.dequeue();
            this.interruptHandler(interrupt.irq, interrupt.params);
        }
        else if (_CPU.isExecuting) // If there are no interrupts then run one CPU cycle if there is anything being processed.
        {
            _CPU.cycle();
        }
        else                       // If there are no interrupts and there is nothing being executed then just be idle.
        {
            this.trace("Idle");
        }
    },
    enableInterupts: function()
    {
        // Keyboard
        _Device.hostEnableKeyboardInterrupt();
        // Put more here.
    },
    disableInterupts: function()
    {
        // Keyboard
        hostDisableKeyboardInterrupt();
        // Put more here.
    },
    interruptHandler: function(irq, params)    // This is the Interrupt Handler Routine.  Pages 8 and 560.
    {
        // have support with perivous code
        var self = _Kernel;

        // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on.  Page 766.
        self.trace("Handling IRQ~" + irq);

        // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
        // TODO: Consider using an Interrupt Vector in the future.
        // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.  
        //       Maybe the hardware simulation will grow to support/require that in the future.
        switch (irq)
        {
            case TIMER_IRQ:
                _Kernal.timerISR();                   // Kernel built-in routine for timers (not the clock).
                break;
            case KEYBOARD_IRQ:
                self.keyboardDriver.isr(params);   // Kernel mode device driver
                _StdIn.handleInput();
                break;
            default:
                self.trapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
        }
    },
    imerISRL: function()  // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver).
    {
        // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
    },
//
// System Calls... that generate software interrupts via tha Application Programming Interface library routines.
//
// Some ideas:
// - ReadConsole
// - WriteConsole
// - CreateProcess
// - ExitProcess
// - WaitForProcessToExit
// - CreateFile
// - OpenFile
// - ReadFile
// - WriteFile
// - CloseFile


//
// OS Utility Routines
//
    trace: function(msg)
    {
        // Check globals to see if trace is set ON.  If so, then (maybe) log the message. 
        if (_Trace)
        {
            if (msg === "Idle")
            {
                // We can't log every idle clock pulse because it would lag the browser very quickly.
                if (_OSclock % 10 == 0)  // Check the CPU_CLOCK_INTERVAL in globals.js for an 
                {                        // idea of the tick rate and adjust this line accordingly.
                    _Control.hostLog(msg, "OS");
                }
            }
            else
            {
                _Control.hostLog(msg, "OS");
            }
        }
    },
    trapError: function(msg, killSwitch)
    {
        killSwitch = typeof killSwitch === "undefined" ? true : killSwitch;
        _Control.hostLog("OS ERROR - TRAP: " + msg);

        // Display error on console, perhaps in some sort of colored screen. (Perhaps blue?)
        var offset = _DrawingContext.measureText(_Console.currentFont, _Console.currentFontSize, ">");

        _Console.currentXPosition = offset;

        var xPos = _Console.currentXPosition;
        var yPos = (_Console.currentYPosition - _Console.currentFontSize) - 1;
        var width = 500;
        var height = _Console.currentFontSize + (_Console.currentFontSize / 2);

        // erase previous command
        _DrawingContext.clearRect(xPos, yPos, width, height);

        // print message on display in blue    
        _DrawingContext.fillStyle = "blue";
        _DrawingContext.font = "bold 12px Arial";
        _DrawingContext.fillText("OS ERROR - TRAP: => " + msg, xPos, _Console.currentYPosition);

        if (killSwitch)
            this.shutdown();
    }

});