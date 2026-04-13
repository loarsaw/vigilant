import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, setBaseURL, setAuthToken } from "@/lib/axios";

interface LoginCredentials {
  email: string;
  password: string;
}

interface TokenCredentials {
  token: string;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  token: string;
}

const adminAuthApi = {
  login: async (workspace: string, credentials: LoginCredentials): Promise<LoginResponse> => {
    await setBaseURL(workspace);
    const { data } = await apiClient.post<LoginResponse>("/login", {
      email: credentials.email,
      password: credentials.password,
    });
    return data;
  },

  loginWithToken: async (
    workspace: string,
    credentials: TokenCredentials,
  ): Promise<LoginResponse> => {
    await setBaseURL(workspace);
    const { data } = await apiClient.post<LoginResponse>(
      "/access",
      {},
      {
        headers: {
          "X-Admin-Token": credentials.token,
        },
      },
    );
    localStorage.setItem("super_admin_token", credentials.token);
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/logout");
    localStorage.clear();
  },

  me: async (): Promise<AdminUser> => {
    const { data } = await apiClient.get<AdminUser>("/me");
    return data;
  },
};

const STORAGE_KEYS = {
  WORKSPACE: "admin_workspace",
  TOKEN: "admin_token",
  USER: "admin_user",
} as const;

function saveToLocalStorage(workspace: string, token: string, user: AdminUser) {
  localStorage.setItem(STORAGE_KEYS.WORKSPACE, workspace);
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
}

function loadFromLocalStorage() {
  const workspace = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);

  if (workspace && token && userStr) {
    try {
      const user = JSON.parse(userStr) as AdminUser;
      return { workspace, token, user };
    } catch {
      return null;
    }
  }
  return null;
}

function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEYS.WORKSPACE);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

export function useAdminAuth() {
  const queryClient = useQueryClient();

  const stored = loadFromLocalStorage();
  const canFetchMe =
    (!!apiClient.defaults.headers.common["Authorization"] || !!stored?.token) &&
    (!!apiClient.defaults.baseURL || !!stored?.workspace);

  if (stored && !apiClient.defaults.headers.common["Authorization"]) {
    setBaseURL(stored.workspace);
    setAuthToken(stored.token);
  }

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isAuthError,
  } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: adminAuthApi.me,
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: canFetchMe,
    initialData: stored?.user,
  });

  function handleLoginSuccess(data: LoginResponse, workspace: string) {
    setAuthToken(data.token);

    const adminUser: AdminUser = {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    queryClient.setQueryData(["admin", "me"], adminUser);
    saveToLocalStorage(workspace, data.token, adminUser);
  }

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
    }) => adminAuthApi.login(workspace, credentials),
    onSuccess: (data, { workspace }) => handleLoginSuccess(data, workspace),
  });

  const {
    mutateAsync: loginWithToken,
    isPending: isLoggingInWithToken,
    error: tokenLoginError,
    reset: resetTokenLogin,
  } = useMutation({
    mutationFn: ({
      workspace,
      credentials,
    }: {
      workspace: string;
      credentials: TokenCredentials;
    }) => adminAuthApi.loginWithToken(workspace, credentials),

    onSuccess: (data, { workspace }) => handleLoginSuccess(data, workspace),
  });

  const { mutateAsync: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: adminAuthApi.logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
      queryClient.clear();
      clearLocalStorage();
      delete apiClient.defaults.headers.common["Authorization"];
      delete apiClient.defaults.baseURL;
    },
  });

  const role = user?.role ?? null;
  const isInterviewer = role === "interviewer";
  const isAdmin = role === "hr";
  const isSuperAdmin = role === "superadmin";
  const hasRole = (allowedRoles: string[]) => (role ? allowedRoles.includes(role) : false);

  return {
    user: user ?? null,
    role,
    isAuthenticated: !!user,
    isLoadingUser,
    isAuthError,

    isInterviewer,
    isAdmin,
    isSuperAdmin,
    hasRole,

    login,
    isLoggingIn,
    loginError,
    resetLogin,

    loginWithToken,
    isLoggingInWithToken,
    tokenLoginError,
    resetTokenLogin,

    logout,
    isLoggingOut,
  };
}
