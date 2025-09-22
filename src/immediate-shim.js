// Immediate shim for PouchDB compatibility
// This provides a compatible setImmediate implementation for browsers

let setImmediateFn;
let clearImmediateFn;

if (typeof setImmediate === 'function') {
  // Native setImmediate (IE, Node.js)
  setImmediateFn = setImmediate;
  clearImmediateFn = clearImmediate;
} else if (typeof MessageChannel !== 'undefined') {
  // MessageChannel-based implementation for modern browsers
  const channel = new MessageChannel();
  const callbacks = [];
  let messageId = 0;

  channel.port2.onmessage = function(event) {
    const id = event.data;
    if (callbacks[id]) {
      const callback = callbacks[id];
      delete callbacks[id];
      callback();
    }
  };

  setImmediateFn = function(callback) {
    const id = messageId++;
    callbacks[id] = callback;
    channel.port1.postMessage(id);
    return id;
  };

  clearImmediateFn = function(id) {
    delete callbacks[id];
  };
} else {
  // Fallback to setTimeout
  setImmediateFn = function(callback) {
    return setTimeout(callback, 0);
  };

  clearImmediateFn = function(id) {
    clearTimeout(id);
  };
}

// Export for ES6 modules
export default setImmediateFn;
export { setImmediateFn as setImmediate, clearImmediateFn as clearImmediate };

console.log('Immediate shim loaded successfully');
