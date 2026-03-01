import axios from 'axios';

async function getIsDev() {
  const { isDev } = await window.api.isDev();
  return isDev;
}

function getBaseUrl(): string {
  const isDev = getIsDev();
  return isDev ? 'http://localhost:3333/api/v1/admin' : '';
}

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setBaseURL = (workspaceName: string) => {
  if (!getIsDev()) {
    const reversedDomain = workspaceName.split('.').reverse().join('.');
    apiClient.defaults.baseURL = `https://${reversedDomain}/api/v1/admin`;
  } else {
    apiClient.defaults.baseURL = `http://localhost:3333/api/v1/admin`;
  }
};

export type AuthMethod = 'token' | 'credentials';
export const saveTokenAuth = (token: string) => {
  localStorage.setItem('authMethod', 'token');
  localStorage.setItem('adminToken', token);
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminPassword');
};

export const saveCredentialsAuth = (email: string, password: string) => {
  localStorage.setItem('authMethod', 'credentials');
  localStorage.setItem('adminEmail', email);
  localStorage.setItem('adminPassword', password);
  localStorage.removeItem('adminToken');
};

export const clearAuth = () => {
  localStorage.removeItem('authMethod');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminPassword');
};

apiClient.interceptors.request.use(
  config => {
    const authMethod = localStorage.getItem('authMethod') as AuthMethod | null;

    if (authMethod === 'credentials') {
      const email = localStorage.getItem('adminEmail');
      const password = localStorage.getItem('adminPassword');
      if (email) config.headers['X-Admin-Email'] = email;
      if (password) config.headers['X-Admin-Password'] = password;
    } else {
      const token = localStorage.getItem('adminToken');
      if (token) config.headers['X-Admin-Token'] = token;
    }

    return config;
  },
  error => Promise.reject(error)
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export function createSSEConnection(
  path: string,
  onMessage: (type: string, payload: unknown) => void,
  onError?: () => void
): () => void {
  const baseURL = apiClient.defaults.baseURL ?? '';
  const authMethod = localStorage.getItem('authMethod') as AuthMethod | null;

  let authQuery: string;
  if (authMethod === 'credentials') {
    const email = encodeURIComponent(localStorage.getItem('adminEmail') ?? '');
    const password = encodeURIComponent(localStorage.getItem('adminPassword') ?? '');
    authQuery = `email=${email}&password=${password}`;
  } else {
    const token = encodeURIComponent(localStorage.getItem('adminToken') ?? '');
    authQuery = `token=${token}`;
  }

  const url = `${baseURL}${path}?${authQuery}`;
  const es = new EventSource(url);

  es.onmessage = event => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data.type, data.payload);
    } catch {}
  };

  es.onerror = () => {
    onError?.();
    es.close();
  };

  return () => es.close();
}

export async function pushToCandidate(
  candidateId: string | number,
  type: string,
  payload: unknown
): Promise<void> {
  await apiClient.post(`/candidates/${candidateId}/push`, { type, payload });
}