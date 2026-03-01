import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "./ui/button";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function PaginationBar({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange }: PaginationBarProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="flex items-center justify-between gap-4 px-2 py-3 border-t border-border mt-2">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{total === 0 ? 'No results' : `${start}–${end} of ${total}`}</span>
        <span className="hidden sm:inline">·</span>
        <div className="hidden sm:flex items-center gap-1.5">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded border border-border bg-background px-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(1)} disabled={page === 1}>
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <div className="flex items-center gap-0.5 mx-1">
          {getPageNumbers().map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-sm select-none">…</span>
            ) : (
              <Button
                key={p}
                variant={p === page ? 'default' : 'ghost'}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => onPageChange(p as number)}
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPageChange(totalPages)} disabled={page === totalPages}>
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Go to</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          defaultValue={page}
          key={page}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = Number((e.target as HTMLInputElement).value);
              if (val >= 1 && val <= totalPages) onPageChange(val);
            }
          }}
          className="h-7 w-12 rounded border border-border bg-background px-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}