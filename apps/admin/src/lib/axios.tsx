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

export const setAdminToken = (token: string) => {
  apiClient.defaults.headers.common['X-Admin-Token'] = token;
};

// switch to sessionStorage
apiClient.interceptors.request.use(
  config => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      config.headers['X-Admin-Token'] = adminToken;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
