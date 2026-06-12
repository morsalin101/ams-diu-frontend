import { Button } from "./ui/button";

export type PaginationMeta = {
  count: number;
  current_page: number;
  total_pages: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export const DEFAULT_PAGINATION: PaginationMeta = {
  count: 0,
  current_page: 1,
  total_pages: 1,
  page_size: 25,
  has_next: false,
  has_previous: false,
};

type PaginationControlsProps = {
  pagination?: Partial<PaginationMeta> | null;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  itemLabel?: string;
};

export function normalizePagination(
  pagination?: Partial<PaginationMeta> | null,
): PaginationMeta {
  return {
    ...DEFAULT_PAGINATION,
    ...pagination,
    count: Number(pagination?.count ?? DEFAULT_PAGINATION.count),
    current_page: Number(pagination?.current_page ?? DEFAULT_PAGINATION.current_page),
    total_pages: Math.max(1, Number(pagination?.total_pages ?? DEFAULT_PAGINATION.total_pages)),
    page_size: Number(pagination?.page_size ?? DEFAULT_PAGINATION.page_size),
    has_next: Boolean(pagination?.has_next),
    has_previous: Boolean(pagination?.has_previous),
  };
}

export function paginationFromDrf(
  response: any,
  currentPage: number,
  pageSize = 25,
): PaginationMeta {
  if (response?.pagination) {
    return normalizePagination(response.pagination);
  }

  const count = Number(response?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  return {
    count,
    current_page: currentPage,
    total_pages: totalPages,
    page_size: pageSize,
    has_next: Boolean(response?.next) || currentPage < totalPages,
    has_previous: Boolean(response?.previous) || currentPage > 1,
  };
}

export default function PaginationControls({
  pagination,
  onPageChange,
  isLoading = false,
  itemLabel = "records",
}: PaginationControlsProps) {
  const meta = normalizePagination(pagination);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-600">
        Showing page {meta.current_page} of {meta.total_pages} ({meta.count} {itemLabel})
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || !meta.has_previous}
          onClick={() => onPageChange(Math.max(1, meta.current_page - 1))}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || !meta.has_next}
          onClick={() => onPageChange(Math.min(meta.total_pages, meta.current_page + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
