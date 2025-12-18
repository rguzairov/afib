"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AriaAttributes } from "react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/components/ui/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { consumeTableCacheInvalidation } from "@/lib/table-cache";

export type TableRowData = Record<string, string | number | undefined>;

export type TableColumn = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
};

type SortState = {
  column: string;
  order: "asc" | "desc";
};

export type TablePageData = {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
  columns: TableColumn[];
  rowsPerPage?: number;
  defaultSort?: SortState;
};

type TablePageProps = {
  pageData: TablePageData;
  rows: TableRowData[];
};

function formatValue(key: string, value: string | number | undefined) {
  if (value === undefined || value === null) return "—";
  if (key === "diff" && typeof value === "number" && value > 0) return `+${value}`;
  return value;
}

function cellClass(col: TableColumn, value: string | number | undefined) {
  if (col.className) return col.className;
  if (col.key === "yes") return "text-emerald-600 font-semibold";
  if (col.key === "no") return "text-rose-600 font-semibold";
  if (col.key === "diff") {
    if (typeof value === "number") {
      if (value > 0) return "text-emerald-600 font-semibold";
      if (value < 0) return "text-rose-600 font-semibold";
    }
    return "text-slate-800 font-semibold";
  }
  return "text-slate-800";
}

function rowDescription(row: TableRowData) {
  const description = row.description;
  if (typeof description !== "string") return "";
  return description.trim();
}

function toDomId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export default function TablePage({ pageData, rows }: TablePageProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  // If we navigated back from a survey submission, force-refresh this table route so
  // Next's client router cache doesn't show stale data.
  useEffect(() => {
    if (!pathname) return;
    if (consumeTableCacheInvalidation(pathname)) router.refresh();
  }, [pathname, router]);

  const defaultSort: SortState = pageData.defaultSort ?? {
    column: pageData.columns.find((col) => col.sortable)?.key ?? pageData.columns[0].key,
    order: "asc",
  };

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null);
  const rowsPerPage = pageData.rowsPerPage ?? 5;

  const preparedRows = useMemo(() => {
    const hasDiffColumn = pageData.columns.some((col) => col.key === "diff");

    if (!hasDiffColumn) return rows;

    return rows.map((row) => {
      if (row.diff !== undefined) return row;

      const yes = Number(row.yes);
      const no = Number(row.no);

      if (Number.isFinite(yes) && Number.isFinite(no)) {
        return { ...row, diff: yes - no };
      }

      return row;
    });
  }, [pageData.columns, rows]);

  const sortedData = useMemo(() => {
    const sorted = [...preparedRows];

    const { column, order } = sort;

    sorted.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aText = String(aVal ?? "").toLowerCase();
      const bText = String(bVal ?? "").toLowerCase();

      if (aText < bText) return order === "asc" ? -1 : 1;
      if (aText > bText) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [preparedRows, sort]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [page, rowsPerPage, sortedData]);

  const pages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));

  const ariaSort = (colKey: string, sortable?: boolean): AriaAttributes["aria-sort"] => {
    if (!sortable) return undefined;
    if (sort.column !== colKey) return "none";
    return sort.order === "asc" ? "ascending" : "descending";
  };

  const handleSort = (colKey: string) => {
    const column = pageData.columns.find((col) => col.key === colKey);
    if (!column?.sortable) return;

    setSort((prev) => ({
      column: colKey,
      order: prev.column === colKey && prev.order === "asc" ? "desc" : "asc",
    }));
    setPage(1);
    setExpandedRowKey(null);
  };

  const sortIcon = (colKey: string, sortable?: boolean) => {
    if (!sortable) return null;

    const isActive = sort.column === colKey;
    const base = "ml-1 text-[11px] transition-colors";
    if (!isActive) return <span className={`${base} text-slate-300`}>↕</span>;
    return <span className={`${base} text-slate-500`}>{sort.order === "asc" ? "▲" : "▼"}</span>;
  };

  const rowKey = (row: TableRowData, index: number) => {
    const primary = row.id ?? row[pageData.columns[0].key];
    if (primary !== undefined) return String(primary);
    return String(index);
  };

  const primaryColumn = pageData.columns[0];
  const secondaryColumns = pageData.columns.slice(1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">{pageData.title}</h1>
          <p className="text-sm text-slate-500">{pageData.description}</p>
        </div>
        <Link
          href={pageData.ctaHref}
          className="mt-1 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-emerald-800 hover:shadow-md"
        >
          <span className="text-base leading-none">＋</span>
          <span>{pageData.ctaLabel}</span>
        </Link>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-md">
	        <div className="hidden overflow-x-auto md:block">
	          <table className="min-w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {pageData.columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort(col.key, col.sortable)}
                    className={`px-4 py-3 font-semibold ${col.sortable ? "select-none" : ""}`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                      >
                        <span className="font-semibold">{col.label}</span>
                        {sortIcon(col.key, col.sortable)}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold">{col.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
	            <tbody>
	              {paginatedData.map((row, rowIndex) => {
	                const key = rowKey(row, rowIndex);
	                const description = rowDescription(row);
	                const descriptionId = `row-description-${toDomId(key)}`;
	                const isExpanded = expandedRowKey === key;

	                return (
	                  <tr key={key} className="border-t border-slate-100 hover:bg-slate-50/40">
	                    {pageData.columns.map((col) => {
	                      const cellValue = row[col.key] as string | number | undefined;
	                      const isPrimary = col.key === primaryColumn.key;

	                      return (
	                        <td key={col.key} className={cn("px-4 py-3.5 text-sm", cellClass(col, cellValue))}>
	                          {isPrimary ? (
	                            <div className="min-w-0">
	                              <div className="flex min-w-0 items-start gap-2">
	                                <span className="min-w-0 break-words">
	                                  {formatValue(col.key, cellValue)}
	                                </span>
	                                {description.length > 0 && (
	                                  <button
	                                    type="button"
	                                    title={description}
	                                    aria-label={isExpanded ? "Hide description" : "Show description"}
	                                    aria-expanded={isExpanded}
	                                    aria-controls={descriptionId}
	                                    onClick={() =>
	                                      setExpandedRowKey((prev) => (prev === key ? null : key))
	                                    }
	                                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
	                                  >
	                                    i
	                                  </button>
	                                )}
	                              </div>
	                              {description.length > 0 && isExpanded && (
	                                <p
	                                  id={descriptionId}
	                                  className="mt-1 max-w-[60ch] whitespace-pre-wrap text-xs text-slate-500"
	                                >
	                                  {description}
	                                </p>
	                              )}
	                            </div>
	                          ) : (
	                            formatValue(col.key, cellValue)
	                          )}
	                        </td>
	                      );
	                    })}
	                  </tr>
	                );
	              })}
	              {paginatedData.length === 0 && (
	                <tr className="border-t border-slate-100">
                  <td className="px-4 py-4" colSpan={pageData.columns.length}>
                    <EmptyState
                      title="No data yet"
                      description="Contribute to see community responses appear here."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

	        <div className="grid gap-3 px-4 py-4 md:hidden">
          <div className="flex flex-wrap gap-2">
            {pageData.columns
              .filter((col) => col.sortable)
              .map((col) => {
                const active = sort.column === col.key;
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span>{col.label}</span>
                    <span className="text-[10px]">{active ? (sort.order === "asc" ? "↑" : "↓") : "↕"}</span>
                  </button>
                );
              })}
          </div>

	          <div className="grid gap-3">
	            {paginatedData.map((row, rowIndex) => {
	              const key = rowKey(row, rowIndex);
	              const description = rowDescription(row);
	              const descriptionId = `row-description-mobile-${toDomId(key)}`;
	              const isExpanded = expandedRowKey === key;

	              return (
	                <div
	                  key={key}
	                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_20px_-12px_rgba(15,23,42,0.35)]"
	                >
	                  <div className="flex items-start justify-between gap-3">
	                    <div className="min-w-0">
	                      <div className="flex min-w-0 items-start gap-2 text-base font-semibold text-slate-900">
	                        <span className="min-w-0 break-words">
	                          {formatValue(
	                            primaryColumn.key,
	                            row[primaryColumn.key] as string | number | undefined
	                          )}
	                        </span>
	                        {description.length > 0 && (
	                          <button
	                            type="button"
	                            title={description}
	                            aria-label={isExpanded ? "Hide description" : "Show description"}
	                            aria-expanded={isExpanded}
	                            aria-controls={descriptionId}
	                            onClick={() => setExpandedRowKey((prev) => (prev === key ? null : key))}
	                            className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
	                          >
	                            i
	                          </button>
	                        )}
	                      </div>
	                      {description.length > 0 && isExpanded && (
	                        <p
	                          id={descriptionId}
	                          className="mt-1 max-w-[60ch] whitespace-pre-wrap text-xs font-normal text-slate-500"
	                        >
	                          {description}
	                        </p>
	                      )}
	                    </div>
	                    {pageData.columns.some((col) => col.sortable) && (
	                      <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
	                        #{rowIndex + 1 + (page - 1) * rowsPerPage}
	                      </span>
	                    )}
	                  </div>

	                  <div className="mt-3 grid grid-cols-1 gap-2">
	                    {secondaryColumns.map((col) => (
	                      <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
	                        <span className="text-slate-500">{col.label}</span>
	                        <span className={cn("text-sm", cellClass(col, row[col.key]))}>
	                          {formatValue(col.key, row[col.key] as string | number | undefined)}
	                        </span>
	                      </div>
	                    ))}
	                  </div>
	                </div>
	              );
	            })}
	            {paginatedData.length === 0 && (
	              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4">
                <EmptyState title="No data yet" description="Contribute to see community responses appear here." />
              </div>
            )}
          </div>
        </div>

	        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
	          <div className="flex items-center justify-between">
	            <button
	              type="button"
	              disabled={page === 1}
	              onClick={() => {
	                setExpandedRowKey(null);
	                setPage((p) => Math.max(1, p - 1));
	              }}
	              className="text-sm text-slate-600 disabled:opacity-50"
	            >
	              ← Prev
	            </button>
            <span className="px-4 text-sm text-slate-700" aria-live="polite">
              Page {page} of {pages}
            </span>
	            <button
	              type="button"
	              disabled={page === pages}
	              onClick={() => {
	                setExpandedRowKey(null);
	                setPage((p) => Math.min(pages, p + 1));
	              }}
	              className="text-sm text-slate-600 disabled:opacity-50"
	            >
	              Next →
	            </button>
	          </div>
	        </div>
      </div>
    </div>
  );
}
