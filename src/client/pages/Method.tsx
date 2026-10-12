import { ENSEMBLES, MODELS } from '#shared/models';
import { FIXED_RATIO, snowRatio } from '#shared/snow';
import { TimeChart } from '../components/charts/TimeChart';
import { Section } from '../components/ui';
import { formatters } from '../lib/format';
import { usePrefs } from '../lib/prefs';

const TEMPS = Array.from({ length: 29 }, (_, i) => 3 - i); // 3 °C → −25 °C

export function MethodPage() {
  const f = formatters(usePrefs().units);
  return (
    <main className="page page--prose">
      <h1 className="headline">How the numbers are made</h1>
      <p className="lede">
        Upslope compares every major weather model for each mountain, at the elevation you choose, and shows
        where they agree and where they don’t. No single model is right every storm, so the spread is part of
        the forecast.
      </p>

      <div className="sections">
        <Section
          title="Deterministic models"
          meta={`${MODELS.length} models · regional ones only where they have coverage`}
        >
          <table className="plain">
            <thead>
              <tr>
                <th>Model</th>
                <th>Agency</th>
                <th>Grid</th>
                <th className="num">Range</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map(m => (
                <tr key={m.id}>
                  <th scope="row">
                    {m.name}
                    <span className="dim">{m.note}</span>
                  </th>
                  <td>{m.agency}</td>
                  <td className="mono">{m.resolution}</td>
                  <td className="num mono">{m.horizonDays} d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Ensembles" meta={`${ENSEMBLES.reduce((a, e) => a + e.members, 0)} members`}>
          <p>
            An ensemble re-runs a model dozens of times from slightly different starting conditions. If the
            runs agree, confidence is high; if they fan out, it isn’t. The odds tables count how many runs
            reach each amount, weighting the four centres equally.
          </p>
          <ul className="inline-list">
            {ENSEMBLES.map(e => (
              <li key={e.id}>
                <b>{e.name}</b>{' '}
                <span className="dim">
                  {e.agency} · {e.members} members
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Snow at your elevation">
          <p>
            Models forecast precipitation for a grid cell whose average height is often far below a summit,
            which is why mountain snow is so often under-forecast. Upslope takes each model’s precipitation
            and the temperature downscaled to the elevation you pick, then:
          </p>
          <ol>
            <li>
              <b>Splits rain from snow at that height:</b> all snow below −0.5 °C, all rain above +2.5 °C, a
              mix in between.
            </li>
            <li>
              <b>Converts water to snow depth.</b> <i>Auto</i> uses a temperature-dependent snow-to-liquid
              ratio, from about 8:1 for wet snow near freezing to about 17:1 in cold storms. <i>10:1</i> uses
              the fixed reference ratio.
            </li>
          </ol>
          <h3 className="chart-title">Auto snow-to-liquid ratio by temperature</h3>
          <TimeChart
            height={180}
            ariaLabel="Snow-to-liquid ratio by surface temperature"
            layers={[
              { kind: 'line', label: 'Auto ratio', values: TEMPS.map(t => snowRatio(t)), tone: 'ink' },
              {
                kind: 'line',
                label: 'Fixed',
                values: TEMPS.map(() => FIXED_RATIO),
                tone: 'ink-3',
                dashed: true,
                width: 1.5,
              },
            ]}
            format={v => `${Math.round(v)}:1`}
            xTick={i => (i % 4 === 0 ? f.temp(TEMPS[i]) : null)}
            xTitle={i => `At ${f.temp(TEMPS[i])}`}
          />
          <p className="footnote">
            Real ratios also depend on temperatures aloft, wind and riming. Treat any single number with
            suspicion; that’s why the model spread and ensembles are on every page.
          </p>
        </Section>

        <Section title="Data sources">
          <ul className="sources">
            <li>
              <b>Open-Meteo</b> repackages open model output from NOAA, ECMWF, DWD, ECCC, the UK Met Office,
              Météo-France, JMA, CMA, MeteoSwiss and ItaliaMeteo (CC BY 4.0).
            </li>
            <li>
              <b>NOAA National Weather Service</b>: the forecasters’ own forecast, gridded snowfall and snow
              level, alerts, and Area Forecast Discussions (US).
            </li>
            <li>
              <b>USDA NRCS SNOTEL</b>: measured snow depth and water content from automated mountain stations
              (US).
            </li>
            <li>
              <b>avalanche.org</b>: danger ratings from US avalanche centers.
            </li>
          </ul>
          <p className="footnote">
            Independent project, not affiliated with any ski pass or resort operator. Check resort reports and
            your avalanche center before heading out.
          </p>
        </Section>
      </div>
    </main>
  );
}
