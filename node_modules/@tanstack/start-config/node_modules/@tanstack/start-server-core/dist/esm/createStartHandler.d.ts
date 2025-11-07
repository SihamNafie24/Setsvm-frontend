import { RequestHandler } from './h3.js';
import { AnyRouter, Awaitable } from '@tanstack/router-core';
import { HandlerCallback } from '@tanstack/router-core/ssr/server';
export type CustomizeStartHandler<TRouter extends AnyRouter> = (cb: HandlerCallback<TRouter>) => RequestHandler;
export declare function createStartHandler<TRouter extends AnyRouter>({ createRouter, }: {
    createRouter: () => Awaitable<TRouter>;
}): CustomizeStartHandler<TRouter>;
