import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { JobApplicationStatusResponse } from "./types";

const fetchJobApplicationStatus = async (
  applicationID: string,
): Promise<JobApplicationStatusResponse> => {
  const response = await apiClient.get(`/applications/${applicationID}/status`);
  return response.data;
};

export function useJobApplicationStatus(applicationID: string) {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    JobApplicationStatusResponse,
    Error
  >({
    queryKey: ["job-application-status", applicationID],
    queryFn: () => fetchJobApplicationStatus(applicationID),
    enabled: !!applicationID,
  });

  return {
    applicationID: data?.application_id ?? null,
    status: data?.status ?? null,

    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,
  };
}
