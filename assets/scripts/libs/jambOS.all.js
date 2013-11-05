/**
 * jambOS
 * 
 * @author                  James Arama
 * @copyright               2013
 * @version                 1.0
 */


var jambOS = jambOS || {version: "1.0", name: "jambOS"};


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

var CPU_CLOCK_INTERVAL = 100;   // This is in ms, or milliseconds, so 1000 = 1 second.

var TIMER_IRQ = 0;  // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
// NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
var KEYBOARD_IRQ = 1;
var PROCESS_INITIATION_IRQ = 2;
var PROCESS_TERMINATION_IRQ = 3;
var CONTEXT_SWITCH_IRQ = 4;

// memory
var MEMORY_BLOCK = 256;
var ALLOCATABLE_MEMORY_SLOTS = 3;
var HEX_BASE = 16;

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
var _FontHeightMargin = 6;        // Additional space added to font size when advancing a line.

// Default the OS trace to be on.
var _Trace = true;

// Default for stepover
var _Stepover = false;

// OS queues
var _KernelInterruptQueue = null;
var _KernelBuffers = null;
var _KernelInputQueue = null;

// Standard input and output
var _StdIn = null;
var _StdOut = null;

// UI
var _Console = null;
var _OsShell = null;

// helps with our blinking cursor
var _IsTyping = false;

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
        klass.prototype.type = klass.prototype.type ? klass.prototype.type : "klass";

        /**
         * Returns a string representation of an instance      
         * @method toString                     
         * @return {String}                        - String representation of a
         *                                           Klass object
         */
        klass.prototype.toString = function() {
            return "#<jambOS." + this.type.toUpperCase() + ">";
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

/**
 * Use a regular expression to remove leading and trailing spaces.
 * Huh?  Take a breath.  Here we go:
 *      - The "|" separates this into two expressions, as in A or B.
 *      - "^\s+" matches a sequence of one or more whitespace characters at 
 *        the beginning of a string.
 *      - "\s+$" is the same thing, but at the end of the string.
 *      - "g" makes is global, so we get all the whitespace.
 *      - "" is nothing, which is what we replace the whitespace with.
 * @public
 * @method trim
 * @param {string} str
 * @returns {string}
 */
jambOS.util.trim = function(str) {
    return str.replace(/^\s+ | \s+$/g, "");
};

/**
 * An easy-to understand implementation of the famous and common Rot13 
 * obfuscator. You can do this in three lines with a complex regular expression, 
 * but I'd have trouble explaining it in the future. There's a lot to be said 
 * for obvious code.
 * @public 
 * @method rot13
 * @param {string} str
 * @returns {string}
 */
jambOS.util.rot13 = function(str) {
    var retVal = "";
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
};

// initialize host
$(document).ready(function() {
    _Control = new jambOS.host.Control();
});

/**
 * =============================================================================
 * control.class.js
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

        $("#taskbar").append(_TaskbarCanvas);

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

        // load first default program
        $("#taProgramInput").val("A9 03 8D 41 00 A9 01 8D 40 00 AC 40 00 A2 01 FF EE 40 00 AE 40 00 EC 41 00 D0 EF A9 44 8D 42 00 A9 4F 8D 43 00 A9 4E 8D 44 00 A9 45 8D 45 00 A9 00 8D 46 00 A2 02 A0 42 FF 00");

        // Step over
        $("#btnStepOver").click(function() {
            if (_CPU)
                _CPU.cycle();
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
        _CPU = new jambOS.host.Cpu();

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
/**
 * =============================================================================
 * Devices.js
 * 
 * Routines for the hardware simulation, NOT for our client OS itself. In this 
 * manner, it's A LITTLE BIT like a hypervisor, in that the Document environment 
 * inside a browser is the "bare metal" (so to speak) for which we write code 
 * that hosts our client OS. But that analogy only goes so far, and the lines 
 * are blurred, because we are using JavaScript in both the host and client 
 * environments. 
 * 
 * This (and simulation scripts) is the only place that we should see "web" 
 * code, like DOM manipulation and JavaScript event handling, and so on.  
 * (Index.html is the only place for markup.) 
 * 
 * This code references page numbers in the text book: Operating System Concepts
 * 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
 * 
 * @public
 * @class Device
 * @requires global.js
 * @memberOf jambOS.host
 * =============================================================================
 */

var _hardwareClockID = -1;

jambOS.host.Device = jambOS.util.createClass({
    /**
     * Hardware/Host Clock Pulse
     * @public
     * @method hostClockPulse
     */
    hostClockPulse: function()
    {
        // Increment the hardware (host) clock.
        _OSclock++;
        // Call the kernel clock pulse event handler.
        _Kernel.onCPUClockPulse();
    },
    /**
     * Keyboard Interrupt, a HARDWARE Interrupt Request. (See pages 560-561 in 
     * text book.)
     * @public
     * @method hostEnableKeyboardInterrupt
     */
    hostEnableKeyboardInterrupt: function()
    {
        // Listen for key press (keydown, actually) events in the Document
        // and call the simulation processor, which will in turn call the 
        // OS interrupt handler.
        document.addEventListener("keydown", _Device.hostOnKeypress, false);
    },
    /**
     * Disables KeyboardInterrupt
     * @public
     * @method hostDisableKeyboardInterrupt
     */
    hostDisableKeyboardInterrupt: function()
    {
        document.removeEventListener("keydown", _Device.hostOnKeypress, false);
    },
    /**
     * Handles keypress events
     * @public
     * @method hostOnKeypress
     */
    hostOnKeypress: function(event)
    {
        var keyCode = (event.keyCode ? event.keyCode : event.which);

        // The canvas element CAN receive focus if you give it a tab index, which we have.
        // Check that we are processing keystrokes only from the canvas's id (as set in index.html).
        if (event.target.id === "display")
        {
            _isTyping = true;

            event.preventDefault();

            // Note the pressed key code in the params (Mozilla-specific).
            var params = new Array(keyCode, event.shiftKey);
            var keyboardInterrupt = new jambOS.OS.Interrupt({irq: KEYBOARD_IRQ, params: params});
            // Enqueue this interrupt on the kernel interrupt queue so that it gets to the Interrupt handler.
            _KernelInterruptQueue.enqueue(keyboardInterrupt);
        }
    }
});
/**
 *==============================================================================
 * Class Memory
 *    
 * @class Memory
 * @memberOf jambOS 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.host.Memory = jambOS.util.createClass( /** @scopee jambOS.host.Memory.prototype */{
    /**
     * @property {int} size             - Size of Memory
     */
    size: 0,
    /**
     * @property {array} storage
     */
    storage: new Array(),
    /**
     * @property {string} type
     */
    type: "memory",
    /**
     * Constructor
     * @param {object} options
     * @returns {jambOS.host.Memory}
     */
    initialize: function(options) {
        var self = this;
    
        options || (options = {});
        self.setOptions(options);

        // initialize storage memory array with zeros
        for (var i = 0; i < self.size; i++) {
            self.write(i, 00);
        }
        
        return this;
    },
    /**
     * Reads data from storage
     * @param {string} address
     * @returns data
     */
    read: function(address) {
        return this.get("storage")[address];
    },
    /**
     * Writes to storage
     * 
     * @public
     * @param {string} address
     * @param {object} data
     */
    write: function(address, data) {
        this.get("storage")[address] = data;
    },
    /**
     * Inserts data to storage starting from the specified storage address
     * 
     * @public
     * @param {int} start starting address point
     * @param {array} data data to add to storage
     */
    insert: function(start, data) {

        var self = this;

        // write to memory
        for (var i = 0; i < data.length; i++) {
            self.write(i + start, data[i]);
        }        

        _Kernel.memoryManager.updateMemoryDisplay();
    }
});
/**
 * =============================================================================
 * cpu.class.js
 * Routines for the host CPU simulation, NOT for the OS itself.  
 * In this manner, it's A LITTLE BIT like a hypervisor,
 * in that the Document environment inside a browser is the "bare metal" 
 * (so to speak) for which we write code that hosts our client OS. But that 
 * analogy only goes so far, and the lines are blurred, because we are using 
 * JavaScript in both the host and client environments.
 * 
 * This code references page numbers in the text book: 
 * Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  
 * ISBN 978-0-470-12872-5
 * 
 * @requires globals.js
 * @public
 * @class Cpu
 * @memberOf jambOS.host
 * =============================================================================
 */
jambOS.host.Cpu = jambOS.util.createClass(/** @scope jambOS.host.Cpu.prototype */{
    /**
     * @property {int} pc                       - Program counter
     */
    pc: 0,
    /**
     * @property {int} acc                      - Accumulator
     */
    acc: 0,
    /**
     * @property {int} xReg                     - X Register
     */
    xReg: 0,
    /**
     * @property {int}  yReg                    - Y Register
     */
    yReg: 0,
    /**
     * @property {int}  zFlag                   - Z-ero flag (Think of it as "isZero".)
     */
    zFlag: 0,
    /**
     * @property {boolean} isExecuting          - Is the CPU executing?
     */
    isExecuting: false,
    /**
     * Constructor
     */
    initialize: function() {
        return this;
    },
    /**
     * Sets cpu registers ready for process execution
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    start: function(pcb) {
        _Kernel.processManager.set({
            currentProcess: pcb,
            activeSlot: pcb.slot
        });
        this.set({
            pc: pcb.base,
            isExecuting: true
        });
    },
    /**
     * Resets cpu registers to default values to help stop process execution
     */
    stop: function() {
        this.set({
            pc: 0,
            acc: 0,
            xReg: 0,
            yReg: 0,
            zFlag: 0,
            isExecuting: false
        });

        // update PCB status display
        _Kernel.processManager.updatePCBStatusDisplay(_Kernel.processManager.get("currentProcess"));
        _Kernel.processManager.get("currentProcess").set("state", "terminated");


        // disable stepover button
        $("#btnStepOver").prop("disabled", true);
    },
    /**
     * Called every clock cycle
     */
    cycle: function() {
        var self = this;
        _Kernel.trace("CPU cycle");

        // TODO: Accumulate CPU usage and profiling statistics here.
        // Do the real work here. Be sure to set this.isExecuting appropriately.

        // update cpu status display
        _Kernel.processManager.updateCpuStatusDisplay(self);

        var opCode = _Kernel.memoryManager.memory.read(self.pc++).toString().toLowerCase();
        var operation = self.getOpCode(opCode);

        if (operation) {
            operation(self);

            if (_Kernel.processManager.get("currentProcess"))
                _Kernel.processManager.get("currentProcess").set({acc: self.acc, pc: self.pc, xReg: self.xReg, yReg: self.yReg, zFlag: self.zFlag, state: "running"});

        }

    },
    /*------------------Operations -----------------------*/
    /**
     * Gets an opcode function
     * @param {string} opcode
     * @returns {function} opcode routine
     */
    getOpCode: function(opcode) {
        var self = this;
        var opcodes = {
            "a9": self.loadAccWithConstant,
            "ad": self.loadAccFromMemory,
            "8d": self.storeAccInMemory,
            "6d": self.addWithCarry,
            "a2": self.loadXRegWithConstant,
            "ae": self.loadXRegFromMemory,
            "a0": self.loadYRegWithConstant,
            "ac": self.loadYRegFromMemory,
            "00": self.breakOperation,
            "ea": self.noOperation,
            "ec": self.compareXReg,
            "d0": self.branchXBytes,
            "ee": self.incrementByteValue,
            "ff": self.systemCall
        };
        return opcodes[opcode];
    },
    /**
     * Load the accumulator with a constant.
     * opCode: a9     
     * @param {jambOS.host.Cpu} self    
     */
    loadAccWithConstant: function(self)
    {
        var byteCode = _Kernel.memoryManager.memory.read(self.pc++);
        self.acc = parseInt(byteCode, HEX_BASE);
    },
    /**
     * Load the accumulator from memory 
     * opCode: ad
     * @param {jambOS.host.Cpu} self 
     */
    loadAccFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            self.acc = parseInt(value, HEX_BASE);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * Store the accumulator in memory
     * opCode: 8d
     * @param {jambOS.host.Cpu} self 
     */
    storeAccInMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Convert value of acc to hex
            var hexValue = _Kernel.memoryManager.decimalToHex(self.acc);

            // Place value of acc in hex byte form in memory
            _Kernel.memoryManager.memory.write(address, hexValue);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * Add with carry adds contents of an address to the contents of the 
     * accumulator and keeps the result in the accuculator
     * opCode: 6d
     * @param {jambOS.host.Cpu} self 
     */
    addWithCarry: function(self)
    {

        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Add contents of the memory location and the contents of the acc
            self.acc += parseInt(value, HEX_BASE);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * Load the X register with a constant
     * opCode: a2
     * @param {jambOS.host.Cpu} self 
     */
    loadXRegWithConstant: function(self)
    {
        var byteCode = _Kernel.memoryManager.memory.read(self.pc++);
        self.xReg = parseInt(byteCode, HEX_BASE);
    },
    /**
     * Load the X register from memory 
     * opCode: ae
     * @param {jambOS.host.Cpu} self 
     */
    loadXRegFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location (in decimal form) in the x register
            self.xReg = parseInt(value, HEX_BASE);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * Load the Y register with a constant 
     * opCode: a0
     * @param {jambOS.host.Cpu} self 
     */
    loadYRegWithConstant: function(self)
    {
        // Place the next byte in memory in the Y register
        self.yReg = _Kernel.memoryManager.memory.read(self.pc++);
    },
    /**
     * Load the Y register from memory 
     * opCode: ac
     * @param {jambOS.host.Cpu} self 
     */
    loadYRegFromMemory: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Place contents of the memory location in the y register
            self.yReg = parseInt(value, HEX_BASE);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * No Operation 
     * opCode: ea
     * @param {jambOS.host.Cpu} self 
     */
    noOperation: function(self)
    {
        self.pc++;
    },
    /**
     * Break (which is really a system call) 
     * opCode: 00
     */
    breakOperation: function(self) {
        _Kernel.interruptHandler(PROCESS_TERMINATION_IRQ, _Kernel.processManager.get("currentProcess"));
    },
    /**
     * Compare a byte in memory to the X reg sets the Z (zero) flag if equal 
     * opCode: ec
     * @param {jambOS.host.Cpu} self 
     */
    compareXReg: function(self)
    {
        // Get next two bytes in memory
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");

        // Concatenate the hex address in the correct order
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            // Compare contents of the memory location with the x reg
            // Set z flag if they are equal
            self.zFlag = (parseInt(value) === self.xReg) ? 1 : 0;
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * Branch X bytes if Z flag = 0
     * opCode: d0
     * @param {jambOS.host.Cpu} self 
     */
    branchXBytes: function(self)
    {
        if (self.zFlag === 0)
        {
            var branchValue = parseInt(_Kernel.memoryManager.memory.read(self.pc++), HEX_BASE);
            self.pc += branchValue;

            if (self.pc > _Kernel.processManager.get("currentProcess").limit)
            {
                self.pc -= MEMORY_BLOCK;
            }
        }
    },
    /**
     * Increment the value of a byte 
     * opCode: ee
     * @param {jambOS.host.Cpu} self 
     */
    incrementByteValue: function(self)
    {
        var byteCodeOne = _Kernel.memoryManager.memory.read(self.pc++);
        var byteCodeTwo = _Kernel.memoryManager.memory.read(self.pc++);

        var pcb = _Kernel.processManager.get("currentProcess");
        var address = parseInt((byteCodeTwo + byteCodeOne), HEX_BASE) + pcb.base;
        var value = _Kernel.memoryManager.memory.read(address);

        if (_Kernel.memoryManager.validateAddress(address))
        {
            var decimalValue = parseInt(value, HEX_BASE);

            decimalValue++;

            var hexValue = _Kernel.memoryManager.decimalToHex(decimalValue);

            _Kernel.memoryManager.memory.write(address, hexValue);
        } else {
            // TODO: Halt the OS
            // TODO: Show error in log
        }
    },
    /**
     * System Call 
     *  #$01 in X reg = print the integer stored in the Y register. 
     *  #$02 in X reg = print the 00-terminated string stored at the address in 
     *  the Y register. 
     *  opCode: ff
     * @param {jambOS.host.Cpu} self 
     */
    systemCall: function(self)
    {
        if (self.xReg === 1)
        {
            var value = parseInt(self.yReg).toString();

            for (var i = 0; i < value.length; i++)
            {
                _StdIn.putText(value.charAt(i));
            }
            _StdIn.advanceLine();
            _OsShell.putPrompt();

        } else {

            var pcb = _Kernel.processManager.get("currentProcess");

            var address = parseInt(self.yReg, HEX_BASE) + pcb.base;

            var currentByte = _Kernel.memoryManager.memory.read(address);

            var character = "";

            while (currentByte !== "00")
            {
                currentByte = _Kernel.memoryManager.memory.read(address++);
                character = String.fromCharCode(parseInt(currentByte, HEX_BASE));
                _StdIn.putText(character);
            }

            _StdIn.advanceLine();
            _OsShell.putPrompt();
        }

        if (_Kernel.processManager.readyQueue.length)
            _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
    }
});


/**
 *==============================================================================
 * Class MemoryManager
 *    
 * @class MemoryManager
 * @memberOf jambOS.OS
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.MemoryManager = jambOS.util.createClass({
    /**
     * @property {jambOS.host.Memory} memory
     */
    memory: null,
    /**
     * @property {string} type
     */
    type: "memorymanager",
    /**
     * @property {object} slots                 
     */
    slots: [],
    /**
     * @property {int} activeSlot
     */
    activeSlot: 0,
    /**
     * Constructor
     */
    initialize: function() {
        var self = this;

        // set up memory slots
        for (var i = 0; i < ALLOCATABLE_MEMORY_SLOTS; i++) {

            // for our bases we are going to use the previous slot's data
            // unless its the first slot which we'll use 0 as the base and 
            // the block size minus 1 as the limit
            var base = i > 0 ? self.slots[i - 1].limit + 1 : 0;
            var limit = i > 0 ? self.slots[ i - 1].limit + MEMORY_BLOCK : MEMORY_BLOCK - 1;

            self.slots.push({
                base: base,
                limit: limit,
                open: true
            });
        }

        // initialize our memory. We are going to use the last slot's limit + 1
        // as the total memory size
        var memorySize = self.slots[self.slots.length - 1].limit + 1;
        self.set({
            memory: new jambOS.host.Memory({size: memorySize})
        });

        // update memory table
        self.updateMemoryDisplay();
    },
    /**
     * Allocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    allocate: function(pcb) {
        var self = this;
        var activeSlot = pcb.slot;
        self.slots[activeSlot].open = false;
        pcb.set({base: self.slots[activeSlot].base, limit: self.slots[activeSlot].limit});
        _Kernel.processManager.set("currentProcess", pcb);
    },
    /**
     * Deallocates memory slots to a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    deallocate: function(pcb) {
        var self = this;
        var slot = pcb.slot;

        // clear out process from memory
        for (var i = pcb.base; i <= pcb.limit; i++)
        {
            self.memory.write(i, 00);
        }

        self.slots[slot].open = true;
        self.activeSlot = pcb.slot;

        // update memory table
        self.updateMemoryDisplay();
    },
    /**
     * Validates if memory address is within available allocated slot
     * @param {int} address 
     */
    validateAddress: function(address) {
        var self = this;
        var activeSlot = _Kernel.processManager.get("currentProcess").slot;
        var isValid = (address <= self.slots[activeSlot].limit && address >= self.slots[activeSlot].base)
        return isValid;
    },
    /**
     * Updates content that is on memory for display on the OS 
     * @method updateDisplay
     */
    updateMemoryDisplay: function() {
        var self = this;
        var table = "<table class='table table-bordered'><tr>";
        var i = 0;
        while (self.memory.size > i) {
            if (i % 8 === 0) {
                table += "</tr><tr class='" + (self.memory.read(i) !== 0 ? "has-value" : "") + "'>";
                table += "<td>0x" + self.decimalToHex(i, 4) + "</td>";
                table += "<td>" + self.memory.read(i) + "</td>";
            } else
                table += "<td>" + self.memory.read(i) + "</td>";
            i++;
        }
        table += "</table>";

        // add to the memory div
        $("#memory .content").html(table);
    },
    /**
     * Converts decimal values to hex
     * @method decimalToHex
     * @param {Number} d
     * @param {int} padding
     * @returns {string} hex
     */
    decimalToHex: function(d, padding) {
        var hex = Number(d).toString(HEX_BASE);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex.toUpperCase();
    }
});
/**
 *==============================================================================
 * Class ProcessManager
 *    
 * @class ProcessManager
 * @memberOf jambOS 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.ProcessManager = jambOS.util.createClass({
    type: "processmanager",
    /**
     * @property {[jambOS.OS.ProcessControlBlock]} processes
     */
    processes: [],
    /**
     * @property {int} currentProcessID
     */
    currentProcessID: 0,
    /**
     * @property {jambOS.OS.ProcessControlBlock} currentProcess
     */
    currentProcess: null,
    readyQueue: [],
    processCycles: 0,
    schedulingQuantum: 6,
    /**
     * Constructor
     * @param {object} options
     * @returns {jambOS.OS.ProcessManager}
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);

        return this;
    },
    /**
     * Executes a process
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    execute: function(pcb) {
        pcb.set("state", "ready");
        _Kernel.interruptHandler(PROCESS_INITIATION_IRQ, pcb);
    },
    scheduleProcess: function() {
        var self = this;
        if (_CPU.isExecuting) {
            self.processCycles++;

            // perform a swithc when we the cycles hit our scheduling quantum to
            // simulate the real time execution
            if (self.readyQueue.length && self.processCycles >= self.schedulingQuantum) {
                _Kernel.interruptHandler(CONTEXT_SWITCH_IRQ);
            }
        }
    },
    /**
     * Loads program to memory
     * 
     * @param {string} program
     * @returns {jambOS.OS.ProcessControlBlock} pcb
     */
    load: function(program) {

        // enable stepover button
        $("#btnStepOver").prop("disabled", false);

        var slots = _Kernel.memoryManager.get("slots");
        var activeSlot = _Kernel.memoryManager.get("activeSlot");

        // move up memory slot when program has been loaded
        if (activeSlot < ALLOCATABLE_MEMORY_SLOTS)
            _Kernel.memoryManager.activeSlot++;
        else
            return _Kernel.trapError("No memory is available! \n Deallocate processes from memory before proceeding!", false);

        var base = slots[activeSlot].base;
        var limit = slots[activeSlot].limit;

        _Kernel.memoryManager.memory.insert(base, program);

        var pid = this.currentProcessID++;
        var pcb = new jambOS.OS.ProcessControlBlock({
            pid: pid,
            pc: 0,
            base: base,
            limit: limit,
            xReg: 0,
            yReg: 0,
            zFlag: 0,
            slot: activeSlot
        });

        this.processes.push(pcb);
        _Kernel.memoryManager.allocate(pcb);

        return pcb;
    },
    /**
     * Unloads process from memoryhelp
     * 
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    unload: function(pcb) {
        _Kernel.memoryManager.deallocate(pcb);
        var index = this.processes.indexOf(pcb);
        if (index > -1)
            this.processes.splice(index, 1);
    },
    /**
     * Updates cpu status display
     * @param {jambOS.host.Cpu} cpu
     */
    updateCpuStatusDisplay: function(cpu) {
        var pc = cpu.pc;
        var acc = cpu.acc;
        var xReg = cpu.xReg;
        var yReg = parseInt(cpu.yReg, 16);
        var zFlag = cpu.zFlag;

        $("#cpuStatus .pc").text(pc);
        $("#cpuStatus .acc").text(acc);
        $("#cpuStatus .x-register").text(xReg);
        $("#cpuStatus .y-register").text(yReg);
        $("#cpuStatus .z-flag").text(zFlag);

    },
    /**
     * Updates pcb status display
     * @param {jambOS.OS.ProcessControlBlock} pcb
     */
    updatePCBStatusDisplay: function(pcb) {
        var id = pcb.pid;
        var pc = pcb.pc;
        var acc = pcb.acc;
        var xReg = pcb.xReg;
        var yReg = parseInt(pcb.yReg, 16);
        var zFlag = pcb.zFlag;

        $("#pcbStatus .pid").text(id);
        $("#pcbStatus .pc").text(pc);
        $("#pcbStatus .acc").text(acc);
        $("#pcbStatus .x-register").text(xReg);
        $("#pcbStatus .y-register").text(yReg);
        $("#pcbStatus .z-flag").text(zFlag);

    }
});

/**
 * =============================================================================
 * interrupt.class.js 
 * 
 * Interrupt Class
 * 
 * @public
 * @class Interrupt
 * @memberOf jambOS.OS
 * =============================================================================
 */

jambOS.OS.Interrupt = jambOS.util.createClass(/** @scope jambOS.OS.Interrupt.prototype */{
    /**
     * @property {string} type
     */
    type: "Interrupt",
    /**
     * @property {int} iqr
     */
    irq: null,
    /**
     * @params {object} params
     */
    params: null,
    /**
     * Constructor
     */
    initialize: function(options) {
        var self = this;

        options || (options = {});
        self.setOptions(options);
    }
});
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
    lastXPosition: 0,
    lastYPosition: _DefaultFontSize,
    linesAdvanced: 0,
    /**
     * Constructor
     */
    initialize: function() {
        this.clearScreen();
        this.resetXY();
        this.initTaskbar();
        this.initCursor();
    },
    /**
     * Initializes our taskbar
     * @public
     * @method initTaskbar
     */
    initTaskbar: function() {
        var date = new Date();
        var date_xpos = 16;
        var date_ypos = 16;
        var status_xpos = 200;
        var status_ypos = 16;
        _TaskbarContext.font = "bold 12px Arial";
        _TaskbarContext.fillText(date.toLocaleString(), date_xpos, date_ypos);
        _TaskbarContext.fillText("Status: OS is running...", status_xpos, status_ypos);

        // redraw section every second
        window.setInterval(function() {
            date = new Date();
            var clearWidth = 165;
            var clearHeight = 20;
            _TaskbarContext.clearRect(date_xpos, 0, clearWidth, clearHeight);
            _TaskbarContext.fillText(date.toLocaleString(), date_xpos, date_ypos);
        }, 1000);
    },
    /**
     * Handlers the cursor on the canvas
     * @public
     * @method initCursor
     */
    initCursor: function() {

        var self = this;

        // blinking cursor
        window.setInterval(function() {

            if (!_IsTyping && _StdIn && $("#display").is(":focus")) {

                _DrawingContext.drawText(_Console.currentFont, _Console.currentFontSize, _Console.currentXPosition, _Console.currentYPosition, "|");

                setTimeout(function() {
                    self.clearBlinker();
                }, 500);
            }
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
     * Helps with clearing the cursor blinker
     * @public
     * @method clearBlinlker
     */
    clearBlinker: function() {
        var xPos = this.currentXPosition;
        var yPos = (this.currentYPosition - this.currentFontSize) - 1;
        var height = this.currentFontSize + (this.currentFontSize / 2);
        _DrawingContext.clearRect(xPos, yPos, _Canvas.width, height);
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
            // clear blinker before drawing character
            this.clearBlinker();            
            
            var offset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, text);

            // handle wrapping of text
            if (this.currentXPosition > _Canvas.width - offset){
                this.lastXPosition = this.currentXPosition;
                this.lastYPosition = this.currentYPosition;
                this.linesAdvanced += 1;
                this.advanceLine();
            }
            
            // Draw the text at the current X and Y coordinates.
            _DrawingContext.drawText(this.currentFont, this.currentFontSize, this.currentXPosition, this.currentYPosition, text);
            
            // Move the current X position.
            this.currentXPosition += offset;
        }

        // reset our isTyping variable so that we can show our cursor
        _isTyping = false;
    },
    /**
     * Handles new line advancement of the cursor
     * @public
     * @method advanceLine
     */
    advanceLine: function() {

        // clear blinker before we get screenshot of canvas
        this.clearBlinker();

        this.currentXPosition = 0;
        this.currentYPosition += _DefaultFontSize + _FontHeightMargin;

        // Handle scrolling.
        if (this.currentYPosition > _Canvas.height) {
            var bufferCanvas = document.createElement('canvas');
            var buffer = bufferCanvas.getContext("2d");

            bufferCanvas.style.diplay = "none";
            bufferCanvas.width = _Canvas.width;
            bufferCanvas.height = _Canvas.height;

            var canvasData = _DrawingContext.getImageData(0, 0, _Canvas.width, _Canvas.height);

            // draw current canvas image on buffer
            buffer.putImageData(canvasData, 0, 0);

            canvasData = buffer.getImageData(0, 0, _Canvas.width, _Canvas.height);

            _Canvas.height += _DefaultFontSize + _FontHeightMargin;

            // redraw everything on the resized canvas
            _DrawingContext.putImageData(canvasData, 0, 0);

            // scroll to the bottom
            var consoleDiv = $("#divConsole .canvas");
            consoleDiv.scrollTop(consoleDiv.find("canvas").height());
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
    // TODO: We will eventually want a queue for, well, queueing requests for this device to be handled by deferred procedure calls (DPCs).
    // queue: new jambOS.OS.Queue(),     

    // Base Method pointers.
    /**
     * Initialization routine.  Should be called when the driver is loaded.
     */
    driverEntry: null,
    /**
     * Interrupt Service Routine
     */
    isr: null,
    // TODO: Deferred Procedure Call routine - Start next queued operation on this device.
    dpc: null
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
 * @inheritsFrom DeviceDriver
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

                // Sometimes the buffer gets away with this so we'll sanitize our text
                _Console.buffer = _Console.buffer.replace("[object object]", "");

                if (_Console.buffer.trim()) {
                    _CommandHistory.push(_Console.buffer);
                    _CurrentCommandIndex = _CommandHistory.length - 1;
                }

                // no lines have advanced if a user has pressed enter
                _Console.linesAdvanced = 0;
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

                if (_CurrentCommandIndex < _CommandHistory.length - 1)
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

                _Console.clearBlinker();

                var charToDel = _Console.buffer.charAt(_Console.buffer.length - 1);

                // remove last character from the buffer
                _Console.buffer = _Console.buffer.slice(0, -1);

                var charWidth = _DrawingContext.measureText(_Console.currentFont, _Console.currentFontSize, charToDel);
                _Console.currentXPosition -= charWidth;

                var xPos = _Console.currentXPosition;
                var yPos = (_Console.currentYPosition - _Console.currentFontSize) - 1;
                var height = _Console.currentFontSize + (_Console.currentFontSize / 2);
                _DrawingContext.clearRect(xPos, yPos, _Canvas.width, height);


                var promptOffset = _DrawingContext.measureText(this.currentFont, this.currentFontSize, ">");

                // handle wrapped text
                if (_Console.currentXPosition <= 0 && _Console.linesAdvanced >= 0)
                {
                    _Console.currentXPosition = _Console.lastXPosition;
                    _Console.currentYPosition = _Console.lastYPosition;

                    if (_Console.linesAdvanced > 0)
                        _Console.linesAdvanced -= 1;
                }
                /* else if (_Console.linesAdvanced === 0 && _Console.currentXPosition <= promptOffset)
                 return;*/
            } else if (keyCode !== 38 && keyCode !== 40)
                _KernelInputQueue.enqueue(chr);
        }
    }
});
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
/**
 *==============================================================================
 * Class SystemServices
 *    
 * @class SystemServices
 * @memberOf jambOS.OS
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.SystemServices = jambOS.util.createClass(/** @scope jambOS.OS.SystemServices.prototype */{
    /**
     * @property {string} type
     */
    type: "systemservices",
    /**
     * Adds prompt string to console display
     */
    putPrompt: function()
    {
        _StdIn.putText(this.promptStr);
    },
    /**
     * Handles commands and entered text
     * @param {string} buffer
     */
    handleInput: function(buffer)
    {
        _Kernel.trace("Shell Command~" + buffer);
        // 
        // Parse the input...
        //
        var userCommand = this.parseInput(buffer);
        
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
                var fn = this.commandList[index].behavior;
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
            if (this.curses.indexOf("[" + jambOS.util.rot13(cmd) + "]") >= 0)      // Check for curses.
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
    /**
     * Sanitizes buffer input
     * @param {string} buffer 
     * @returns {jambOS.OS.UserCommand} retVal
     */
    parseInput: function(buffer)
    {
        var retVal = new jambOS.OS.UserCommand();

        // 1. Remove leading and trailing spaces.
        buffer = jambOS.util.trim(buffer);

        // 2. Lower-case it.
        buffer = buffer.toLowerCase();

        // 3. Separate on spaces so we can determine the command and command-line args, if any.
        var tempList = buffer.split(" ");

        // 4. Take the first (zeroth) element and use that as the command.
        var cmd = tempList.shift();  // Yes, you can do that to an array in JavaScript.  See the Queue class.
        // 4.1 Remove any left-over spaces.
        cmd = jambOS.util.trim(cmd);
        // 4.2 Record it in the return value.
        retVal.command = cmd;
        retVal.args = [];

        // 5. Now create the args array from what's left.
        for (var i in tempList)
        {
            var arg = jambOS.util.trim(tempList[i]);
            if (arg !== "")
            {
                retVal.args.push(tempList[i]);
            }
        }
        return retVal;
    },
    /**
     * Executes functions. This is useful to us when executing a
     * user command
     * @param {function} fn
     * @param {array} args
     */
    execute: function(fn, args)
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
jambOS.OS.UserCommand = jambOS.util.createClass(
{
    // Properties
    command: "",
    args: []
});
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
        sc = new jambOS.OS.ShellCommand({
            command: "kill",
            description: "<id> - kills the specified process id",
            behavior: function(args) {
                var pid = args[0];
                switch (pid) {
                    case "all":
                        break;
                    default:
                        pid = parseInt(pid);

                        var pcb = $.grep(_Kernel.processManager.processes, function(el) {
                            return el.pid === pid;
                        })[0];

                        break;
                }
            }});
        this.commandList.push(sc);



        // run <id>
        sc = new jambOS.OS.ShellCommand({
            command: "run",
            description: "<id> - Runs program already in memory",
            behavior: function(args) {
                var pid = args[0];
                pid = parseInt(pid);

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
                    _StdIn.putText("Usage: run <id | all> - Runs program already in memory");
            }});
        this.commandList.push(sc);

        // runall
        sc = new jambOS.OS.ShellCommand({
            command: "runall",
            description: "- Runs all programs loaded in memory",
            behavior: function(args) {

                if (_Kernel.processManager.processes.length > 0 && !_Stepover) {
                    for (var pid in _Kernel.processManager.processes) {
                        var pcb = _Kernel.processManager.processes[pid];
                        _Kernel.processManager.readyQueue.push(pcb);
                    }

                    var process = _Kernel.processManager.readyQueue.shift();
                    _Kernel.processManager.set("activeSlot", process.slot);
                    _Kernel.processManager.execute(process);
                    _Kernel.processManager.processes.splice(process.pid, 0);
                } else
                    _StdIn.putText("There are no processes to run!");

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
    /**
     * @property {jambOS.OS.DeviceDriverKeyboard} keyboardDriver
     */
    keyboardDriver: null,
    /**
     * @property {jambOS.OS.MemoryManager} memoryManager
     */
    memoryManager: null,
    /**
     * @property {jambOS.OS.ProcessManager} processManager
     */
    processManager: null,
    /**
     * Constructor
     */
    initialize: function() {

        // support Previous calls from outside
        krnInterruptHandler = this.interruptHandler;

        this.memoryManager = new jambOS.OS.MemoryManager();
        this.processManager = new jambOS.OS.ProcessManager();
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
        _KernelInterruptQueue = new jambOS.OS.Queue();  // A (currently) non-priority queue for interrupt requests (IRQs).
        _KernelBuffers = new Array();         // Buffers... for the kernel.
        _KernelInputQueue = new jambOS.OS.Queue();      // Where device input lands before being processed out somewhere.

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
        _OsShell = new jambOS.OS.Shell();

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
    /**
     * This gets called from the host hardware sim every time there is a 
     * hardware clock pulse. This is NOT the same as a TIMER, which causes an 
     * interrupt and is handled like other interrupts. This, on the other hand, 
     * is the clock pulse from the hardware (or host) that tells the kernel 
     * that it has to look for interrupts and process them if it finds any.                          
     */
    onCPUClockPulse: function()
    {
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
    /**
     * Enables Interupts
     */
    enableInterupts: function()
    {
        // Keyboard
        _Device.hostEnableKeyboardInterrupt();
        // Put more here.
    },
    /**
     * Disables Interupts
     */
    disableInterupts: function()
    {
        // Keyboard
        _Device.hostDisableKeyboardInterrupt();
        // Put more here.
    },
    /**
     * Handles all interupts
     */
    interruptHandler: function(irq, params)
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
            case PROCESS_INITIATION_IRQ:
                self.processInitiationISR(params);
                break;
            case PROCESS_TERMINATION_IRQ:
                self.processTerminationISR(params);
                break;
            case CONTEXT_SWITCH_IRQ:
                self.contextSwitchISR(self.processManager.get("currentProcess"));
                break;
            default:
                self.trapError("Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]");
        }
    },
    /**
     * Initiates a process routine
     */
    processInitiationISR: function(pcb) {
        _CPU.start(pcb);
    },
    /**
     * Terminates a process routine
     */
    processTerminationISR: function(pcb) {
        var self = this;
        _CPU.stop();

        self.memoryManager.deallocate(pcb);
    },
    contextSwitchISR: function(pcb) {
//        console.log(pcb);
        var self = this;
        pcb.pc = _CPU.pc;
        pcb.xReg = _CPU.xReg;
        pcb.yReg = _CPU.yReg;
        pcb.zFlag = _CPU.zFlag;
        pcb.state = "waiting";
        var nextProcess = self.processManager.readyQueue.shift();
        if (nextProcess) {
            nextProcess.set("state", "ready");
            self.processManager.readyQueue.push(pcb);
            

//            for (var key in self.processManager.processes) {
//                if (nextProcess.pid !== self.processManager.processes[key].pid)
//                    self.processManager.processes[key].state = "waiting";
//                else
//                
//                {
//                    var process = self.processManager.processes[key];
//                    process.base = _CPU.pc;
//                    process.state = "waiting";
//                    self.processManager.readyQueue.push(nextProcess);
//                }
//            }


            self.processManager.set("currentProcess", nextProcess);
            self.processManager.processCycles = 0;
            _CPU.set({
                pc: nextProcess.pc,
                xReg: nextProcess.xReg,
                yReg: nextProcess.yReg,
                zFlag: nextProcess.zFlag,
                isExecuting: true
            });
        }
    },
    /**
     * The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver).
     */
    timerISR: function()
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
// 
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
                if (_OSclock % 10 === 0)  // Check the CPU_CLOCK_INTERVAL in globals.js for an 
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
    /**
     * This is our OS Error trap
     * @public
     * @method trapError
     */
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
        _Console.currentXPosition = _Canvas.width;
        _StdIn.advanceLine();

        if (killSwitch)
            this.shutdown();
    }

});
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
     * @property {int} limit                - Memory limit for a process
     */
    limit: 0,
    /**
     * @property {int} pid                  - process id
     */
    pid: 0,
    /**
     * @property {int} pc                   - Program Counter
     */
    pc: 0,
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
     * @property {int} slot                 - slot in which the process is loaded
     */
    slot: 0,
    /**
     * Constructor
     * @param {object} options
     */
    initialize: function(options){        
        options || (options = {});
        this.setOptions(options);
    }
});
