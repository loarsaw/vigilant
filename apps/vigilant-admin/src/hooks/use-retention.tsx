// src/hooks/use-retention.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  DataRetentionRun,
  RetentionPoliciesResponse,
  RetentionRunsResponse,
  SaveRetentionPolicyPayload,
} from "./types";
import { useEffect, useState } from "react";

const retentionApi = {
  getPolicies: async (): Promise<RetentionPoliciesResponse> => {
    const { data } = await apiClient.get<RetentionPoliciesResponse>("/retention-policies");
    return data;
  },

  savePolicy: async (
    entityType: string,
    payload: SaveRetentionPolicyPayload,
  ): Promise<{ message: string }> => {
    const { data } = await apiClient.put<{ message: string }>(
      `/retention-policies/${entityType}`,
      payload,
    );
    return data;
  },

  getRuns: async (
    entityType: string,
    params: { limit: number; offset: number; status?: string },
  ): Promise<RetentionRunsResponse> => {
    const { data } = await apiClient.get<RetentionRunsResponse>(
      `/retention-policies/${entityType}/runs`,
      { params },
    );
    return data;
  },
};

export function useRetention() {
  const queryClient = useQueryClient();

  const {
    data: retentionPoliciesResponse,
    isLoading: isLoadingRetention,
    isError: isRetentionError,
  } = useQuery({
    queryKey: ["admin", "retention-policies"],
    queryFn: retentionApi.getPolicies,
    retry: false,
  });

  const retentionPolicies = retentionPoliciesResponse?.data ?? [];

  const jobApplicationsPolicy = retentionPolicies.find((p) => p.entity_type === "job_applications");

  const isRetentionConfigured = !!jobApplicationsPolicy && !isRetentionError;

  const {
    mutate: saveRetentionPolicyRaw,
    isPending: isSavingRetention,
    error: saveRetentionErrorRaw,
    isSuccess: saveRetentionSuccess,
    reset: resetSaveRetention,
  } = useMutation({
    mutationFn: ({
      entityType,
      payload,
    }: {
      entityType: string;
      payload: SaveRetentionPolicyPayload;
    }) => retentionApi.savePolicy(entityType, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "retention-policies"] });
    },
  });

  const saveRetentionPolicy = (entityType: string, payload: SaveRetentionPolicyPayload) =>
    saveRetentionPolicyRaw({ entityType, payload });

  const saveRetentionError = saveRetentionErrorRaw
    ? ((saveRetentionErrorRaw as any)?.response?.data?.error ?? "Failed to save retention policy")
    : null;

  return {
    retentionPolicies,
    jobApplicationsPolicy,
    isLoadingRetention,
    isRetentionConfigured,
    saveRetentionPolicy,
    isSavingRetention,
    saveRetentionError,
    saveRetentionSuccess,
    resetSaveRetention,
  };
}

// src/hooks/use-retention.ts — replace useRetentionRuns only

const RUNS_PAGE_SIZE = 20;

export function useRetentionRuns(entityType: string, enabled = true) {
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [allRuns, setAllRuns] = useState<DataRetentionRun[]>([]);

  const {
    data: runsResponse,
    isLoading: isLoadingRuns,
    isFetching: isFetchingRuns,
    isError: isRunsError,
    error: runsErrorRaw,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ["admin", "retention-runs", entityType, offset, statusFilter],
    queryFn: () =>
      retentionApi.getRuns(entityType, { limit: RUNS_PAGE_SIZE, offset, status: statusFilter }),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (!runsResponse) return;
    setAllRuns((prev) => (offset === 0 ? runsResponse.data : [...prev, ...runsResponse.data]));
  }, [runsResponse, offset]);

  const loadMore = () => setOffset((prev) => prev + RUNS_PAGE_SIZE);

  const setFilter = (status: string) => {
    setStatusFilter(status);
    setOffset(0);
    setAllRuns([]);
  };

  const runsError = isRunsError
    ? ((runsErrorRaw as any)?.response?.data?.error ??
      (runsErrorRaw as any)?.message ??
      "Failed to load prune runs")
    : null;

  const runsStatusCode = isRunsError ? ((runsErrorRaw as any)?.response?.status ?? null) : null;

  return {
    runs: allRuns,
    isLoadingRuns: isLoadingRuns && offset === 0,
    isFetchingMore: isFetchingRuns && offset > 0,
    isRunsError,
    runsError,
    runsStatusCode,
    hasMore: runsResponse?.pagination?.has_more ?? false,
    total: runsResponse?.pagination?.total ?? 0,
    loadMore,
    statusFilter,
    setFilter,
    refetchRuns: () => {
      setOffset(0);
      setAllRuns([]);
      refetchRuns();
    },
  };
}
