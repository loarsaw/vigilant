import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import {
  JobApplication,
  JobApplicationsFilters,
  JobApplicationsResponse,
  UpdateApplicationStatusPayload,
} from "./types";

const fetchJobApplications = async (
  filters: JobApplicationsFilters,
): Promise<JobApplicationsResponse> => {
  const params = new URLSearchParams();

  if (filters.status) params.set("status", filters.status);
  if (filters.position_id) params.set("position_id", filters.position_id);
  if (filters.candidate_id) params.set("candidate_id", filters.candidate_id);
  if (filters.department) params.set("department", filters.department);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  if (filters.include_position) params.set("include_position", "true");
  if (filters.include_stats) params.set("include_stats", "true");

  const response = await apiClient.get(`/applications?${params.toString()}`);

  if (Array.isArray(response.data)) {
    return { applications: response.data } as JobApplicationsResponse;
  }

  return response.data;
};

const updateApplicationStatus = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateApplicationStatusPayload;
}): Promise<JobApplication> => {
  const response = await apiClient.patch<JobApplication>(`/applications/${id}/status`, payload);
  return response.data;
};

export function useJobApplications(filters: JobApplicationsFilters = {}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    JobApplicationsResponse,
    Error
  >({
    queryKey: ["job-applications", filters],
    queryFn: () => fetchJobApplications(filters),
  });

  const updateStatusMutation = useMutation<
    JobApplication,
    Error,
    { id: string; payload: UpdateApplicationStatusPayload }
  >({
    mutationFn: updateApplicationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-applications"] });
    },
  });

  const approveApplication = (id: string, notes?: string) =>
    updateStatusMutation.mutate({ id, payload: { status: "offered", notes } });

  const rejectApplication = (id: string, notes?: string) =>
    updateStatusMutation.mutate({ id, payload: { status: "rejected", notes } });

  const approveApplicationAsync = (id: string, notes?: string) =>
    updateStatusMutation.mutateAsync({
      id,
      payload: { status: "offered", notes },
    });

  const rejectApplicationAsync = (id: string, notes?: string) =>
    updateStatusMutation.mutateAsync({
      id,
      payload: { status: "rejected", notes },
    });

  return {
    applications: data?.applications ?? [],
    pagination: data?.pagination ?? null,
    sort: data?.sort ?? null,
    activeFilters: data?.filters ?? null,
    position: data?.position ?? null,
    statistics: data?.statistics ?? null,

    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,

    updateApplicationStatus: updateStatusMutation.mutate,
    updateApplicationStatusAsync: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error?.message ?? null,
    resetUpdateStatus: updateStatusMutation.reset,

    approveApplication,
    approveApplicationAsync,
    rejectApplication,
    rejectApplicationAsync,
    isApprovingOrRejecting: updateStatusMutation.isPending,
  };
}
