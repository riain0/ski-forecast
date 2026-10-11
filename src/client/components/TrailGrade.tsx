/**
 * Powder grade, borrowing trail-difficulty markers: the deeper the forecast, the "harder" the run.
 * Shape carries the meaning (not just colour), and every mark ships with a text label.
 */
export type Grade = 'none' | 'green' | 'blue' | 'black' | 'double';

export const GRADES: { grade: Exclude<Grade, 'none'>; minCm: number; label: string }[] = [
  { grade: 'green', minCm: 2.5, label: 'Light' },
  { grade: 'blue', minCm: 10, label: 'Moderate' },
  { grade: 'black', minCm: 20, label: 'Deep' },
  { grade: 'double', minCm: 40, label: 'Very deep' },
];

export function gradeFor(cm: number | null | undefined): Grade {
  if (cm == null) return 'none';
  return GRADES.findLast(g => cm >= g.minCm)?.grade ?? 'none';
}

export const gradeLabel = (g: Grade) => GRADES.find(x => x.grade === g)?.label ?? 'None';

export function TrailMark({ grade, size = 14 }: { grade: Grade; size?: number }) {
  if (grade === 'none') return <span className="trail-mark trail-mark--none" aria-hidden="true" />;
  const diamond = (x: number) => (
    <rect x={x} y="5" width="9.9" height="9.9" transform={`rotate(45 ${x + 4.95} 9.95)`} />
  );
  return (
    <svg
      className={`trail-mark trail-mark--${grade}`}
      width={grade === 'double' ? size * 1.7 : size}
      height={size}
      viewBox={grade === 'double' ? '0 0 34 20' : '0 0 20 20'}
      role="img"
      aria-label={`${gradeLabel(grade)} snow`}
    >
      {grade === 'green' && <circle cx="10" cy="10" r="8" />}
      {grade === 'blue' && <rect x="2.5" y="2.5" width="15" height="15" />}
      {grade === 'black' && diamond(5)}
      {grade === 'double' && (
        <>
          {diamond(2)}
          {diamond(17)}
        </>
      )}
    </svg>
  );
}
