import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// Create the router using the route tree
export const router = createRouter({ 
  routeTree,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

// Register the router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
