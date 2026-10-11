import { lazy, Suspense, useEffect } from 'react';
import { Masthead } from './components/Masthead';
import { placeFromRoute } from './lib/place';
import { usePrefs } from './lib/prefs';
import { Link, parseRoute, useLocation } from './lib/router';
import { BoardPage } from './pages/Board';
import { DestinationPage } from './pages/destination/DestinationPage';
import { Placeholder } from './components/ui';

// Leaflet and the method page's prose only load when visited.
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const MethodPage = lazy(() => import('./pages/Method').then(m => ({ default: m.MethodPage })));

export function App() {
  const location = useLocation();
  const route = parseRoute(
    location.split('?')[0] ?? '/',
    location.includes('?') ? location.slice(location.indexOf('?')) : '',
  );
  const { theme } = usePrefs();

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const place = placeFromRoute(route);
  useEffect(() => {
    document.title = place ? `${place.name} snow forecast · Upslope` : 'Upslope · Mountain snow forecasts';
  }, [place]);

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <Masthead route={route} />
      <div id="main">
        {route.name === 'board' && <BoardPage />}
        <Suspense fallback={<Placeholder height={480} />}>
          {route.name === 'map' && <MapPage />}
          {route.name === 'method' && <MethodPage />}
        </Suspense>
        {place && <DestinationPage key={place.key} place={place} />}
        {(route.name === 'not-found' ||
          ((route.name === 'destination' || route.name === 'spot') && !place)) && (
          <main className="page">
            <h1 className="headline">Off piste</h1>
            <p>
              That page doesn’t exist. <Link href="/">Back to the board</Link>
            </p>
          </main>
        )}
      </div>
      <footer className="colophon">
        <p>
          Forecasts: Open-Meteo (NOAA, ECMWF, DWD, ECCC, UKMO, Météo-France, JMA, CMA, MeteoSwiss,
          ItaliaMeteo) · NOAA NWS · USDA NRCS SNOTEL · avalanche.org · Map tiles © Esri
        </p>
        <p>
          Not affiliated with Ikon Pass or Alterra Mountain Company. Check official resort reports before you
          go.
        </p>
      </footer>
    </>
  );
}
