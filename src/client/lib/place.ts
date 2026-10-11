import { findDestination, elevationFor } from '#shared/destinations';
import type { Destination, ElevationBand, ForecastPoint } from '#shared/types';
import type { Route } from './routes';

/** Anything the forecast page can show: a pass destination or a searched-for spot. */
export interface Place {
  key: string;
  name: string;
  subtitle: string;
  lat: number;
  lon: number;
  base: number;
  summit: number;
  country?: string;
  destination?: Destination;
}

export function placeFromRoute(route: Route): Place | null {
  if (route.name === 'destination') {
    const d = findDestination(route.id);
    if (!d) return null;
    return {
      key: d.id,
      name: d.name,
      subtitle: [d.group, d.admin ? `${d.region} · ${d.admin}` : d.region].filter(Boolean).join(' — '),
      lat: d.lat,
      lon: d.lon,
      base: d.base,
      summit: d.summit,
      country: d.country,
      destination: d,
    };
  }
  if (route.name === 'spot') {
    return {
      key: `spot:${route.lat.toFixed(4)},${route.lon.toFixed(4)},${route.elevation}`,
      name: route.label,
      subtitle: `${route.lat.toFixed(3)}, ${route.lon.toFixed(3)}`,
      lat: route.lat,
      lon: route.lon,
      base: route.elevation,
      summit: route.elevation,
    };
  }
  return null;
}

export const isSinglePoint = (p: Place) => p.base === p.summit;

export function pointFor(place: Place, band: ElevationBand): ForecastPoint {
  return {
    lat: place.lat,
    lon: place.lon,
    elevation: isSinglePoint(place) ? place.base : elevationFor(place, band),
  };
}
