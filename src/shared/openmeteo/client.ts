import { UpstreamError, isRateLimit } from '../errors';
import { ENSEMBLES, OVERVIEW_MODELS, modelBatches, type ModelBatch } from '../models';
import type {
  CurrentConditions,
  EnsembleForecast,
  ForecastPoint,
  GeocodeResult,
  MultiModelForecast,
  Overview,
  OverviewEntry,
} from '../types';
import {
  asOmResponse,
  asOmResponses,
  processCurrent,
  processEnsemble,
  processMultiModel,
  processOverviewEntry,
  type ModelBatchResult,
} from './process';
import {
  PUBLIC_ENDPOINTS,
  currentUrl,
  elevationUrl,
  ensembleUrl,
  geocodeUrl,
  multiModelUrl,
  overviewUrl,
  type OpenMeteoEndpoints,
} from './requests';

/** Fetches a URL and resolves to parsed JSON; must throw `UpstreamError` on HTTP errors. */
export type JsonFetcher = (url: string, options?: { timeoutMs?: number }) => Promise<unknown>;

export interface OverviewLocation extends ForecastPoint {
  id: string;
}

const OVERVIEW_CHUNK = 30;

/**
 * Open-Meteo data access. Environment-agnostic: the server injects a fetcher with concurrency limits and
 * rate-limit cooldowns; the browser injects one built on `fetch`.
 */
export class OpenMeteoClient {
  constructor(
    private readonly fetchJson: JsonFetcher,
    private readonly endpoints: OpenMeteoEndpoints = PUBLIC_ENDPOINTS,
  ) {}

  async multiModel(point: ForecastPoint): Promise<MultiModelForecast> {
    const batches = modelBatches(point);
    const results: ModelBatchResult[] = [];
    const unavailable: { id: string; reason: string }[] = [];
    const settled = await Promise.allSettled(batches.map(b => this.fetchBatch(point, b)));
    for (const [i, outcome] of settled.entries()) {
      const batch = batches[i]!;
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
        continue;
      }
      const err: unknown = outcome.reason;
      if (isRateLimit(err)) throw err;
      const rejectedLocation = err instanceof UpstreamError && err.status >= 400 && err.status < 500;
      if (!rejectedLocation || batch.models.length === 1) {
        // Timeouts and server errors: report the models as unavailable rather than hammering the API.
        const reason = err instanceof Error ? err.message : String(err);
        unavailable.push(...batch.models.map(id => ({ id, reason })));
        continue;
      }
      // One model rejected the location (HTTP 4xx); retry the batch's models individually.
      for (const id of batch.models) {
        try {
          results.push(await this.fetchBatch(point, { models: [id], forecastDays: batch.forecastDays }));
        } catch (inner) {
          if (isRateLimit(inner)) throw inner;
          unavailable.push({ id, reason: inner instanceof Error ? inner.message : String(inner) });
        }
      }
    }
    if (results.length === 0) {
      throw new Error(
        `No forecast models available: ${unavailable.map(u => `${u.id} (${u.reason})`).join(', ')}`,
      );
    }
    return processMultiModel(point, results, unavailable);
  }

  async ensemble(point: ForecastPoint): Promise<EnsembleForecast> {
    const json = await this.fetchJson(
      ensembleUrl(
        this.endpoints,
        point,
        ENSEMBLES.map(e => e.id),
      ),
      { timeoutMs: 45_000 },
    );
    return processEnsemble(point, asOmResponse(json));
  }

  async current(point: ForecastPoint): Promise<CurrentConditions> {
    return processCurrent(point, asOmResponse(await this.fetchJson(currentUrl(this.endpoints, point))));
  }

  async overview(locations: readonly OverviewLocation[]): Promise<Overview> {
    const entries: OverviewEntry[] = [];
    for (let i = 0; i < locations.length; i += OVERVIEW_CHUNK) {
      const chunk = locations.slice(i, i + OVERVIEW_CHUNK);
      const json = await this.fetchJson(overviewUrl(this.endpoints, chunk, OVERVIEW_MODELS), {
        timeoutMs: 45_000,
      });
      asOmResponses(json).forEach((r, j) => {
        const loc = chunk[j];
        if (loc) entries.push(processOverviewEntry(loc.id, loc.elevation, r, OVERVIEW_MODELS));
      });
    }
    return { generatedAt: new Date().toISOString(), models: ['ECMWF IFS', 'GFS', 'ICON'], entries };
  }

  async geocode(query: string): Promise<GeocodeResult[]> {
    // Raw coordinates ("40.59, -111.64") let people forecast peaks the geocoder doesn't know.
    const coords = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(query);
    if (coords) {
      const lat = Number(coords[1]);
      const lon = Number(coords[2]);
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return [];
      const json = (await this.fetchJson(elevationUrl(this.endpoints, lat, lon))) as { elevation?: number[] };
      return [
        {
          name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
          label: 'Coordinates',
          lat,
          lon,
          elevation: json.elevation?.[0] ?? 0,
        },
      ];
    }
    const json = (await this.fetchJson(geocodeUrl(this.endpoints, query))) as {
      results?: {
        name: string;
        admin1?: string;
        country?: string;
        latitude: number;
        longitude: number;
        elevation?: number;
      }[];
    };
    return (json.results ?? []).map(r => ({
      name: r.name,
      label: [r.admin1, r.country].filter(Boolean).join(', '),
      lat: r.latitude,
      lon: r.longitude,
      elevation: r.elevation ?? 0,
    }));
  }

  private async fetchBatch(point: ForecastPoint, batch: ModelBatch): Promise<ModelBatchResult> {
    const json = await this.fetchJson(
      multiModelUrl(this.endpoints, point, batch.models, batch.forecastDays),
      {
        timeoutMs: 30_000,
      },
    );
    return { models: batch.models, response: asOmResponse(json) };
  }
}
