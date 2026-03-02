import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, setBaseURL, presenceSocket , setAuthToken } from '@/lib/axios';
import { useEffect } from 'react';


interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthUser {
  candidate_id: number;
  email: string;
  full_name: string;
  session_id: number;
}


interface LoginResponse {
  candidate_id: number;
  email: string;
  expires_at: string;
  full_name: string;
  logged_in_at: string;
  session_id: number;
  token: string;
}


interface SetupStatus {
  assigned: boolean;
  setupPath?: string;
}

const authApi = {
  login: async (
    workspace: string,
    credentials: LoginCredentials
  ): Promise<LoginResponse> => {
    await setBaseURL(workspace);
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      email: credentials.username,
      password: credentials.password,
    });
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },

  checkSetup: async (
    workspace: string,
    username: string
  ): Promise<SetupStatus> => {
    const { data } = await apiClient.get<SetupStatus>('/auth/setup-status', {
      params: { workspace, username },
    });
    return data;
  },
};

export function useAuth() {
  const queryClient = useQueryClient();
  const hasToken = !!apiClient.defaults.headers.common['Authorization'];
  const hasBaseURL = !!apiClient.defaults.baseURL;
  const canFetchMe = hasToken && hasBaseURL;
  
const {
    data: user,
    isLoading: isLoadingUser,
    isError: isAuthError,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: canFetchMe,
       
  });

useEffect(() => {
  if (!user) return;

  const token = apiClient.defaults.headers.common['Authorization']?.toString().replace('Bearer ', '');
  if (!token) return;

  presenceSocket.connect({
    token, 
    onStatusChange: status => {
      console.log('[Presence]', status);
    },
  });

  return () => {
    presenceSocket.disconnect();
  };
}, [user?.candidate_id]);


 const {
    mutateAsync: login,
    isPending: isLoggingIn,
    error: loginError,
    reset: resetLogin,
  } = useMutation({
    mutationFn: ({
      workspace,
      credentials,
    }: {
      workspace: string;
      credentials: LoginCredentials;
    }) => authApi.login(workspace, credentials),
    onSuccess: data => {          
      setAuthToken(data.token);
      queryClient.setQueryData(['auth', 'me'], {
        candidate_id: data.candidate_id,
        email: data.email,
        full_name: data.full_name,
        session_id: data.session_id,
      });
      presenceSocket.connect({
        token: data.token,
        onStatusChange: status => {
          console.log('[Presence]', status);
        },
      });
    }, 
  });

  const { mutateAsync: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      presenceSocket.disconnect();
      queryClient.removeQueries({ queryKey: ['auth'] });
      queryClient.clear();
    },
  });

  const setupPoller = (workspace: string, username: string, enabled: boolean) =>
    useQuery({
      queryKey: ['auth', 'setup', workspace, username],
      queryFn: () => authApi.checkSetup(workspace, username),
      enabled,
      refetchInterval: query => (query.state.data?.assigned ? false : 3000),
      retry: false,
    });

const setSessionMeta = (workspace: string, setupPath: string) => {
  queryClient.setQueryData(['auth', 'session-meta'], { workspace, setupPath });
};

const sessionMeta = queryClient.getQueryData<{ workspace: string; setupPath: string }>(['auth', 'session-meta']);
  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoadingUser,
    isAuthError,
    setSessionMeta,
    sessionMeta,

    login,
    isLoggingIn,
    loginError,
    resetLogin,

    logout,
    isLoggingOut,

    setupPoller,
  };
}
