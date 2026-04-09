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

export function setAuthToken(token: string) {
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}


export function createSSEConnection(
  path: string,
  onMessage: (type: string, payload: unknown) => void,
  onError?: () => void
): () => void {
  const baseURL = apiClient.defaults.baseURL ?? '';
  const token = encodeURIComponent(localStorage.getItem('admin_token') ?? '');
  const url = `${baseURL}${path}?token=${token}`;

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


apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_workspace');
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      delete apiClient.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

apiClient.interceptors.request.use(
  config => {
    const super_auth_token = localStorage.getItem('super_admin_token');


      if (super_auth_token) config.headers['X-Admin-Token'] = super_auth_token;

    return config;
  },
  error => Promise.reject(error)
);