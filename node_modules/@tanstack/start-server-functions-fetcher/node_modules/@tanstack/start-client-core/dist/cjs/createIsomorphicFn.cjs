"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
function createIsomorphicFn() {
  return {
    server: () => ({ client: () => () => {
    } }),
    client: () => ({ server: () => () => {
    } })
  };
}
exports.createIsomorphicFn = createIsomorphicFn;
//# sourceMappingURL=createIsomorphicFn.cjs.map
