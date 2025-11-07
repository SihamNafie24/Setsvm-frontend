import { RouteLike } from './route.cjs';
export type ProcessRouteTreeResult<TRouteLike extends RouteLike> = {
    routesById: Record<string, TRouteLike>;
    routesByPath: Record<string, TRouteLike>;
    flatRoutes: Array<TRouteLike>;
};
export declare function processRouteTree<TRouteLike extends RouteLike>({ routeTree, initRoute, }: {
    routeTree: TRouteLike;
    initRoute?: (route: TRouteLike, index: number) => void;
}): ProcessRouteTreeResult<TRouteLike>;
