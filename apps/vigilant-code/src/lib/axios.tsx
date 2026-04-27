import axios from "axios";

async function getIsDev(): Promise<boolean> {
  const { isDev } = await window.api.isDev();
  return isDev;
}

// Bullshot
async function getBaseUrl(domain?: string): Promise<string> {
  const isDev = await getIsDev();

  if (isDev) {
    return "http://localhost:3333/api/v1";
  }

  if (domain) {
    const formattedDomain = domain.includes(".") ? domain : domain.split(".").reverse().join(".");
    return `https://${formattedDomain}/api/v1`;
  }

  const storedDomain = localStorage.getItem("domain");
  if (storedDomain) {
    const formattedDomain = storedDomain.includes(".")
      ? storedDomain
      : storedDomain.split(".").reverse().join(".");
    return `https://${formattedDomain}/api/v1`;
  }

  console.warn("No domain configured for production environment");
  return "";
}

async function getWsBaseUrl(): Promise<string> {
  const isDev = await getIsDev();
  if (isDev) return "ws://localhost:3333/api/v1";

  const httpBase = apiClient.defaults.baseURL ?? "";
  if (!httpBase) {
    console.error("Cannot create WebSocket URL: No base URL configured");
    return "";
  }

  return httpBase.replace(/^https/, "wss").replace(/^http/, "ws");
}

export const apiClient = axios.create({
  baseURL: "",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

let __authToken: string | null = null;
let __domain: string | null = null;

export function setAuthToken(token: string) {
  __authToken = token;
  apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  localStorage.setItem("authToken", token);
}

export function getAuthToken(): string | null {
  if (__authToken) return __authToken;

  const storedToken = localStorage.getItem("authToken");
  if (storedToken) {
    __authToken = storedToken;
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    return storedToken;
  }

  return null;
}

export function setDomain(domain: string) {
  __domain = domain;
  localStorage.setItem("domain", domain);
}

export function getDomain(): string | null {
  if (__domain) return __domain;

  const storedDomain = localStorage.getItem("domain");
  if (storedDomain) {
    __domain = storedDomain;
    return storedDomain;
  }

  return null;
}

export function clearAuth() {
  __authToken = null;
  __domain = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("domain");
  delete apiClient.defaults.headers.common["Authorization"];
}

apiClient.interceptors.request.use((config) => {
  if (__authToken) {
    config.headers.Authorization = `Bearer ${__authToken}`;
  }
  return config;
});

export const initApiClient = async () => {
  const storedToken = localStorage.getItem("authToken");
  const storedDomain = localStorage.getItem("domain");

  if (storedToken) {
    setAuthToken(storedToken);
  }

  if (storedDomain) {
    __domain = storedDomain;
    await setBaseURL(storedDomain);
  } else {
    apiClient.defaults.baseURL = await getBaseUrl();
  }

  console.log("API Client initialized");
  console.log("Base URL:", apiClient.defaults.baseURL);
  console.log("Domain:", __domain);
  console.log("Has Auth Token:", !!__authToken);
};

export const setBaseURL = async (domain: string) => {
  const isDev = await getIsDev();

  if (!isDev) {
    setDomain(domain);
    const formattedDomain = domain.includes(".") ? domain : domain.split(".").reverse().join(".");
    apiClient.defaults.baseURL = `https://${formattedDomain}/api/v1`;

    console.log("API Base URL set to:", apiClient.defaults.baseURL);
    console.log("Domain stored:", domain);
  } else {
    apiClient.defaults.baseURL = "http://localhost:3333/api/v1";
    console.log("Development mode - using localhost");
  }
};

// Helper to check if API is ready
export const isApiReady = (): boolean => {
  return !!apiClient.defaults.baseURL && apiClient.defaults.baseURL !== "";
};

// Helper to get current configuration
export const getApiConfig = () => {
  return {
    baseURL: apiClient.defaults.baseURL,
    domain: __domain,
    hasAuthToken: !!__authToken,
    isReady: isApiReady(),
  };
};

type PresenceStatus = "connected" | "disconnected" | "reconnecting";

interface PresenceOptions {
  token: string;
  onStatusChange?: (status: PresenceStatus) => void;
}

class PresenceSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private token: string = "";
  private onStatusChange?: (status: PresenceStatus) => void;
  private shouldReconnect = true;
  private reconnectDelay = 3000;

  async connect(options: PresenceOptions) {
    this.token = options.token;
    this.onStatusChange = options.onStatusChange;
    this.shouldReconnect = true;

    const wsBase = await getWsBaseUrl();

    if (!wsBase) {
      console.error("[WS] Cannot connect: No WebSocket URL available");
      this.onStatusChange?.("disconnected");
      return;
    }

    const url = `${wsBase}/ws/presence?token=${this.token}`;

    this.createSocket(url);
  }

  private createSocket(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[WS] Connected");
      this.onStatusChange?.("connected");
      this.reconnectDelay = 3000;

      this.pingTimer = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 20_000);

      this.attachActivityListeners();
    };

    this.ws.onclose = () => {
      console.log("[WS] Disconnected");
      this.cleanup();
      if (this.shouldReconnect) {
        this.onStatusChange?.("reconnecting");
        this.scheduleReconnect(url);
      } else {
        this.onStatusChange?.("disconnected");
      }
    };

    this.ws.onerror = (err) => {
      console.error("[WS] Error", err);
      this.ws?.close();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pong") {
          // Heartbeat received
        }
      } catch {}
    };
  }

  private attachActivityListeners() {
    const sendActivity = () => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "active" }));
      }
    };

    window.addEventListener("mousemove", sendActivity);
    window.addEventListener("keydown", sendActivity);
    window.addEventListener("click", sendActivity);
    (this as any)._sendActivity = sendActivity;
  }

  private detachActivityListeners() {
    const sendActivity = (this as any)._sendActivity;
    if (sendActivity) {
      window.removeEventListener("mousemove", sendActivity);
      window.removeEventListener("keydown", sendActivity);
      window.removeEventListener("click", sendActivity);
    }
  }

  private scheduleReconnect(url: string) {
    this.reconnectTimer = setTimeout(() => {
      console.log("[WS] Reconnecting...");
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
  onError?: () => void,
): () => void {
  const baseURL = apiClient.defaults.baseURL ?? "";

  if (!baseURL) {
    console.error("[SSE] Cannot create connection: No base URL configured");
    onError?.();
    return () => {};
  }

  const token = getAuthToken() ?? "";
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
