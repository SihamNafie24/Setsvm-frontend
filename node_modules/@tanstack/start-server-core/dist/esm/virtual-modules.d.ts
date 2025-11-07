export declare const VIRTUAL_MODULES: {
    readonly startManifest: "tanstack-start-manifest:v";
    readonly serverFnManifest: "#tanstack-start-server-fn-manifest";
    readonly injectedHeadScripts: "tanstack-start-injected-head-scripts:v";
};
export type VirtualModules = {
    [VIRTUAL_MODULES.startManifest]: typeof import('tanstack-start-manifest:v');
    [VIRTUAL_MODULES.injectedHeadScripts]: typeof import('tanstack-start-injected-head-scripts:v');
};
