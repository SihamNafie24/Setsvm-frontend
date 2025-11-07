import { getStartContext } from "@tanstack/start-storage-context";
import { createIsomorphicFn } from "./createIsomorphicFn.js";
const getRouterInstance = createIsomorphicFn().client(() => window.__TSR_ROUTER__).server(() => getStartContext().getRouter());
export {
  getRouterInstance
};
//# sourceMappingURL=getRouterInstance.js.map
