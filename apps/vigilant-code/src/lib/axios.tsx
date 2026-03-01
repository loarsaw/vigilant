  import axios from 'axios';


  async function getIsDev(): Promise<boolean> {
    const { isDev } = await window.api.isDev();
    return isDev;
  }

  async function getBaseUrl(): Promise<string> {
    const isDev = await getIsDev();
    return isDev ? 'http://localhost:3333/api/v1' : '';
  }




  async function getWsBaseUrl(): Promise<string> {
    const isDev = await getIsDev();
    if (isDev) return 'ws://localhost:3333/api/v1';

    const httpBase = apiClient.defaults.baseURL ?? '';
    return httpBase.replace(/^https/, 'wss').replace(/^http/, 'ws');
  }

  export const apiClient = axios.create({
    baseURL: '',
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });



  let __authToken: string | null = null;

  export function setAuthToken(token: string) {
    __authToken = token;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }


  export function getAuthToken(): string | null {
    return __authToken;
  }


  apiClient.interceptors.request.use(config => {
    if (__authToken) {
      config.headers.Authorization = `Bearer ${__authToken}`;
    }
    return config;
  });


  export const initApiClient = async () => {
    apiClient.defaults.baseURL = await getBaseUrl();
  };

  export const setBaseURL = async (workspaceName: string) => {
    const isDev = await getIsDev();
    if (!isDev) {
      const reversedDomain = workspaceName.split('.').reverse().join('.');
      apiClient.defaults.baseURL = `https://${reversedDomain}/api/v1`;
    } else {
      apiClient.defaults.baseURL = 'http://localhost:3333/api/v1';
    }
  };


  type PresenceStatus = 'connected' | 'disconnected' | 'reconnecting';

  interface PresenceOptions {
    token: string;
    onStatusChange?: (status: PresenceStatus) => void;
  }

  class PresenceSocket {
    private ws: WebSocket | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private pingTimer: ReturnType<typeof setInterval> | null = null;
    private token: string = '';
    private onStatusChange?: (status: PresenceStatus) => void;
    private shouldReconnect = true;
    private reconnectDelay = 3000;

    async connect(options: PresenceOptions) {
      this.token = options.token;
      this.onStatusChange = options.onStatusChange;
      this.shouldReconnect = true;

      const wsBase = await getWsBaseUrl();
      const url = `${wsBase}/ws/presence?token=${this.token}`;

      this.createSocket(url);
    }

    private createSocket(url: string) {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.onStatusChange?.('connected');
        this.reconnectDelay = 3000; 

        
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 20_000);

        
        this.attachActivityListeners();
      };

      this.ws.onclose = () => {
        console.log('[WS] Disconnected');
        this.cleanup();
        if (this.shouldReconnect) {
          this.onStatusChange?.('reconnecting');
          this.scheduleReconnect(url);
        } else {
          this.onStatusChange?.('disconnected');
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error', err);
        this.ws?.close();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') {
          }
        } catch {
        }
      };
    }

    private attachActivityListeners() {
      const sendActivity = () => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'active' }));
        }
      };

      window.addEventListener('mousemove', sendActivity);
      window.addEventListener('keydown', sendActivity);
      window.addEventListener('click', sendActivity);
      (this as any)._sendActivity = sendActivity;
    }

    private detachActivityListeners() {
      const sendActivity = (this as any)._sendActivity;
      if (sendActivity) {
        window.removeEventListener('mousemove', sendActivity);
        window.removeEventListener('keydown', sendActivity);
        window.removeEventListener('click', sendActivity);
      }
    }

    private scheduleReconnect(url: string) {
      this.reconnectTimer = setTimeout(() => {
        console.log('[WS] Reconnecting...');
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30_000); 
        this.createSocket(url);
      }, this.reconnectDelay);
    }

    private cleanup() {
      if (this.pingTimer) clearInterval(this.pingTimer);
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.detachActivityListeners();
    }

    disconnect() {
      this.shouldReconnect = false;
      this.cleanup();
      this.ws?.close();
      this.ws = null;
    }

    get isConnected() {
      return this.ws?.readyState === WebSocket.OPEN;
    }
  }

  export const presenceSocket = new PresenceSocket();


export function createSSEConnection(
  path: string,
  onMessage: (type: string, payload: unknown) => void,
  onError?: () => void
): () => void {
  const baseURL = apiClient.defaults.baseURL ?? '';
  const token = getAuthToken() ?? '';
  const url = `${baseURL}${path}?token=${encodeURIComponent(token)}`;

  const es = new EventSource(url); 
  
  es.onmessage = (event) => {
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