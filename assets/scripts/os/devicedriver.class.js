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
