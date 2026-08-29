import '@testing-library/jest-dom';

// Node 22+ ships a broken global `localStorage` stub (it has no methods) that
// shadows jsdom's implementation in the test environment. Install a working
// in-memory localStorage so storage-dependent utils are deterministic.
if (!globalThis.localStorage || typeof globalThis.localStorage.clear !== 'function') {
  const store = new Map();
  const localStorageMock = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  });
}