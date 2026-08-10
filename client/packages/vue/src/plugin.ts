import { inject, provide, type App, type InjectionKey } from "vue";
import { VigilantClient, type VigilantClientConfig } from "vigilant-jobs-client";

const VIGILANT_CLIENT_KEY: InjectionKey<VigilantClient> = Symbol("vigilant-client");

/**
 * Install as a Vue plugin, once, at app creation:
 *
 * import { createApp } from "vue";
 * import { createVigilantPlugin } from "vigilant-jobs-vue";
 *
 * const app = createApp(App);
 * app.use(createVigilantPlugin({ baseUrl: "https://api.yourapp.com" }));
 */
export function createVigilantPlugin(configOrClient: VigilantClientConfig | VigilantClient) {
  const client =
    configOrClient instanceof VigilantClient
      ? configOrClient
      : new VigilantClient(configOrClient);

  return {
    install(app: App) {
      app.provide(VIGILANT_CLIENT_KEY, client);
    },
  };
}

/**
 * Alternative to the plugin: call this inside setup() (e.g. in a layout
 * or root component) to provide a client to descendants without touching
 * main.ts.
 */
export function provideVigilantClient(configOrClient: VigilantClientConfig | VigilantClient) {
  const client =
    configOrClient instanceof VigilantClient
      ? configOrClient
      : new VigilantClient(configOrClient);
  provide(VIGILANT_CLIENT_KEY, client);
  return client;
}

/** Access the shared VigilantClient instance from provide/inject. */
export function useVigilantClient(): VigilantClient {
  const client = inject(VIGILANT_CLIENT_KEY);
  if (!client) {
    throw new Error(
      "useVigilantClient: no VigilantClient provided. Call app.use(createVigilantPlugin(...)) " +
        "or provideVigilantClient(...) in a setup() higher in the tree."
    );
  }
  return client;
}
