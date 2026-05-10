import { init } from "react-grab/core";
import type { Options, ReactGrabAPI } from "react-grab";
import TurndownService from "turndown";
import { LOCALHOST_INIT_DELAY_MS, STATE_QUERY_TIMEOUT_MS } from "../constants.js";

declare global {
  interface Window {
    __REACT_GRAB__?: ReactGrabAPI;
  }
}

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname.endsWith(".localhost");

// Auto-copy on click: skip the default "comment" prompt and run the built-in
// copy action immediately when an element is clicked.
const AUTO_COPY_ACTION_ID = "copy";

const DEBUG = true;
const log = (...args: unknown[]): void => {
  if (DEBUG) console.log("[grab-context/page]", ...args);
};

const turndownService = new TurndownService();

let extensionApi: ReactGrabAPI | null = null;

const createExtensionApi = (): ReactGrabAPI => {
  const options: Options = { enabled: true };

  if (!isLocalhost) {
    options.getContent = (elements) => {
      const combinedHtml = elements.map((element) => element.outerHTML).join("\n\n");
      return turndownService.turndown(combinedHtml);
    };
  }

  const api = init(options);
  extensionApi = api;
  window.__REACT_GRAB__ = api;
  forceAutoCopyDefaultAction(api);
  return api;
};

// react-grab persists toolbar state in window.localStorage per origin. We
// just override the defaultAction once on first init so click-to-copy
// replaces the upstream click-to-comment behavior. We never read or write
// chrome.storage for the toolbar state — see bridge.ts for why.
const forceAutoCopyDefaultAction = (api: ReactGrabAPI): void => {
  const current = api.getToolbarState();
  if (current?.defaultAction === AUTO_COPY_ACTION_ID) return;
  log("force defaultAction=copy");
  api.setToolbarState({ defaultAction: AUTO_COPY_ACTION_ID });
};

const getActiveApi = (): ReactGrabAPI | null => {
  return extensionApi ?? window.__REACT_GRAB__ ?? null;
};

const initializeReactGrab = (): Promise<ReactGrabAPI | null> => {
  const activeApi = getActiveApi();
  if (activeApi) {
    extensionApi = activeApi;
    // Idempotent — getToolbarState returns null until something has been set,
    // so on the first call after picking up an existing API instance this
    // installs the click-to-copy default. No-op otherwise.
    forceAutoCopyDefaultAction(activeApi);
    return Promise.resolve(activeApi);
  }

  if (isLocalhost) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const delayedApi = getActiveApi();
        if (delayedApi) {
          extensionApi = delayedApi;
          forceAutoCopyDefaultAction(delayedApi);
          resolve(delayedApi);
          return;
        }
        // Fall back to creating our own API if the page never announced one.
        // Preserves the race window for pages that do install react-grab
        // themselves, while keeping the extension functional on dev servers
        // that don't.
        resolve(createExtensionApi());
      }, LOCALHOST_INIT_DELAY_MS);
    });
  }

  const createdApi = createExtensionApi();
  return Promise.resolve(createdApi);
};

window.addEventListener("react-grab:init", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const pageApi = event.detail;
  if (!pageApi) return;
  if (extensionApi && extensionApi !== pageApi) {
    extensionApi.dispose();
  }
  extensionApi = pageApi;
  window.__REACT_GRAB__ = pageApi;
  forceAutoCopyDefaultAction(pageApi);
});

const handleToggle = async (enabled: boolean): Promise<void> => {
  await initializeReactGrab();
  const api = getActiveApi();
  if (!api) return;
  log("handleToggle", { wanted: enabled, current: api.isEnabled() });
  if (api.isEnabled() !== enabled) {
    api.setEnabled(enabled);
  }
};

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "__REACT_GRAB_EXTENSION_TOGGLE__") {
    void handleToggle(event.data.enabled);
  }
});

interface InitialState {
  enabled: boolean;
}

const queryInitialState = (): Promise<InitialState> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ enabled: true });
    }, STATE_QUERY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "__REACT_GRAB_STATE_RESPONSE__") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve({ enabled: event.data.enabled ?? true });
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "__REACT_GRAB_QUERY_STATE__" }, "*");
  });
};

const startup = async (): Promise<void> => {
  const initialState = await queryInitialState();
  const api = await initializeReactGrab();
  if (!api) return;
  // Always reapply our preferred defaults. initializeReactGrab paths cover
  // most cases, but reapplying here is cheap and protects against any
  // ordering edge case where the override didn't run yet.
  forceAutoCopyDefaultAction(api);
  log("startup: applying initialState", initialState, {
    isEnabledBefore: api.isEnabled(),
  });
  if (api.isEnabled() !== initialState.enabled) {
    api.setEnabled(initialState.enabled);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void startup();
  });
} else {
  void startup();
}
