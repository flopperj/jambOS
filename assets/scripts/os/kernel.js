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
        hostEnableKeyboardInterrupt();
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