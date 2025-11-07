import { getStartContext } from "@tanstack/start-storage-context";
import { createIsomorphicFn } from "./createIsomorphicFn.js";
const getStartOptions = createIsomorphicFn().client(() => window.__TSS_START_OPTIONS__).server(() => getStartContext().startOptions);
export {
  getStartOptions
};
//# sourceMappingURL=getStartOptions.js.map
