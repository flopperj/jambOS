/**
 *==============================================================================
 * harddrive.class.js
 *    
 * @class HardDrive
 * @memberOf jambOS.host 
 * @inheritsFrom jambOS.OS.FileSystem
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.host.HardDrive = jambOS.util.createClass(jambOS.OS.FileSystem, {
    /**
     * @property {string} type
     */
    type: "harddrive",
    /**
     * Constructor
     */
    initialize: function() {
        if (this._canSupportLocalStorage()) {
            this.storage = localStorage;
            this.formatDrive();
        }
    },
    /**
     * Formarts drive
     * @public
     * @method formatDrive
     */
    formatDrive: function() {
        // clear local storage
        this.storage.clear();

        // clear out our filenames
        this.usedFilenames = [];

        // initialize of all the tracks
        for (var track = 0; track < ALLOCATABLE_TRACKS; track++) {
            for (var sector = 0; sector < ALLOCATABLE_SECTORS; sector++) {
                for (var block = 0; block < ALLOCATABLE_BLOCKS; block++)
                    this.resetTSB(track, sector, block);
            }
        }
    }
});