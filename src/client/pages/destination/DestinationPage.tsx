import { useState } from 'react';
import type { ElevationBand } from '#shared/types';
import { StarIcon } from '../../components/Icons';
import { Boundary, Section } from '../../components/ui';
import { formatters } from '../../lib/format';
import { passLabel } from '../../lib/passes';
import { isSinglePoint, pointFor, type Place } from '../../lib/place';
import { setPrefs, toggleStar, usePrefs } from '../../lib/prefs';
import { Alerts, Conditions, Totals } from './Conditions';
import { ElevationPicker } from './ElevationPicker';
import { Ensemble } from './Ensemble';
import { History } from './History';
import { Hourly } from './Hourly';
import { Accumulation, ModelTable } from './Models';
import { LocalResources, Nws } from './Nws';
import { Outlook } from './Outlook';
import { Avalanche, Snowpack } from './Snowpack';
import { InView } from './InView';

export function DestinationPage({ place }: { place: Place }) {
  const prefs = usePrefs();
  const f = formatters(prefs.units);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const single = isSinglePoint(place);
  const band: ElevationBand = single ? 'summit' : prefs.band;
  const point = pointFor(place, band);
  const geo = { lat: place.lat, lon: place.lon };
  const usAgencies = place.country === undefined || place.country === 'US';
  const starred = prefs.starred.includes(place.key);
  const d = place.destination;

  return (
    <main className="page page--destination">
      <header className="title-block">
        <div>
          <p className="eyebrow">
            {d ? `${passLabel(d)} · ${place.subtitle}` : `Custom spot · ${place.subtitle}`}
          </p>
          <h1 className="title-block__name">
            {place.name}
            {d && (
              <button
                type="button"
                className={`star star--lg ${starred ? 'is-on' : ''}`}
                aria-pressed={starred}
                aria-label="Star this mountain"
                onClick={() => toggleStar(place.key)}
              >
                <StarIcon filled={starred} size={22} />
              </button>
            )}
          </h1>
          <p className="title-block__meta">
            {single ? (
              <span className="mono">{f.height(place.base)}</span>
            ) : (
              <>
                <span className="mono">
                  {f.height(place.base)} – {f.height(place.summit)}
                </span>
                <span className="dim"> · {f.height(place.summit - place.base)} vertical</span>
              </>
            )}
            {d?.url && (
              <>
                {' · '}
                <a href={d.url} target="_blank" rel="noopener noreferrer">
                  Resort site
                </a>
              </>
            )}
            {' · '}
            <a
              href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=13/${place.lat}/${place.lon}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Map
            </a>
          </p>
        </div>
        {!single && <ElevationPicker place={place} band={band} onChange={b => setPrefs({ band: b })} f={f} />}
      </header>

      {usAgencies && (
        <Boundary height={0}>
          <Alerts geo={geo} country={place.country} />
        </Boundary>
      )}

      <div className="sections" key={`${place.key}:${band}`}>
        <Section title="Now">
          <Boundary height={120}>
            <Conditions point={point} />
          </Boundary>
          <Boundary height={90}>
            <Totals point={point} />
          </Boundary>
        </Section>

        <Section title="Outlook" meta={`Median of every model at ${f.height(point.elevation)}`}>
          <Boundary height={220}>
            <Outlook point={point} />
          </Boundary>
        </Section>

        <Section title="Models" meta="Daily snowfall by model · click a row to trace it below">
          <Boundary height={360}>
            <ModelTable point={point} selected={selectedModel} onSelect={setSelectedModel} />
          </Boundary>
        </Section>

        <Section title="Accumulation">
          <Boundary height={320}>
            <Accumulation point={point} selected={selectedModel} />
          </Boundary>
        </Section>

        <Section title="Ensembles" meta="143 perturbed runs from four centres">
          {/* Ensembles are the heaviest request; only load them once the section is on screen. */}
          <InView minHeight={360}>
            <Boundary height={360} label="Loading 143 ensemble members">
              <Ensemble point={point} />
            </Boundary>
          </InView>
        </Section>

        <Section title="Hour by hour">
          <Boundary height={600}>
            <Hourly point={point} place={place} />
          </Boundary>
        </Section>

        {usAgencies && (
          <Boundary height={0}>
            <Nws geo={geo} country={place.country} />
          </Boundary>
        )}

        {usAgencies ? (
          <Section title="Snowpack & avalanche">
            <div className="split">
              <InView minHeight={220}>
                <Boundary height={220}>
                  <Snowpack geo={geo} country={place.country} />
                </Boundary>
              </InView>
              <InView minHeight={160}>
                <Boundary height={160}>
                  <Avalanche geo={geo} country={place.country} />
                </Boundary>
              </InView>
            </div>
          </Section>
        ) : (
          <Section title="Local bulletins">
            <LocalResources country={place.country} />
          </Section>
        )}

        <Section title="Last 14 days" meta="Modelled snowfall (best-match analysis)">
          <InView minHeight={160}>
            <Boundary height={160}>
              <History point={point} />
            </Boundary>
          </InView>
        </Section>
      </div>
    </main>
  );
}
