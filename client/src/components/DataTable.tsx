import { useState } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  sortValue?: (row: T) => string | number;
}

interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export function DataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}) {
  const [sort, setSort] = useState<SortState | null>(null);

  const handleHeaderClick = (col: Column<T>) => {
    if (!col.sortable) return;
    setSort(prev => {
      if (prev?.key === col.key) {
        return { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key: col.key, dir: 'asc' };
    });
  };

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const col = columns.find(c => c.key === sort.key);
        const aVal = col?.sortValue ? col.sortValue(a) : (a as Record<string, unknown>)[sort.key] as string | number;
        const bVal = col?.sortValue ? col.sortValue(b) : (b as Record<string, unknown>)[sort.key] as string | number;
        let cmp: number;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal ?? '').localeCompare(String(bVal ?? ''));
        }
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : rows;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy-700 text-left">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={
                    'font-body text-[10px] uppercase tracking-widest text-slate-muted py-3 px-3 font-medium select-none ' +
                    (col.sortable ? 'cursor-pointer hover:text-slate-text ' : '') +
                    (col.className ?? '')
                  }
                  onClick={() => handleHeaderClick(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sort?.key === col.key && (
                      <svg
                        className="w-3 h-3 text-gold-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        {sort.dir === 'asc' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        )}
                      </svg>
                    )}
                    {col.sortable && sort?.key !== col.key && (
                      <svg
                        className="w-3 h-3 text-navy-600 opacity-60"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 text-center font-body text-sm text-slate-muted"
                >
                  {empty ?? 'No rows'}
                </td>
              </tr>
            ) : (
              sorted.map(row => (
                <tr
                  key={row.id}
                  className={
                    'border-b border-navy-700/60 last:border-0 transition-colors ' +
                    (onRowClick ? 'cursor-pointer hover:bg-navy-800/60' : '')
                  }
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={'py-2.5 px-3 ' + (col.className ?? '')}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
