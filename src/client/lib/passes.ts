import { isIndependent, passName } from '#shared/destinations';
import type { Destination, Pass } from '#shared/types';

export type PassFilter = 'all' | Pass | 'independent';

export const PASS_FILTERS: readonly { value: PassFilter; label: string; title?: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'ikon', label: 'Ikon' },
  { value: 'epic', label: 'Epic' },
  { value: 'mountain-collective', label: 'MC', title: 'Mountain Collective' },
  { value: 'indy', label: 'Indy' },
  { value: 'independent', label: 'Indie', title: 'Independent: on neither Ikon nor Epic' },
];

export const matchesPass = (d: Pick<Destination, 'passes'>, filter: PassFilter): boolean =>
  filter === 'all' ? true : filter === 'independent' ? isIndependent(d) : d.passes.includes(filter);

/** "Ikon · Mountain Collective", or "Independent" when the mountain is on no tracked pass. */
export const passLabel = (d: Pick<Destination, 'passes'>): string =>
  d.passes.length ? d.passes.map(passName).join(' · ') : 'Independent';

/** Compact form for dense rows: "Ikon · MC". */
export const passShort = (d: Pick<Destination, 'passes'>): string =>
  d.passes.length
    ? d.passes.map(p => PASS_FILTERS.find(f => f.value === p)?.label ?? p).join(' · ')
    : 'Indie';

/** Noun for headlines: "the Epic Pass", "every pass". */
export function passScope(filter: PassFilter): string {
  if (filter === 'all') return 'every pass';
  if (filter === 'independent') return 'the independents';
  return `the ${passName(filter)}${filter === 'mountain-collective' ? '' : ' Pass'}`;
}
