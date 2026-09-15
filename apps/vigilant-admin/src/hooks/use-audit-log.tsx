// src/hooks/use-audit-log.ts
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/axios";
import { AuditLogEntry, AuditLogFilters, AuditLogResponse } from "./types";

const PAGE_SIZE = 25;

const auditApi = {
  getAuditLog: async (
    page: number,
    filters: AuditLogFilters,
  ): Promise<AuditLogResponse> => {
    const { data } = await apiClient.get<AuditLogResponse>("/audit-log", {
      params: { page, page_size: PAGE_SIZE, ...filters },
    });
    return data;
  },
};

export function useAuditLog(filters: AuditLogFilters, enabled = true) {
  const [page, setPage] = useState(1);
  const [allEntries, setAllEntries] = useState<AuditLogEntry[]>([]);

  // reset pagination whenever filters change
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    setPage(1);
    setAllEntries([]);
  }, [filterKey]);

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error: errorRaw,
    refetch,
  } = useQuery({
    queryKey: ["admin", "audit-log", page, filterKey],
    queryFn: () => auditApi.getAuditLog(page, filters),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (!response) return;
    setAllEntries((prev) => (page === 1 ? response.data : [...prev, ...response.data]));
  }, [response, page]);

  const loadMore = () => setPage((p) => p + 1);

  const error = isError
    ? ((errorRaw as any)?.response?.data?.error ??
      (errorRaw as any)?.message ??
      "Failed to load audit log")
    : null;

  const statusCode = isError ? ((errorRaw as any)?.response?.status ?? null) : null;

  return {
    entries: allEntries,
    isLoading: isLoading && page === 1,
    isFetchingMore: isFetching && page > 1,
    isError,
    error,
    statusCode,
    hasMore: response ? response.pagination.page < response.pagination.total_pages : false,
    total: response?.pagination.total ?? 0,
    loadMore,
    refetch: () => {
      setPage(1);
      setAllEntries([]);
      refetch();
    },
  };
}