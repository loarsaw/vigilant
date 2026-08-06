import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { useState } from "react";

export interface Interview {
  id: string;
  candidate_id: string;
  candidate_name: string;
  interview_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
}

export interface CandidateApplication {
  application_id: string;
  application_status: string;
  applied_at: string;
  position_id: string;
  position_title: string;
  candidate_name: string;
  candidate_email: string;
  interview_url?: string;
}

export interface CandidateApplicationsResponse {
  candidate_id: string;
  data: CandidateApplication[];
  total: number;
}

export interface CreateInterviewPayload {
  candidate_id: string;
  application_id: string;
  interviewer_email: string;
  position: string;
  interview_type: string;
  scheduled_at: string;
  scheduled_duration: number;
  interview_url: string;
  timezone: string;
}

export interface SendCustomEmailPayload {
  to_email: string;
  candidate_name: string;
  subject: string;
  message: string;
}

const fetchInterviews = async (params: any) => {
  const response = await apiClient.get("/interviews", { params });
  return response.data;
};

const fetchCandidateApplications = async (
  candidateId: string,
): Promise<CandidateApplicationsResponse> => {
  const response = await apiClient.get(`/candidates/${candidateId}/applications`);
  return response.data;
};

const createInterview = async (payload: CreateInterviewPayload) => {
  const response = await apiClient.post("/create-interview", payload);
  return response.data;
};

const sendCustomEmail = async (payload: SendCustomEmailPayload) => {
  const response = await apiClient.post("/emails/send", payload);
  return response.data;
};

const updateApplicationStatus = async ({ id, payload }: any) => {
  await apiClient.patch(`/applications/${id}/status`, payload);
};

export function useInterview(candidateId?: string) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: interviewData, isLoading: isLoadingInterviews } = useQuery({
    queryKey: ["interviews", { page, candidateId }],
    queryFn: () => fetchInterviews({ page, candidate_id: candidateId }),
    staleTime: 1000 * 60 * 5,
  });

  const { data: appData, isLoading: isLoadingApps } = useQuery({
    queryKey: ["candidate-applications", candidateId],
    queryFn: () => fetchCandidateApplications(candidateId!),
    enabled: !!candidateId,
  });

  const scheduleMutation = useMutation({
    mutationFn: createInterview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      if (candidateId) {
        queryClient.invalidateQueries({
          queryKey: ["candidate-applications", candidateId],
        });
      }
    },
  });

  const emailMutation = useMutation({
    mutationFn: sendCustomEmail,
  });

  const statusMutation = useMutation({
    mutationFn: updateApplicationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate-applications"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  // const applicationOptions = appData?.data.map((app) => ({
  //   value: app.application_id,
  //   label: app.position_title,
  // })) ?? [];

  const applicationOptions =
    appData?.data.map((app) => ({
      application_id: app.application_id,
      position: app.position_title,
    })) ?? [];

  return {
    interviews: interviewData?.data ?? [],
    applications: appData?.data ?? [],
    applicationOptions,
    totalInterviews: interviewData?.total ?? 0,

    isLoading: isLoadingInterviews || isLoadingApps,
    isScheduling: scheduleMutation.isPending,
    isSendingEmail: emailMutation.isPending,
    isUpdatingStatus: statusMutation.isPending,

    setPage,
    scheduleInterview: scheduleMutation.mutate,
    scheduleInterviewAsync: scheduleMutation.mutateAsync,

    sendEmail: emailMutation.mutate,
    sendEmailAsync: emailMutation.mutateAsync,

    approveApplication: (id: string, notes?: string) =>
      statusMutation.mutate({ id, payload: { status: "offered", notes } }),

    rejectApplication: (id: string, notes?: string) =>
      statusMutation.mutate({ id, payload: { status: "rejected", notes } }),

    scheduleError: scheduleMutation.error?.message ?? null,
    emailError: emailMutation.error?.message ?? null,
  };
}
