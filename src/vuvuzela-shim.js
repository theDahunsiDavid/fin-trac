// Vuvuzela shim for PouchDB compatibility
// Vuvuzela is a simple helper for creating noisy functions in PouchDB

function vuvuzela(func) {
  // Simple pass-through implementation
  // Vuvuzela in PouchDB is used for debugging/testing purposes
  return func;
}

// Add any additional methods that might be expected
vuvuzela.createNoise = function() {
  return function() {
    // No-op noise function
  };
};

vuvuzela.makeNoisy = function(func) {
  return func;
};

// Export for ES6 modules
export default vuvuzela;
export { vuvuzela };

console.log('Vuvuzela shim loaded successfully');
