"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const node_url = require("node:url");
const routerUtils = require("@tanstack/router-utils");
const compilers = require("./compilers.cjs");
const debug = process.env.TSR_VITE_DEBUG && ["true", "directives-functions-plugin"].includes(process.env.TSR_VITE_DEBUG);
const createDirectiveRx = (directive) => new RegExp(`"${directive}"|'${directive}'`, "gm");
function TanStackDirectiveFunctionsPluginEnv(opts) {
  opts = {
    ...opts,
    environments: {
      client: {
        envName: "client",
        ...opts.environments.client
      },
      server: {
        envName: "server",
        ...opts.environments.server
      }
    }
  };
  let root = process.cwd();
  const directiveRx = createDirectiveRx(opts.directive);
  return {
    name: "tanstack-start-directive-vite-plugin",
    enforce: "pre",
    buildStart() {
      root = this.environment.config.root;
    },
    applyToEnvironment(env) {
      return [
        opts.environments.client.envName,
        opts.environments.server.envName
      ].includes(env.name);
    },
    transform: {
      filter: {
        code: directiveRx
      },
      handler(code, id) {
        const envOptions = [
          opts.environments.client,
          opts.environments.server
        ].find((e) => e.envName === this.environment.name);
        if (!envOptions) {
          throw new Error(`Environment ${this.environment.name} not found`);
        }
        return transformCode({
          ...opts,
          ...envOptions,
          code,
          id,
          root
        });
      }
    }
  };
}
function transformCode({
  code,
  id,
  envLabel,
  directive,
  directiveLabel,
  getRuntimeCode,
  generateFunctionId,
  replacer,
  onDirectiveFnsById,
  root
}) {
  const url = node_url.pathToFileURL(id);
  url.searchParams.delete("v");
  id = node_url.fileURLToPath(url).replace(/\\/g, "/");
  if (debug) console.info(`${envLabel}: Compiling Directives: `, id);
  const { compiledResult, directiveFnsById, isDirectiveSplitParam } = compilers.compileDirectives({
    directive,
    directiveLabel,
    getRuntimeCode,
    generateFunctionId,
    replacer,
    code,
    root,
    filename: id
  });
  if (!isDirectiveSplitParam) {
    onDirectiveFnsById?.(directiveFnsById);
  }
  if (debug) {
    routerUtils.logDiff(code, compiledResult.code);
    console.log("Output:\n", compiledResult.code + "\n\n");
  }
  return compiledResult;
}
exports.TanStackDirectiveFunctionsPluginEnv = TanStackDirectiveFunctionsPluginEnv;
//# sourceMappingURL=index.cjs.map
