interface Props {
  code: string;
  className?: string;
}

const COLORS: Record<string, string> = {
  D:    'text-red-400 bg-red-500/20 border-red-500/30',
  I:    'text-amber-400 bg-amber-500/20 border-amber-500/30',
  S:    'text-green-400 bg-green-500/20 border-green-500/30',
  C:    'text-blue-400 bg-blue-500/20 border-blue-500/30',
  'D/I': 'text-red-300 bg-red-500/15 border-red-500/20',
  'D/C': 'text-red-300 bg-red-500/15 border-red-500/20',
  'I/S': 'text-amber-300 bg-amber-500/15 border-amber-500/20',
  'S/C': 'text-green-300 bg-green-500/15 border-green-500/20',
};

export function DiscBadge({ code, className = '' }: Props) {
  const colors = COLORS[code] ?? 'text-slate-muted bg-navy-700 border-navy-600';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-display font-bold text-xs ${colors} ${className}`}
    >
      {code}
    </span>
  );
}
