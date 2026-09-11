import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { QuestionSet, GenerateQuestionsInput } from "./types";

const interviewQuestionsApi = {
  generateQuestions: async (
    sessionId: string,
    input: GenerateQuestionsInput,
  ): Promise<QuestionSet> => {
    const { data } = await apiClient.post<{ data: QuestionSet }>(
      `/ai/interview-sessions/${sessionId}/questions/generate`,
      input,
    );
    return data.data;
  },
};

export function useGenerateQuestions(sessionId: string | undefined) {
  const queryClient = useQueryClient();

  const {
    mutate: generateQuestions,
    mutateAsync: generateQuestionsAsync,
    isPending: isGeneratingQuestions,
    error: generateQuestionsErrorRaw,
    isSuccess: generateQuestionsSuccess,
    reset: resetGenerateQuestions,
  } = useMutation({
    mutationFn: (input: GenerateQuestionsInput) => {
      if (!sessionId) throw new Error("No session ID");
      return interviewQuestionsApi.generateQuestions(sessionId, input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["interview-questions", sessionId], data);
    },
  });

  const generateQuestionsError = generateQuestionsErrorRaw
    ? ((generateQuestionsErrorRaw as any)?.response?.data?.error ??
      generateQuestionsErrorRaw.message ??
      "Failed to generate questions")
    : null;

  return {
    generateQuestions,
    generateQuestionsAsync,
    isGeneratingQuestions,
    generateQuestionsError,
    generateQuestionsSuccess,
    resetGenerateQuestions,
  };
}
