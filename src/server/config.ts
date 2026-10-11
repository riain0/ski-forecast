import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** Paid Open-Meteo key. When set, the server uses the customer endpoints (no shared-IP limits). */
  OPEN_METEO_API_KEY: z.string().min(1).optional(),
  /** Sent in the User-Agent; api.weather.gov asks clients to identify themselves. */
  CONTACT_EMAIL: z.email().optional(),
  /** Directory holding the built client. */
  CLIENT_DIR: z.string().default('dist/client'),
});

export type Config = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
