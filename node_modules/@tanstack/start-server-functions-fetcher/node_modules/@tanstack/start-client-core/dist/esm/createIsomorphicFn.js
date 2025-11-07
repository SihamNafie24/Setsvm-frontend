function createIsomorphicFn() {
  return {
    server: () => ({ client: () => () => {
    } }),
    client: () => ({ server: () => () => {
    } })
  };
}
export {
  createIsomorphicFn
};
//# sourceMappingURL=createIsomorphicFn.js.map
