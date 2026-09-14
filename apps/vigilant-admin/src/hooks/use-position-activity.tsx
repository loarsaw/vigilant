import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { PositionActivity, PositionActivityResponse } from "./types";

const fetchPositionActivity = async (positionId: string): Promise<PositionActivity> => {
  const response = await apiClient.get<PositionActivityResponse>(
    `/positions/${positionId}/activity`,
  );
  return response.data.data;
};

export function usePositionActivity(positionId: string | undefined) {
  const {
    data: activity,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<PositionActivity, Error>({
    queryKey: ["admin", "position-activity", positionId],
    queryFn: () => fetchPositionActivity(positionId as string),
    enabled: Boolean(positionId),
    staleTime: 1000 * 60,
  });

  return {
    activity,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}