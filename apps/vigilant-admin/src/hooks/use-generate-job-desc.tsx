import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { GenerateJobDescriptionInput, GeneratedJobDescription } from "./types";

const jobDescriptionApi = {
  generate: async (input: GenerateJobDescriptionInput): Promise<GeneratedJobDescription> => {
    const { data } = await apiClient.post<{ data: GeneratedJobDescription }>(
      `/ai/positions/generate-description`,
      input,
    );
    return {
      ...data.data,
      skills: Array.isArray(data.data?.skills) ? data.data.skills : [],
    };
  },
};

export function useGenerateJobDescription() {
  const {
    mutate: generateJobDescription,
    mutateAsync: generateJobDescriptionAsync,
    data: generatedDescription,
    isPending: isGeneratingDescription,
    error: generateDescriptionErrorRaw,
    isSuccess: generateDescriptionSuccess,
    reset: resetGenerateDescription,
  } = useMutation({
    mutationFn: (input: GenerateJobDescriptionInput) => jobDescriptionApi.generate(input),
  });

  const generateDescriptionError = generateDescriptionErrorRaw
    ? ((generateDescriptionErrorRaw as any)?.response?.data?.error ??
      generateDescriptionErrorRaw.message ??
      "Failed to generate job description")
    : null;

  return {
    generateJobDescription,
    generateJobDescriptionAsync,
    generatedDescription,
    generatedSkills: generatedDescription?.skills ?? [],
    isGeneratingDescription,
    generateDescriptionError,
    generateDescriptionSuccess,
    resetGenerateDescription,
  };
}