import { AnyRouter } from '@tanstack/router-core';
export interface StartStorageContext {
    router: AnyRouter;
}
export declare function runWithStartContext<T>(context: StartStorageContext, fn: () => T | Promise<T>): Promise<T>;
export declare function getStartContext<TThrow extends boolean = true>(opts?: {
    throwIfNotFound?: TThrow;
}): TThrow extends false ? StartStorageContext | undefined : StartStorageContext;
