import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useEffect, useState } from "react";
import { ActiveUsersResponse, Candidate, CandidateQueryParams, PaginatedResponse } from "./types";

// --- API Functions ---
const fetchCandidates = async (params: CandidateQueryParams): Promise<PaginatedResponse> => {
  const response = await apiClient.get<PaginatedResponse>("/candidates", {
    params,
  });
  return response.data;
};

const fetchCandidate = async (
  id: string,
): Promise<{ candidate: Candidate; is_online: boolean }> => {
  const response = await apiClient.get(`/candidates/${id}`);
  return response.data;
};

const fetchActiveUsers = async (): Promise<ActiveUsersResponse> => {
  const response = await apiClient.get<ActiveUsersResponse>("/active-users");
  return response.data;
};

const createCandidate = async (payload: {
  full_name: string;
  email: string;
  password: string;
}): Promise<Candidate> => {
  const response = await apiClient.post<Candidate>("/candidates", payload);
  return response.data;
};

// --- Hook ---
export function useCandidates() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const { data, isLoading, isError, error, refetch } = useQuery<PaginatedResponse, Error>({
    queryKey: ["candidates", { page, limit, search: debouncedSearch, filter }],
    queryFn: () => fetchCandidates({ page, limit, search: debouncedSearch, filter }),
    staleTime: 1000 * 60 * 2,
  });

  const { data: activeUsersData } = useQuery<ActiveUsersResponse, Error>({
    queryKey: ["admin", "active-users"],
    queryFn: fetchActiveUsers,
    refetchInterval: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: createCandidate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["candidates"] }),
  });

  const candidatesWithPresence = (data?.data ?? []).map((candidate) => ({
    ...candidate,
    is_online: activeUsersData?.active_users.includes(candidate.id) ?? candidate.is_online ?? false,
  }));

  return {
    candidates: candidatesWithPresence,
    total: data?.total ?? 0,
    totalPages: data?.total_pages ?? 1,
    page,
    setPage,
    search,
    setSearch,
    filter,
    setFilter,
    isLoading,
    isError,
    error: error?.message ?? null,
    addCandidate: createMutation.mutate,
    isAdding: createMutation.isPending,
    activeUserCount: activeUsersData?.count ?? 0,
    refetch,
  };
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: ["candidates", id],
    queryFn: () => fetchCandidate(id!),
    enabled: !!id,
  });
}
