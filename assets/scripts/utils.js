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
 * @property
 * @type {scope}
 */
jambOS.util = {};

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
            var toFixed = fabric.util.toFixed;

            if (key === 'width' || key === 'height') {
                this.minScaleLimit = toFixed(Math.min(0.1, 1 / Math.max(this.width, this.height)), 2);
            }

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

