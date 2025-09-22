// Virtual spark-md5 module with proper ES6 exports
// This shim provides the SparkMD5 functionality that PouchDB expects
// Using js-md5 library for better compatibility

import md5 from "js-md5";

// SparkMD5 compatible implementation using js-md5
function SparkMD5() {
  this._buff = "";
  this._length = 0;
}

SparkMD5.prototype.append = function (str) {
  this._buff += str;
  this._length += str.length;
  return this;
};

SparkMD5.prototype.end = function () {
  return md5(this._buff);
};

SparkMD5.prototype.reset = function () {
  this._buff = "";
  this._length = 0;
  return this;
};

SparkMD5.prototype.getState = function () {
  return {
    buff: this._buff,
    length: this._length,
  };
};

SparkMD5.prototype.setState = function (state) {
  this._buff = state.buff;
  this._length = state.length;
  return this;
};

SparkMD5.prototype.destroy = function () {
  delete this._buff;
  delete this._length;
};

// Static methods
SparkMD5.hash = function (str) {
  return md5(str);
};

SparkMD5.hashBinary = function (content) {
  return md5(content);
};

// ArrayBuffer support
SparkMD5.ArrayBuffer = function () {
  this._buff = "";
  this._length = 0;
};

SparkMD5.ArrayBuffer.prototype.append = function (arr) {
  // Convert ArrayBuffer to string for MD5 processing
  const uint8Array = new Uint8Array(arr);
  let str = "";
  for (let i = 0; i < uint8Array.length; i++) {
    str += String.fromCharCode(uint8Array[i]);
  }
  this._buff += str;
  this._length += arr.byteLength;
  return this;
};

SparkMD5.ArrayBuffer.prototype.end = function () {
  return md5(this._buff);
};

SparkMD5.ArrayBuffer.prototype.reset = function () {
  this._buff = "";
  this._length = 0;
  return this;
};

SparkMD5.ArrayBuffer.prototype.getState = function () {
  return {
    buff: this._buff,
    length: this._length,
  };
};

SparkMD5.ArrayBuffer.prototype.setState = function (state) {
  this._buff = state.buff;
  this._length = state.length;
  return this;
};

SparkMD5.ArrayBuffer.prototype.destroy = function () {
  delete this._buff;
  delete this._length;
};

SparkMD5.ArrayBuffer.hash = function (arr) {
  const uint8Array = new Uint8Array(arr);
  let str = "";
  for (let i = 0; i < uint8Array.length; i++) {
    str += String.fromCharCode(uint8Array[i]);
  }
  return md5(str);
};

// Export as both default and named export to cover all import styles
export default SparkMD5;
export { SparkMD5 };

// Also export constructor functions for compatibility
export const ArrayBuffer = SparkMD5.ArrayBuffer;
export const hash = SparkMD5.hash;
export const hashBinary = SparkMD5.hashBinary;

console.log("SparkMD5 shim loaded successfully with js-md5 backend");
