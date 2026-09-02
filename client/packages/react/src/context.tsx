import { createContext, useContext, useMemo, type ReactNode } from "react";
import { VigilantClient, type VigilantClientConfig } from "vigilant-jobs-client";

const VigilantContext = createContext<VigilantClient | null>(null);

export interface VigilantProviderProps {
  /** Either pass a config object and let the provider build the client... */
  config?: VigilantClientConfig;
  /** ...or pass an already-constructed client (e.g. to share one instance). */
  client?: VigilantClient;
  children: ReactNode;
}

/**
 * Wrap your app (or the relevant subtree) in this once:
 *
 * <VigilantProvider config={{ baseUrl: "https://api.yourapp.com" }}>
 *   <App />
 * </VigilantProvider>
 */
export function VigilantProvider({ config, client, children }: VigilantProviderProps) {
  const resolvedClient = useMemo(() => {
    if (client) return client;
    if (config) return new VigilantClient(config);
    throw new Error("VigilantProvider: pass either `config` or `client`.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, config?.baseUrl, config?.token]);

  return (
    <VigilantContext.Provider value={resolvedClient}>{children}</VigilantContext.Provider>
  );
}

/** Access the shared VigilantClient instance from context. */
export function useVigilantClient(): VigilantClient {
  const client = useContext(VigilantContext);
  if (!client) {
    throw new Error(
      "useVigilantClient: no VigilantClient found in context. Wrap your app in <VigilantProvider>."
    );
  }
  return client;
}
