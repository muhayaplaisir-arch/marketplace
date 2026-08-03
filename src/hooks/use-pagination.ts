import { useEffect, useMemo, useState } from "react";

/**
 * Paginates an array client-side.
 * - `slice` contains only the items of the current page (undefined while loading).
 * - `resetKey`: when it changes (e.g. a filter), the page resets to 1.
 * - The page is automatically clamped if the data shrinks.
 */
export function usePagination<T>(items: T[] | undefined, pageSize = 10, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    if (!items) return undefined;
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return { page, setPage, totalPages, slice, from, to, total };
}
