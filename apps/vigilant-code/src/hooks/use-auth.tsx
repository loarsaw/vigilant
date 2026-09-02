import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, setBaseURL, presenceSocket, setAuthToken } from "@/lib/axios";
import { useEffect } from "react";
import { AuthUser, LoginCredentials, LoginResponse, SetupStatus } from "./types";

interface PasscodeVerifyResponse {
  session_id: string;
  room_token: string;
  room_host: string;
  access_token: string;
}


type AuthKind = "account" | "interview";

const authApi = {
  login: async (workspace: string, credentials: LoginCredentials): Promise<LoginResponse> => {
    await setBaseURL(workspace);
    const { data } = await apiClient.post<LoginResponse>("/auth/login", {
      email: credentials.username,
      password: credentials.password,
    });
    return data;
  },

    loginWithToken: async (workspace: string, token: string): Promise<AuthUser> => {
    await setBaseURL(workspace);
    setAuthToken(token);
    const { data } = await apiClient.get<AuthUser>("/auth/me");
    return data;
  },

  verifyPasscode: async (workspace: string, passcode: string): Promise<PasscodeVerifyResponse> => {
    await setBaseURL(workspace);
    const { data } = await apiClient.post<PasscodeVerifyResponse>(
      "/public/interview/verify-passcode",
      { passcode },
    );
    return data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>("/auth/me");
    return data;
  },

  checkSetup: async (workspace: string, username: string): Promise<SetupStatus> => {
    const { data } = await apiClient.get<SetupStatus>("/auth/setup-status", {
      params: { workspace, username },
    });
    return data;
  },
};

export function useAuth() {
  const queryClient = useQueryClient();
  const hasToken = !!apiClient.defaults.headers.common["Authorization"];
  const hasBaseURL = !!apiClient.defaults.baseURL;

  const authKind = queryClient.getQueryData<AuthKind>(["auth", "kind"]);
  const canFetchMe = hasToken && hasBaseURL && authKind !== "interview";

  const {
    data: user,
    isLoading: isLoadingUser,
    isError: isAuthError,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.me,
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: canFetchMe,
  });

  useEffect(() => {
    if (!user) return;

    const token = apiClient.defaults.headers.common["Authorization"]
      ?.toString()
      .replace("Bearer ", "");
    if (!token) return;

    presenceSocket.connect({
      token,
      onStatusChange: (status) => {
        console.log("[Presence]", status);
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
    onSuccess: (data) => {
      setAuthToken(data.token);
      queryClient.setQueryData(["auth", "kind"], "account" satisfies AuthKind);
      queryClient.setQueryData(["auth", "me"], {
        candidate_id: data.candidate_id,
        email: data.email,
        full_name: data.full_name,
        session_id: data.session_id,
        onboarding_complete: data.onboarding_complete,
      });
      presenceSocket.connect({
        token: data.token,
        onStatusChange: (status) => {
          console.log("[Presence]", status);
        },
      });
    },
  });

  const {
    mutateAsync: loginWithToken,
    isPending: isLoggingInWithToken,
    error: loginWithTokenError,
    reset: resetLoginWithToken,
  } = useMutation({
    mutationFn: ({ workspace, token }: { workspace: string; token: string }) =>
      authApi.loginWithToken(workspace, token),
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "kind"], "account" satisfies AuthKind);
      queryClient.setQueryData(["auth", "me"], data);
      presenceSocket.connect({
        token: apiClient.defaults.headers.common["Authorization"]
          ?.toString()
          .replace("Bearer ", "") ?? "",
        onStatusChange: (status) => {
          console.log("[Presence]", status);
        },
      });
    },
  });

  const {
    mutateAsync: verifyPasscode,
    isPending: isVerifyingPasscode,
    error: verifyPasscodeError,
    reset: resetVerifyPasscode,
  } = useMutation({
    mutationFn: ({ workspace, passcode }: { workspace: string; passcode: string }) =>
      authApi.verifyPasscode(workspace, passcode),
    onSuccess: (data) => {
      setAuthToken(data.access_token);
      queryClient.setQueryData(["auth", "kind"], "interview" satisfies AuthKind);
      queryClient.setQueryData(["interview", "room"], {
        sessionId: data.session_id,
        roomToken: data.room_token,
        roomHost: data.room_host,
      });
      presenceSocket.connect({
        token: data.access_token,
        onStatusChange: (status) => {
          console.log("[Presence]", status);
        },
      });
    },
  });

  const { mutateAsync: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      presenceSocket.disconnect();
      queryClient.removeQueries({ queryKey: ["auth"] });
      queryClient.removeQueries({ queryKey: ["interview"] });
      queryClient.clear();
    },
  });

  const setupPoller = (workspace: string, username: string, enabled: boolean) =>
    useQuery({
      queryKey: ["auth", "setup", workspace, username],
      queryFn: () => authApi.checkSetup(workspace, username),
      enabled,
      refetchInterval: (query) => (query.state.data?.assigned ? false : 3000),
      retry: false,
    });

  const setSessionMeta = (workspace: string, setupPath: string) => {
    queryClient.setQueryData(["auth", "session-meta"], {
      workspace,
      setupPath,
    });
  };

  const sessionMeta = queryClient.getQueryData<{
    workspace: string;
    setupPath: string;
  }>(["auth", "session-meta"]);

  const interviewRoom = queryClient.getQueryData<{
    sessionId: string;
    roomToken: string;
    roomHost: string;
  }>(["interview", "room"]);

  return {
    user: user ?? null,
    isAuthenticated: !!user || authKind === "interview",
    isLoadingUser,
    isAuthError,
    setSessionMeta,
    sessionMeta,

    login,
    isLoggingIn,
    loginError,
    resetLogin,

    loginWithToken,
    isLoggingInWithToken,
    loginWithTokenError,
    resetLoginWithToken,

    verifyPasscode,
    isVerifyingPasscode,
    verifyPasscodeError,
    resetVerifyPasscode,
    interviewRoom,

    logout,
    isLoggingOut,

    setupPoller,
  };
}