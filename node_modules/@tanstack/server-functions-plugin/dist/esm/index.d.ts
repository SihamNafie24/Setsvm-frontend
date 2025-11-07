import { Plugin } from 'vite';
import { GenerateFunctionIdFn, ReplacerFn } from '@tanstack/directive-functions-plugin';
export type GenerateFunctionIdFnOptional = (opts: Omit<Parameters<GenerateFunctionIdFn>[0], 'extractedFilename'>) => string | undefined;
export type TanStackServerFnPluginOpts = {
    /**
     * The virtual import ID that will be used to import the server function manifest.
     * This virtual import ID will be used in the server build to import the manifest
     * and its modules.
     */
    manifestVirtualImportId: string;
    generateFunctionId?: GenerateFunctionIdFnOptional;
    client: ServerFnPluginEnvOpts;
    server: ServerFnPluginEnvOpts;
};
export type ServerFnPluginEnvOpts = {
    getRuntimeCode: () => string;
    replacer: ReplacerFn;
    envName?: string;
};
export declare function TanStackServerFnPlugin(_opts: TanStackServerFnPluginOpts): Array<Plugin>;
