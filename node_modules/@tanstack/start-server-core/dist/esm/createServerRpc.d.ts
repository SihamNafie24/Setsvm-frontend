import { TSS_SERVER_FUNCTION } from '@tanstack/start-client-core';
export declare const createServerRpc: (functionId: string, splitImportFn: (...args: any) => any) => ((...args: any) => any) & {
    url: string;
    functionId: string;
    [TSS_SERVER_FUNCTION]: boolean;
};
