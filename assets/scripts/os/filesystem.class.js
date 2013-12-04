jambOS.OS.FileSystem = new jambOS.util.createClass({   
    /**
     * @property {string} type
     */
    type: "filesystem",
    /**
     * @property {localStorage} storage - This is our storage unit
     */
    storage: null, 
    /**
     * Reads data from harddrive
     * @public
     * @method
     * @param {string} address - Adress location to read from
     * @returns {string} data
     */
    read: function(address) {
        return this.storage.getItem(address);
    },
    /**
     * Writes to the harddrive
     * @public
     * @method write
     * @param {string} address - Address location to write to
     * @param {string} data - Data to write to specified data address
     */
    write: function(address, data) {
        this.storage.setItem(address, data);
    },
    /**
     * Creates file in our harddrive
     * @public
     * @method createFile
     * @param {strign} filename 
     */
    createFile: function(filename) {
        var availableTSB = this.findNextAvailableTSB();
        if (availableTSB) {
            this.initializeTSB(availableTSB, filename);
        }
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
        
        var tsbValue = "[0,-1,-1,-1,\"" + this.sanitizeFileSystemValue("") + "\"]";
        
        // MBR at TSB(0,0,0)
        if (track === 0 && sector === 0 && block === 0)
            tsbValue = "[1,-1,-1,-1,\"" + this.sanitizeFileSystemValue("MBR") + "\"]";
        
        this.write("[" + track + "," + sector + "," + block + "]", tsbValue);
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
        var fileDataTSB = jambOS.util.clone(tsb);
        fileDataTSB.track += 1;
        
        var fileDataAdress = this._getAddress(fileDataTSB);
        var fileNameAddress = this._getAddress(fileNameTSB);
        var value = JSON.parse(this.read(fileDataAdress));
        var occupiedBit = value[0];
        var track = value[1];
        var sector = value[2];
        var block = value[3];
        
        if (occupiedBit === 0)
            occupiedBit = 1;
        
        // file metadata
        var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + this.sanitizeFileSystemValue(filename) + "\"]";
        this.write(fileNameAddress, value);
        
        // file data
        var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + this.sanitizeFileSystemValue("") + "\"]";
        this.write(fileDataAdress, value);
    },
    /**
     * Sanitizes file system value
     * @public
     * @method sanitizeFileSystemValue
     * @param {string} value 
     * @returns {string} value
     */
    sanitizeFileSystemValue: function(value) {
        
        var sizeOfData = value.length;
        
        // Sanitize our value by adding dashes at empty spaces
        for (var i = sizeOfData; i < MAX_FILESIZE; i++)
            value += "-";
        
        return value;
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
        for (var address in this.storage)
        {
            var tsb = this._parseAddress(address);
            decimalAddress = tsb.track + tsb.sector + tsb.block;
            
            // We don't want to loop through the filenames
            if (decimalAddress >= 0 && decimalAddress <= MBR_END_ADRESS)
            {
                value = JSON.parse(this.storage[address]);
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
     * Parses storage address
     * @private
     * @method _parseAddress
     * @param {string} address
     * @returns {object} tsb
     */
    _parseAddress: function(address) {
        var sanitizedAddress = address.replace(/\[|,|\]/g, "");
        var track = sanitizedAddress.charAt(0);
        var sector = sanitizedAddress.charAt(1);
        var block = sanitizedAddress.charAt(2);
        
        var tsb = {track: parseInt(track), sector: parseInt(sector), block: parseInt(block)};
        
        return tsb;
    },
    /**
     * Get's address in storaget given a tsb
     * @private
     * @method _getAddress
     * @param {object} tsb
     * @returns {string} address
     */
    _getAddress: function(tsb) {
        return "[" + tsb.track + "," + tsb.sector + "," + tsb.block + "]";
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