import { rootRouteId } from "@tanstack/router-core";
import { VIRTUAL_MODULES } from "./virtual-modules.js";
import { loadVirtualModule } from "./loadVirtualModule.js";
async function getStartManifest() {
  const { tsrStartManifest } = await loadVirtualModule(
    VIRTUAL_MODULES.startManifest
  );
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId] = startManifest.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  let script = `import('${startManifest.clientEntry}')`;
  if (process.env.TSS_DEV_SERVER === "true") {
    const { injectedHeadScripts } = await loadVirtualModule(
      VIRTUAL_MODULES.injectedHeadScripts
    );
    if (injectedHeadScripts) {
      script = `${injectedHeadScripts + ";"}${script}`;
    }
  }
  rootRoute.assets.push({
    tag: "script",
    attrs: {
      type: "module",
      suppressHydrationWarning: true,
      async: true
    },
    children: script
  });
  const manifest = {
    ...startManifest,
    routes: Object.fromEntries(
      Object.entries(startManifest.routes).map(([k, v]) => {
        const { preloads, assets } = v;
        const result = {};
        if (preloads) {
          result["preloads"] = preloads;
        }
        if (assets) {
          result["assets"] = assets;
        }
        return [k, result];
      })
    )
  };
  return manifest;
}
export {
  getStartManifest
};
//# sourceMappingURL=router-manifest.js.map
