import { getStartContext } from "@tanstack/start-storage-context";
import { createServerOnlyFn } from "./envOnly.js";
const getStartContextServerOnly = createServerOnlyFn(getStartContext);
export {
  getStartContextServerOnly
};
//# sourceMappingURL=getStartContextServerOnly.js.map
