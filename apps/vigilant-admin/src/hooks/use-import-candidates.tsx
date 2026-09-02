import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { ImportResult } from "./types";

const importCandidatesCSV = async (file: File): Promise<ImportResult> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/csv-upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export function useImportCandidates() {
  const queryClient = useQueryClient();

  const { mutate, mutateAsync, isPending, isSuccess, isError, data, error, reset } = useMutation({
    mutationFn: importCandidatesCSV,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  return {
    importCSV: mutate,
    importCSVAsync: mutateAsync,
    isImporting: isPending,
    isSuccess,
    isError,
    importResult: data ?? null,
    importError: (error as any)?.response?.data?.error ?? error?.message ?? null,
    reset,
  };
}
