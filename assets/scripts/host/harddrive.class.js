/**
 *==============================================================================
 * harddrive.class.js
 *    
 * @class HardDrive
 * @memberOf jambOS.host 
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.host.HardDrive = jambOS.util.createClass({
    /**
     * @property {string} type
     */
    type: "harddrive",
    fileSystem: null,
    /**
     * Constructor
     */
    initialize: function(options) {
        options || (options = {});
        this.setOptions(options);

        if (this._canSupportLocalStorage() && this.fileSystem) {
            this.fileSystem.storage = localStorage;
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
        this.fileSystem.storage.clear();

        // clear out our filenames
        this.fileSystem.usedFilenames = [];

        // initialize of all the tracks
        for (var track = 0; track < ALLOCATABLE_TRACKS; track++) {
            for (var sector = 0; sector < ALLOCATABLE_SECTORS; sector++) {
                for (var block = 0; block < ALLOCATABLE_BLOCKS; block++)
                    this.resetTSB(track, sector, block);
            }
        }

        // update display
        this.fileSystem.updateHardDriveDisplay();
    },
    /**
     * Resets TSB
     * @public
     * @method resetTSB
     * @param {int} track 
     * @param {int} sector 
     * @param {int} block
     */
    resetTSB: function(track, sector, block) {

        var tsbValue = "[0,-1,-1,-1,\"" + this.fileSystem.sanitizeFileSystemValue("") + "\"]";

        // MBR at TSB(0,0,0)
        if (track === 0 && sector === 0 && block === 0)
            tsbValue = "[1,-1,-1,-1,\"" + this.fileSystem.sanitizeFileSystemValue("MBR") + "\"]";

        this.fileSystem.write("[" + track + "," + sector + "," + block + "]", tsbValue);
    },
    /**
     * Initializes tsb
     * @public 
     * @method initializeTSB
     * @param {object} tsb
     * @param {string} filename
     */
    initializeTSB: function(tsb, filename) {

        var fileNameTSB = jambOS.util.clone(tsb);
        var fileDataTSB = this.findNextAvailableDataTSB();

        var fileDataAdress = this.fileSystem._getAddress(fileDataTSB);
        var fileNameAddress = this.fileSystem._getAddress(fileNameTSB);
        var value = JSON.parse(this.fileSystem.read(fileDataAdress));
        var occupiedBit = value[OCCUPIED_BIT];
        var track = value[TRACK_BIT];
        var sector = value[SECTOR_BIT];
        var block = value[BLOCK_BIT];

        if (occupiedBit === 0)
            occupiedBit = 1;

        // add filename to usedFilenames array
        this.fileSystem.usedFilenames.push({filename: filename, address: fileNameAddress});

        // file metadata
        var value = "[" + occupiedBit + "," + fileDataTSB.track + "," + fileDataTSB.sector + "," + fileDataTSB.block + ",\"" + this.fileSystem.sanitizeFileSystemValue(filename) + "\"]";
        this.fileSystem.write(fileNameAddress, value);

        // file data
        var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + this.fileSystem.sanitizeFileSystemValue("") + "\"]";
        this.fileSystem.write(fileDataAdress, value);
    },
    /**
     * Finds the next available tsb
     * @public
     * @method findNextAvailable
     * @returns {object} tsb
     */
    findNextAvailableTSB: function() {
        var decimalAddress = 0;
        var value = [];
        var occupiedBit = -1;

        // loop through address in storage
        for (var address in this.fileSystem.storage)
        {
            var tsb = this.fileSystem._parseAddress(address);
            decimalAddress = parseInt(tsb.track.toString() + tsb.sector.toString() + tsb.block.toString());

            // We don't want to loop through the filenames
            if (decimalAddress >= 0 && decimalAddress <= MBR_END_ADRESS)
            {
                value = JSON.parse(this.fileSystem.storage[address]);
                occupiedBit = value[0];

                // return tsb if not occupied
                if (occupiedBit === 0)
                {
                    return tsb;
                }
            }
        }

        return null;
    },
    /**
     * Finds the next available tsb
     * @public
     * @method findNextAvailable
     * @returns {object} tsb
     */
    findNextAvailableDataTSB: function() {
        var decimalAddress = 0;
        var value = [];
        var occupiedBit = -1;

        // loop through address in storage
        for (var address in this.fileSystem.storage)
        {
            var tsb = this.fileSystem._parseAddress(address);
            decimalAddress = parseInt(tsb.track.toString() + tsb.sector.toString() + tsb.block.toString());

            // We don't want to loop through the filenames
            if (decimalAddress > MBR_END_ADRESS)
            {
                value = JSON.parse(this.fileSystem.storage[address]);
                occupiedBit = value[0];

                // return tsb if not occupied
                if (occupiedBit === 0)
                {
                    return tsb;
                }
            }
        }

        return null;
    },
    /**
     * Checks for html5 storage support
     * @private
     * @method _canSupportLocalStorage
     * @returns {boolean} true|false
     */
    _canSupportLocalStorage: function() {
        try {
            return "localStorage" in window && window["localStorage"] !== null;
        } catch (e) {
            return false;
        }
    }
});