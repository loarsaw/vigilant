import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';


export interface Admin {
  id: string;
  email: string;
  full_name: string;
  role: 'hr' | 'interviewer';
  department: string;
  designation: string;
  phone_number: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface AdminsResponse {
  admins: Admin[];
}

export interface CreateAdminPayload {
  email: string;
  password: string;
  full_name: string;
  role: 'hr' | 'interviewer';
  department?: string;
  designation?: string;
  phone_number?: string;
}

export interface UpdateAdminPayload {
  full_name?: string;
  department?: string;
  designation?: string;
  phone_number?: string;
}

export interface ResetPasswordPayload {
  new_password: string;
}


const fetchAdmins = async (): Promise<AdminsResponse> => {
  const response = await apiClient.get<AdminsResponse>('/admins');
  return response.data;
};

const fetchAdmin = async (id: string): Promise<Admin> => {
  const response = await apiClient.get<Admin>(`/admins/${id}`);
  return response.data;
};

const createAdmin = async (payload: CreateAdminPayload): Promise<Admin> => {
  const response = await apiClient.post<Admin>('/admins', payload);
  return response.data;
};

const updateAdmin = async ({
  id,
  payload,
}: {
  id: string;
  payload: UpdateAdminPayload;
}): Promise<void> => {
  await apiClient.patch(`/admins/${id}`, payload);
};

const deleteAdmin = async (id: string): Promise<void> => {
  await apiClient.delete(`/admins/${id}`);
};

const toggleAdminActive = async (id: string): Promise<{ id: string; is_active: boolean }> => {
  const response = await apiClient.patch<{ id: string; is_active: boolean }>(
    `/admins/${id}/toggle-active`
  );
  return response.data;
};

const resetAdminPassword = async ({
  id,
  payload,
}: {
  id: string;
  payload: ResetPasswordPayload;
}): Promise<void> => {
  await apiClient.post(`/admins/${id}/reset-password`, payload);
};


export function useAdmins() {
  const queryClient = useQueryClient();
  const queryKey = ['admins'] as const;

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery<AdminsResponse, Error>({
    queryKey,
    queryFn: fetchAdmins,
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation<Admin, Error, CreateAdminPayload>({
    mutationFn: createAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string; payload: UpdateAdminPayload }
  >({
    mutationFn: updateAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const toggleMutation = useMutation<
    { id: string; is_active: boolean },
    Error,
    string
  >({
    mutationFn: toggleAdminActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const resetPasswordMutation = useMutation<
    void,
    Error,
    { id: string; payload: ResetPasswordPayload }
  >({
    mutationFn: resetAdminPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    admins: response?.admins ?? [],
    total:  response?.admins.length ?? 0,

    isLoading,
    isFetching,
    isError,
    errorMessage: error?.message ?? null,
    refetch,

    addAdmin:            createMutation.mutate,
    addAdminAsync:       createMutation.mutateAsync,
    isAdding:            createMutation.isPending,
    addErrorMessage:     createMutation.error?.message ?? null,
    resetAdd:            createMutation.reset,

    updateAdmin:         updateMutation.mutate,
    updateAdminAsync:    updateMutation.mutateAsync,
    isUpdating:          updateMutation.isPending,
    updateErrorMessage:  updateMutation.error?.message ?? null,
    resetUpdate:         updateMutation.reset,

    toggleAdminActive:      toggleMutation.mutate,
    toggleAdminActiveAsync: toggleMutation.mutateAsync,
    isToggling:             toggleMutation.isPending,
    toggleErrorMessage:     toggleMutation.error?.message ?? null,

    deleteAdmin:         deleteMutation.mutate,
    deleteAdminAsync:    deleteMutation.mutateAsync,
    isDeleting:          deleteMutation.isPending,
    deleteErrorMessage:  deleteMutation.error?.message ?? null,

    resetPassword:          resetPasswordMutation.mutate,
    resetPasswordAsync:     resetPasswordMutation.mutateAsync,
    isResettingPassword:    resetPasswordMutation.isPending,
    resetPasswordError:     resetPasswordMutation.error?.message ?? null,
    resetPasswordReset:     resetPasswordMutation.reset,
  };
}


export function useAdmin(id: string | undefined) {
  return useQuery<Admin, Error>({
    queryKey: ['admins', id],
    queryFn: () => fetchAdmin(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}