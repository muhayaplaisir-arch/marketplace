import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
  className?: string;
}

/** Page numbers with ellipses, e.g. [1, …, 4, 5, 6, …, 20]. */
function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = Array.from(wanted)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function DataPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
  className,
}: DataPaginationProps) {
  if (total === 0) return null;
  const list = pageList(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-4 py-2.5",
        className,
      )}
    >
      <p className="font-mono text-[10px] text-muted-foreground">
        {totalPages <= 1
          ? `${total} élément${total > 1 ? "s" : ""}`
          : `${from}–${to} sur ${total}`}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {list.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 font-mono text-[10px] text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="icon-sm"
              className="font-mono text-[11px]"
              onClick={() => onChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Page suivante"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Small numbered badge shown at the start of each paginated row. */
export function RowNumber({
  index,
  page,
  pageSize = 10,
}: {
  index: number;
  page: number;
  pageSize?: number;
}) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-muted/40 font-mono text-[10px] font-bold text-muted-foreground">
      {(page - 1) * pageSize + index + 1}
    </span>
  );
}
