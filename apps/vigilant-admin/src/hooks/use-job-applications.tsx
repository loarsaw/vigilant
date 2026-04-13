import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

export interface JobApplication {
  id: string;
  candidate_id: string;
  candidate_email: string;
  candidate_name: string;
  candidate_phone: string;
  resume_url: string;
  skills: string;
  experience_years: number;
  position_id: string;
  position_title: string;
  department: string;
  location: string;
  status: ApplicationStatus;
  cover_letter: string;
  notes: string;
  applied_at: string;
  updated_at: string;
}

export interface PositionDetails {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
}

export interface StatusBreakdown {
  applied?: number;
  screening?: number;
  interviewing?: number;
  offered?: number;
  hired?: number;
  rejected?: number;
  withdrawn?: number;
}

export interface ApplicationStatistics {
  total_applications: number;
  status_breakdown: StatusBreakdown;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_count: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interviewing"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

export type SortBy = "applied_at" | "updated_at" | "candidate_name" | "position_title" | "status";

export type SortOrder = "asc" | "desc";

export interface JobApplicationsFilters {
  status?: ApplicationStatus;
  position_id?: string;
  candidate_id?: string;
  department?: string;
  page?: number;
  limit?: number;
  sort_by?: SortBy;
  sort_order?: SortOrder;
  include_position?: boolean;
  include_stats?: boolean;
}

export interface JobApplicationsResponse {
  applications: JobApplication[];
  filters: {
    status: string;
    position_id: string;
    candidate_id: string;
    department: string;
  };
  pagination: Pagination;
  sort: {
    sort_by: string;
    sort_order: string;
  };
  position?: PositionDetails;
  statistics?: ApplicationStatistics;
}

export interface UpdateApplicationStatusPayload {
  status: ApplicationStatus;
  notes?: string;
}

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
