/** Start of the current UTC hour, in unix seconds. */
export const currentHour = (now = Date.now()): number => Math.floor(now / 3_600_000) * 3600;

/** Resort-local calendar date (YYYY-MM-DD) for a unix time and the resort's UTC offset (s). */
export const localDate = (unix: number, utcOffset: number): string =>
  new Date((unix + utcOffset) * 1000).toISOString().slice(0, 10);

/** Resort-local hour of day (0-23). */
export const localHour = (unix: number, utcOffset: number): number =>
  new Date((unix + utcOffset) * 1000).getUTCHours();
