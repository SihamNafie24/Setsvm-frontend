import { fileURLToPath } from "node:url";
import viteReact from "@vitejs/plugin-react";
import { TanStackStartVitePluginCore } from "@tanstack/start-plugin-core";
import path from "pathe";
import { getTanStackStartOptions } from "./schema.js";
function hasRootExport(exportsField) {
  if (!exportsField) return false;
  if (typeof exportsField === "string") {
    return true;
  }
  if (typeof exportsField === "object") {
    return "." in exportsField;
  }
  return false;
}
function TanStackStartVitePlugin(opts) {
  const options = getTanStackStartOptions(opts);
  if ((opts == null ? void 0 : opts.customViteReactPlugin) !== true) {
    console.warn(
      `please add the vite-react plugin to your Vite config and set 'customViteReactPlugin: true'`
    );
    console.warn(
      `TanStack Start will not configure the vite-react plugin in future anymore.`
    );
  }
  const isInsideRouterMonoRepo = (() => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.basename(path.resolve(currentDir, "../../../")) === "packages";
  })();
  return [
    {
      name: "tanstack-react-start:config",
      configEnvironment() {
        return {
          resolve: {
            dedupe: ["react", "react-dom", "@tanstack/react-router"],
            external: isInsideRouterMonoRepo ? ["@tanstack/react-router", "@tanstack/react-router-devtools"] : void 0
          },
          optimizeDeps: {
            exclude: ["@tanstack/react-router-devtools"],
            include: [
              "react",
              "react/jsx-runtime",
              "react/jsx-dev-runtime",
              "react-dom",
              "react-dom/client",
              "@tanstack/react-router"
            ]
          }
        };
      }
    },
    TanStackStartVitePluginCore(
      {
        framework: "react",
        getVirtualServerRootHandler(ctx) {
          return `
import { toWebRequest, defineEventHandler } from '@tanstack/react-start/server';
import serverEntry from '${ctx.serverEntryFilepath}';

export default defineEventHandler(function(event) {
  const request = toWebRequest(event);
  return serverEntry({ request });
});`;
        },
        getVirtualClientEntry(ctx) {
          return `
import { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/react-start';
import { createRouter } from '${ctx.routerFilepath}';

const router = createRouter();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient router={router} />
    </StrictMode>
  );
});`;
        },
        getVirtualServerEntry(ctx) {
          return `
import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server';
import { createRouter } from '${ctx.routerFilepath}';

export default createStartHandler({
  createRouter,
})(defaultStreamHandler);`;
        },
        crawlPackages(opts2) {
          if (opts2.name === "@tanstack/react-router-devtools") {
            return "exclude";
          }
          if (hasRootExport(opts2.exports) && "react" in opts2.peerDependencies) {
            return "include";
          }
          return void 0;
        }
      },
      options
    ),
    !(opts == null ? void 0 : opts.customViteReactPlugin) && viteReact(options.react)
  ];
}
export {
  TanStackStartVitePlugin,
  TanStackStartVitePlugin as tanstackStart
};
//# sourceMappingURL=index.js.map
