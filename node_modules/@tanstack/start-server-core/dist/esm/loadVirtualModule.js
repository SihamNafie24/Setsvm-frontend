import { VIRTUAL_MODULES } from "./virtual-modules.js";
async function loadVirtualModule(id) {
  switch (id) {
    case VIRTUAL_MODULES.startManifest:
      return await import("tanstack-start-manifest:v");
    case VIRTUAL_MODULES.injectedHeadScripts:
      return await import("tanstack-start-injected-head-scripts:v");
    default:
      throw new Error(`Unknown virtual module: ${id}`);
  }
}
export {
  loadVirtualModule
};
//# sourceMappingURL=loadVirtualModule.js.map
