import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

interface UploadResponse {
  count: number;
  data: any[];
  success: boolean;
}

export function useUploadCsv() {
  const queryClient = useQueryClient();

  return useMutation<UploadResponse, Error, File>({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append('file', csvFile);

      const response = await apiClient.post<UploadResponse>(
        '/csv-upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    },
    onSuccess: (data: UploadResponse) => {
      queryClient.setQueryData<UploadResponse>(['uploadedCsvData'], data);
    },
  });
}
