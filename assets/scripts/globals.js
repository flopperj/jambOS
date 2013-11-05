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
var MEMORY_BLOCK_SIZE = 256;
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