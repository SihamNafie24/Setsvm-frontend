import { CompileDirectivesOpts, DirectiveFn, GenerateFunctionIdFn } from './compilers.js';
import { Plugin } from 'vite';
export type { DirectiveFn, CompileDirectivesOpts, ReplacerFn, GenerateFunctionIdFn, } from './compilers.js';
export type DirectiveFunctionsViteEnvOptions = Pick<CompileDirectivesOpts, 'getRuntimeCode' | 'replacer'> & {
    envLabel: string;
};
export type DirectiveFunctionsViteOptions = Pick<CompileDirectivesOpts, 'directive' | 'directiveLabel'> & DirectiveFunctionsViteEnvOptions & {
    onDirectiveFnsById?: (directiveFnsById: Record<string, DirectiveFn>) => void;
    generateFunctionId: GenerateFunctionIdFn;
};
export type DirectiveFunctionsVitePluginEnvOptions = Pick<CompileDirectivesOpts, 'directive' | 'directiveLabel'> & {
    environments: {
        client: DirectiveFunctionsViteEnvOptions & {
            envName?: string;
        };
        server: DirectiveFunctionsViteEnvOptions & {
            envName?: string;
        };
    };
    onDirectiveFnsById?: (directiveFnsById: Record<string, DirectiveFn>) => void;
    generateFunctionId: GenerateFunctionIdFn;
};
export declare function TanStackDirectiveFunctionsPluginEnv(opts: DirectiveFunctionsVitePluginEnvOptions): Plugin;
