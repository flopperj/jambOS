/**
 *==============================================================================
 * filesystem.class.js
 * 
 * Currently the harddrive subclasses the filesystem class
 *    
 * @class FileSystem
 * @memberOf jambOS.OS
 * @inheritsFrom jambOS.OS.DeviceDriver
 * @param {object} - Array Object containing the default values to be 
 *                             passed to the class
 *==============================================================================
 */
jambOS.OS.FileSystemDriver = new jambOS.util.createClass(jambOS.OS.DeviceDriver, {
    /**
     * @property {string} type
     */
    type: "filesystem",
    /**
     * @propert {array} usedFilenames - contains a list of created files
     */
    usedFilenames: [],
    /**
     * @property {localStorage} storage - This is our storage unit
     */
    storage: null,
    /**
     * Interrupt service routine that will handle all our read, write, delete,
     * create, list, and format filesystem calls
     * @public
     * @method isr
     * @param {int} routine
     * @param {object} data
     */
    isr: function(routine, data) {
        var filename = data["filename"];
        var fileData = data["fileData"];

        switch (routine) {
            case FSDD_CREATE:
                this.createFile(filename);
                break;
            case FSDD_READ:
                this.readFile(filename);
                break;
            case FSDD_WRITE:
                this.writeFile(filename, fileData);
                break;
            case FSDD_DELETE:
                this.deleteFile(filename);
                break;
            case FSDD_FORMAT:
                _HardDrive.formatDrive();
                break;
            case FSDD_LIST_FILES:
                this.listFiles();
                break;
        }

    },
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
        var availableTSB = _HardDrive.findNextAvailableTSB();
        var isDuplicate = this._isDuplicate(filename);

        // TODO: check for special characters, we might not want to create files with speical characters
        
        if (availableTSB && !isDuplicate) {
            _HardDrive.initializeTSB(availableTSB, filename);
            _StdIn.putText("File created: " + filename);
        } else
            _StdIn.putText("Sorry: Cannot create duplicate files!");
    },
    /**
     * Reads contents from a file
     * @public
     * @method readFile
     * @param {string} filename 
     */
    readFile: function(filename) {

        // get filename and its address from our array list of used filenames
        var file = $.grep(this.usedFilenames, function(el) {
            return el.filename.toLowerCase() === filename.toLowerCase();
        })[0];

        if (file) {
            // get metadata content that holds tsb address to where content is stored
            var value = JSON.parse(this.read(file.address));
            var track = parseInt(value[TRACK_BIT]);
            var sector = parseInt(value[SECTOR_BIT]);
            var block = parseInt(value[BLOCK_BIT]);

            // use previous info to get content from where its stored in storage
            var dataAddress = this._getAddress({track: track, sector: sector, block: block});
            var data = JSON.parse(this.read(dataAddress));
            track = parseInt(data[TRACK_BIT]);
            sector = parseInt(data[SECTOR_BIT]);
            block = parseInt(data[BLOCK_BIT]);
            var content = data[CONTENT_BIT];

            // output data to screen
            _StdIn.putText(content);

            // handle text that wrapped around
            while (track !== -1) {
                dataAddress = this._getAddress({track: track, sector: sector, block: block});
                data = JSON.parse(this.read(dataAddress));
                track = parseInt(data[TRACK_BIT]);
                sector = parseInt(data[SECTOR_BIT]);
                block = parseInt(data[BLOCK_BIT]);
                content = data[CONTENT_BIT];
                _StdIn.putText(content);
            }
        } else
            _StdIn.putText("Sorry: File \"" + filename + "\" not found!");

    },
    /**
     * Writes data to file
     * @public
     * @method writeFile
     * @param {string} filename
     * @param {string} fileData
     */
    writeFile: function(filename, fileData) {
        var self = this;
        // get filename and its address from our array list of used filenames
        var file = $.grep(this.usedFilenames, function(el) {
            return el.filename.toLowerCase() === filename.toLowerCase();
        })[0];

        if (file) {
            // get metadata content that holds tsb address to where content is stored
            var value = JSON.parse(this.read(file.address));
            var track = parseInt(value[TRACK_BIT]);
            var sector = parseInt(value[SECTOR_BIT]);
            var block = parseInt(value[BLOCK_BIT]);

            // use previous info to get content from where its stored in storage
            var dataAddress = this._getAddress({track: track, sector: sector, block: block});
            var data = JSON.parse(this.read(dataAddress));
            track = parseInt(data[TRACK_BIT]);
            sector = parseInt(data[SECTOR_BIT]);
            block = parseInt(data[BLOCK_BIT]);

            // split our data into chunks of 60bit content
            var content = fileData.match(/.{1,60}/g);
            var occupiedBit = 1;
            $.each(content, function() {
                if (block < ALLOCATABLE_BLOCKS)
                    block += 1;
                else {
                    if (sector < ALLOCATABLE_SECTORS)
                        sector += 1;
                    else {
                        if (track < ALLOCATABLE_TRACKS && track > 0) {
                            track += 1;
                        }
                    }
                }

                // file data
                var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + self.sanitizeFileSystemValue(this) + "\"]";
                self.write(dataAddress, value);

            });

            // output success data to screen
            _StdIn.putText("Written data to: " + filename);

        } else
            _StdIn.putText("Sorry: File \"" + filename + "\" not found!");
    },
    /**
     * Deletes file from file system
     * @public
     * @method deleteFile
     * @param {string} filename
     */
    deleteFile: function(filename) {

        // get filename and its address from our array list of used filenames
        var file = $.grep(this.usedFilenames, function(el) {
            return el.filename.toLowerCase() === filename.toLowerCase();
        })[0];

        if (file) {
            // get metadata content that holds tsb address to where content is stored
            var value = JSON.parse(this.read(file.address));
            var track = parseInt(value[TRACK_BIT]);
            var sector = parseInt(value[SECTOR_BIT]);
            var block = parseInt(value[BLOCK_BIT]);
            var occupiedBit = 0;
            var fileAddress = file.address;

            // file metadata
            var value = "[" + occupiedBit + ",-1,-1,-1,\"" + this.sanitizeFileSystemValue("") + "\"]";
            this.write(fileAddress, value);

            // reset tsb
            _HardDrive.resetTSB(track, sector, block);

            // use previous info to get content from where its stored in storage
            var dataAddress = this._getAddress({track: track, sector: sector, block: block});
            var data = JSON.parse(this.read(dataAddress));
            track = parseInt(data[TRACK_BIT]);
            sector = parseInt(data[SECTOR_BIT]);
            block = parseInt(data[BLOCK_BIT]);

            // file data
            var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + this.sanitizeFileSystemValue("") + "\"]";
            this.write(dataAddress, value);

            // output data to screen
            _StdIn.putText("Deleted: \"" + file.filename + "\"");

            // make sure we remove our file from our used files array
            var tempList = [];
            $.each(this.usedFilenames, function() {
                if (this.filename.toLowerCase() !== filename.toLowerCase())
                    tempList.push(this);
            });
            this.usedFilenames = tempList;

            // handle text that wrapped around
            while (track !== -1) {
                dataAddress = this._getAddress({track: track, sector: sector, block: block});
                data = JSON.parse(this.read(dataAddress));
                track = parseInt(data[TRACK_BIT]);
                sector = parseInt(data[SECTOR_BIT]);
                block = parseInt(data[BLOCK_BIT]);

                // file data
                var value = "[" + occupiedBit + "," + track + "," + sector + "," + block + ",\"" + this.sanitizeFileSystemValue("") + "\"]";
                this.write(dataAddress, value);
            }
        } else
            _StdIn.putText("Sorry: File \"" + filename + "\" not found!");
    },
    /**
     * Lists out all the files in the file system
     * @public
     * @method listFiles
     */
    listFiles: function() {

        if (this.usedFilenames.length === 0)
            _StdIn.putText("File System is currently empty!");

        // Display all files in the file system
        $.each(this.usedFilenames, function() {
            _StdIn.putText(this.filename);
            _StdIn.advanceLine();
        });


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
     * Checks if filename is a duplicate
     * @private
     * @method _isDuplicate
     * @param {string} filename 
     * @returns {boolean}
     */
    _isDuplicate: function(filename) {
        var duplicates = $.grep(this.usedFilenames, function(el) {
            return el.filename.toLowerCase() === filename.toLowerCase();
        });
        return duplicates.length > 0;
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
    }
});