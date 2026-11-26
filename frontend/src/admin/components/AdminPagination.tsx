import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import type {
  Pagination,
} from "../types/adminUsers.types";

interface AdminPaginationProps {
  pagination: Pagination;
  totalItems: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({
  pagination,
  totalItems,
  loading = false,
  onPageChange,
}: AdminPaginationProps) {

  const {
    page,
    limit,
    totalPages,
    hasNextPage,
    hasPreviousPage,
  } = pagination;

  const start =
    totalItems === 0
      ? 0
      : Math.min(
          (page - 1) * limit + 1,
          totalItems
        );

  const end = Math.min(
    page * limit,
    totalItems
  );

  const buttonClass =
    "flex items-center gap-2 rounded-lg " +
    "border border-slate-700 px-3 py-2 " +
    "text-sm text-slate-300 hover:bg-slate-800 " +
    "disabled:cursor-not-allowed disabled:opacity-40";

  return (

    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 p-4">

      <p className="text-xs text-slate-400">

        Showing {start}–{end} of {totalItems} records

      </p>

      <div className="flex items-center gap-3">

        <button
          type="button"
          disabled={loading || !hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          className={buttonClass}
        >

          <ChevronLeft size={16} />

          Previous

        </button>

        <span className="text-xs text-slate-400">

          {page} / {Math.max(1, totalPages)}

        </span>

        <button
          type="button"
          disabled={loading || !hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className={buttonClass}
        >

          Next

          <ChevronRight size={16} />

        </button>

      </div>

    </div>
  );
}