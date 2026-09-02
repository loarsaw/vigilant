import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { DashboardStats } from "./types";


const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get("/dashboard");
  return response.data;
};

export function useDashboard() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });

  return {
    dashboardData: data ?? {},
    upcomingList: data?.upcoming_list ?? [],
    pipeline: data?.pipeline ?? {},

    totalCandidates: data?.total_candidates ?? 0,
    openPositions: data?.open_positions ?? 0,
    activeInterviews: data?.active_interviews ?? 0,
    upcomingInterviews: data?.upcoming_interviews ?? 0,
    applicationsToday: data?.applications_today ?? 0,
    highRiskSessions: data?.high_risk_sessions ?? 0,

    // superadmin only
    totalAdmins: data?.total_admins ?? 0,
    emailPending: data?.email_pending ?? 0,
    emailFailedToday: data?.email_failed_today ?? 0,
    suspiciousProcessesToday: data?.suspicious_processes_today ?? 0,

    // interviewer only
    totalInterviewsAssigned: data?.total_interviews_assigned ?? 0,

    isLoading,
    isError,
    error,
    refetch,
  };
}
