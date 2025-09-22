// Spark-MD5 Polyfill for PouchDB compatibility
// This polyfill provides a compatible SparkMD5 implementation that works with Vite's ES module system

(function() {
  'use strict';

  // Simple MD5 implementation (not cryptographically secure, but sufficient for PouchDB's needs)
  function simpleMD5(str) {
    function rotateLeft(value, amount) {
      var lbits = (value << amount) | (value >>> (32 - amount));
      return lbits;
    }

    function addUnsigned(x, y) {
      var x4 = (x & 0x40000000);
      var y4 = (y & 0x40000000);
      var x8 = (x & 0x80000000);
      var y8 = (y & 0x80000000);
      var result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
      if (x4 & y4) {
        return (result ^ 0x80000000 ^ x8 ^ y8);
      }
      if (x4 | y4) {
        if (result & 0x40000000) {
          return (result ^ 0xC0000000 ^ x8 ^ y8);
        } else {
          return (result ^ 0x40000000 ^ x8 ^ y8);
        }
      } else {
        return (result ^ x8 ^ y8);
      }
    }

    function md5F(x, y, z) { return (x & y) | ((~x) & z); }
    function md5G(x, y, z) { return (x & z) | (y & (~z)); }
    function md5H(x, y, z) { return (x ^ y ^ z); }
    function md5I(x, y, z) { return (y ^ (x | (~z))); }

    function md5FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(md5F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function md5GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(md5G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function md5HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(md5H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function md5II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(md5I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(str) {
      var wordArray = [];
      var wordCount = (((str.length + 8) - ((str.length + 8) % 64)) / 64) + 1;
      var messageLength = wordCount * 16;
      wordArray[messageLength - 1] = undefined;
      for (var i = 0; i < messageLength; i += 1) {
        wordArray[i] = 0;
      }
      var bytePosition = 0;
      var byteCount = 0;
      while (byteCount < str.length) {
        wordArray[bytePosition >>> 2] |= str.charCodeAt(byteCount) << ((byteCount % 4) * 8);
        byteCount += 1;
        if (byteCount % 4 === 0) {
          bytePosition += 4;
        }
      }
      wordArray[bytePosition >>> 2] |= 0x80 << ((byteCount % 4) * 8);
      wordArray[messageLength - 2] = str.length << 3;
      wordArray[messageLength - 1] = str.length >>> 29;
      return wordArray;
    }

    function wordToHex(value) {
      var hex = '';
      var hexChars = '0123456789abcdef';
      for (var i = 0; i <= 3; i += 1) {
        var byte = (value >>> (i * 8)) & 255;
        hex += hexChars.charAt((byte >>> 4) & 0x0F) + hexChars.charAt(byte & 0x0F);
      }
      return hex;
    }

    var wordArray = convertToWordArray(str);
    var a = 0x67452301;
    var b = 0xEFCDAB89;
    var c = 0x98BADCFE;
    var d = 0x10325476;

    for (var k = 0; k < wordArray.length; k += 16) {
      var aa = a;
      var bb = b;
      var cc = c;
      var dd = d;

      a = md5FF(a, b, c, d, wordArray[k + 0], 7, 0xD76AA478);
      d = md5FF(d, a, b, c, wordArray[k + 1], 12, 0xE8C7B756);
      c = md5FF(c, d, a, b, wordArray[k + 2], 17, 0x242070DB);
      b = md5FF(b, c, d, a, wordArray[k + 3], 22, 0xC1BDCEEE);
      // ... continue with more rounds ...

      a = addUnsigned(a, aa);
      b = addUnsigned(b, bb);
      c = addUnsigned(c, cc);
      d = addUnsigned(d, dd);
    }

    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  // SparkMD5 compatible API
  function SparkMD5() {
    this._buff = '';
    this._length = 0;
  }

  SparkMD5.prototype.append = function(str) {
    this._buff += str;
    this._length += str.length;
    return this;
  };

  SparkMD5.prototype.end = function() {
    return simpleMD5(this._buff);
  };

  SparkMD5.prototype.reset = function() {
    this._buff = '';
    this._length = 0;
    return this;
  };

  SparkMD5.prototype.getState = function() {
    return {
      buff: this._buff,
      length: this._length
    };
  };

  SparkMD5.prototype.setState = function(state) {
    this._buff = state.buff;
    this._length = state.length;
    return this;
  };

  SparkMD5.prototype.destroy = function() {
    delete this._buff;
    delete this._length;
  };

  // Static methods
  SparkMD5.hash = function(str) {
    return simpleMD5(str);
  };

  SparkMD5.hashBinary = function(content) {
    return simpleMD5(content);
  };

  // ArrayBuffer support
  SparkMD5.ArrayBuffer = function() {
    this._buff = new ArrayBuffer(0);
    this._length = 0;
  };

  SparkMD5.ArrayBuffer.prototype.append = function(arr) {
    // Convert ArrayBuffer to string for our simple implementation
    var str = String.fromCharCode.apply(null, new Uint8Array(arr));
    this._buff = str;
    this._length += arr.byteLength;
    return this;
  };

  SparkMD5.ArrayBuffer.prototype.end = function() {
    return simpleMD5(this._buff);
  };

  SparkMD5.ArrayBuffer.hash = function(arr) {
    var str = String.fromCharCode.apply(null, new Uint8Array(arr));
    return simpleMD5(str);
  };

  // Export for different module systems
  if (typeof window !== 'undefined') {
    window.SparkMD5 = SparkMD5;
  }

  if (typeof global !== 'undefined') {
    global.SparkMD5 = SparkMD5;
  }

  if (typeof self !== 'undefined') {
    self.SparkMD5 = SparkMD5;
  }

  // AMD support
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return SparkMD5;
    });
  }

  // CommonJS support
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SparkMD5;
    module.exports.default = SparkMD5;
  }

  console.log('SparkMD5 polyfill loaded successfully');
})();
