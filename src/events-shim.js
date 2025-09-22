// Events shim for PouchDB compatibility
// This provides a compatible EventEmitter implementation for browsers

// Simple EventEmitter implementation
class EventEmitter {
  constructor() {
    this._events = {};
    this._maxListeners = 10;
  }

  // Add listener
  on(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].push(listener);
    return this;
  }

  // Add one-time listener
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.removeListener(event, onceWrapper);
    };
    this.on(event, onceWrapper);
    return this;
  }

  // Remove listener
  removeListener(event, listener) {
    if (!this._events[event]) return this;

    const index = this._events[event].indexOf(listener);
    if (index > -1) {
      this._events[event].splice(index, 1);
    }

    if (this._events[event].length === 0) {
      delete this._events[event];
    }

    return this;
  }

  // Remove all listeners
  removeAllListeners(event) {
    if (event) {
      delete this._events[event];
    } else {
      this._events = {};
    }
    return this;
  }

  // Emit event
  emit(event, ...args) {
    if (!this._events[event]) return false;

    const listeners = this._events[event].slice();
    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }

    return true;
  }

  // Get listeners
  listeners(event) {
    return this._events[event] ? this._events[event].slice() : [];
  }

  // Get listener count
  listenerCount(event) {
    return this._events[event] ? this._events[event].length : 0;
  }

  // Set max listeners
  setMaxListeners(n) {
    this._maxListeners = n;
    return this;
  }

  // Get max listeners
  getMaxListeners() {
    return this._maxListeners;
  }

  // Event names
  eventNames() {
    return Object.keys(this._events);
  }

  // Add listener (alias for on)
  addListener(event, listener) {
    return this.on(event, listener);
  }

  // Remove listener (alias)
  off(event, listener) {
    return this.removeListener(event, listener);
  }

  // Prepend listener
  prependListener(event, listener) {
    if (!this._events[event]) {
      this._events[event] = [];
    }
    this._events[event].unshift(listener);
    return this;
  }

  // Prepend once listener
  prependOnceListener(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.removeListener(event, onceWrapper);
    };
    this.prependListener(event, onceWrapper);
    return this;
  }
}

// Static methods
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.defaultMaxListeners = 10;

// Utility function to check if object is EventEmitter
EventEmitter.listenerCount = function(emitter, event) {
  return emitter.listenerCount ? emitter.listenerCount(event) : 0;
};

// Export as both default and named export to cover all import styles
export default EventEmitter;
export { EventEmitter };

// Also provide the constructor as a named export for compatibility
export const Events = EventEmitter;

console.log('Events shim loaded successfully');
