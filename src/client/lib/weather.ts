export type Sky =
  'clear' | 'partly' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'freezing' | 'snow' | 'heavy-snow' | 'storm';

/** WMO weather interpretation codes → glyph + label. */
const CODES: Record<number, [Sky, string]> = {
  0: ['clear', 'Clear'],
  1: ['clear', 'Mostly clear'],
  2: ['partly', 'Partly cloudy'],
  3: ['cloudy', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Rime fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Drizzle'],
  55: ['drizzle', 'Heavy drizzle'],
  56: ['freezing', 'Freezing drizzle'],
  57: ['freezing', 'Freezing drizzle'],
  61: ['rain', 'Light rain'],
  63: ['rain', 'Rain'],
  65: ['rain', 'Heavy rain'],
  66: ['freezing', 'Freezing rain'],
  67: ['freezing', 'Freezing rain'],
  71: ['snow', 'Light snow'],
  73: ['snow', 'Snow'],
  75: ['heavy-snow', 'Heavy snow'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Rain showers'],
  81: ['rain', 'Rain showers'],
  82: ['storm', 'Violent showers'],
  85: ['snow', 'Snow showers'],
  86: ['heavy-snow', 'Heavy snow showers'],
  95: ['storm', 'Thunderstorm'],
  96: ['storm', 'Thunderstorm, hail'],
  99: ['storm', 'Thunderstorm, hail'],
};

export function describeWeather(code: number | null | undefined): { sky: Sky; label: string } {
  const [sky, label] = (code != null ? CODES[code] : undefined) ?? ['cloudy', '—'];
  return { sky, label };
}
