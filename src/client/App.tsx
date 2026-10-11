import { lazy, Suspense, useEffect } from 'react';
import { Masthead } from './components/Masthead';
import { loadPage } from './lib/pages';
import { placeFromRoute } from './lib/place';
import { usePrefs } from './lib/prefs';
import { Link, parseRoute, useLocation } from './lib/router';
import { BoardPage } from './pages/Board';
import { Placeholder } from './components/ui';

// Only the board ships in the main bundle; the other pages load when visited.
const DestinationPage = lazy(() => loadPage.destination().then(m => ({ default: m.DestinationPage })));
const MapPage = lazy(() => loadPage.map().then(m => ({ default: m.MapPage })));
const MethodPage = lazy(() => loadPage.method().then(m => ({ default: m.MethodPage })));

export function App() {
  const { location, pending } = useLocation();
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
      {pending && <div className="route-progress" aria-hidden="true" />}
      <Masthead route={route} />
      <div id="main">
        {route.name === 'board' && <BoardPage />}
        <Suspense fallback={<Placeholder height={480} />}>
          {route.name === 'map' && <MapPage />}
          {route.name === 'method' && <MethodPage />}
          {place && <DestinationPage key={place.key} place={place} />}
        </Suspense>
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
