/** Code-split pages. Calling a loader twice returns the same module, so prefetching is free to repeat. */
export const loadPage = {
  destination: () => import('../pages/destination/DestinationPage'),
  map: () => import('../pages/MapPage'),
  method: () => import('../pages/Method'),
};
