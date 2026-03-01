import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export interface ImportCandidate {
  full_name: string;
  email: string;
  password: string;
}

interface ImportResponse {
  success: boolean;
  count: number;
  candidates: Array<{
    id: number;
    full_name: string;
    email: string;
    password: string;
  }>;
}

export function useImportCandidates() {
  const queryClient = useQueryClient();

  return useMutation<ImportResponse, Error, ImportCandidate[]>({
    mutationFn: async (candidates: ImportCandidate[]) => {
      const response = await apiClient.post<ImportResponse>(
        '/api/candidates/import',
        { candidates }
      );

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate candidates list to refetch
      queryClient.invalidateQueries({ queryKey: ['candidates'] });

      // Optionally clear the uploaded CSV data
      queryClient.removeQueries({ queryKey: ['uploadedCsvData'] });

      // Store the import results if needed
      queryClient.setQueryData(['importResults'], data);
    },
    onError: (error) => {
      console.error('Import failed:', error);
    },
  });
}
