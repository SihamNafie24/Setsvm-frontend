"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_async_hooks = require("node:async_hooks");
const startStorage = new node_async_hooks.AsyncLocalStorage();
async function runWithStartContext(context, fn) {
  return startStorage.run(context, fn);
}
function getStartContext(opts) {
  const context = startStorage.getStore();
  if (!context && (opts == null ? void 0 : opts.throwIfNotFound) !== false) {
    throw new Error(
      `No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`
    );
  }
  return context;
}
exports.getStartContext = getStartContext;
exports.runWithStartContext = runWithStartContext;
//# sourceMappingURL=async-local-storage.cjs.map
