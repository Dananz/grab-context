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

// Storm guard: if our own toolbar-state writes fire faster than this window,
// silently drop further saves so a runaway feedback loop can't lock the page
// or burn battery. Resets each second.
const STATE_SAVE_BURST_MS = 1000;
const STATE_SAVE_BURST_LIMIT = 12;
let stateSaveBurstStart = 0;
let stateSaveBurstCount = 0;
let stateSaveBurstWarned = false;
const isInStateSaveBurst = (): boolean => {
  const now = Date.now();
  if (now - stateSaveBurstStart > STATE_SAVE_BURST_MS) {
    stateSaveBurstStart = now;
    stateSaveBurstCount = 0;
    stateSaveBurstWarned = false;
  }
  stateSaveBurstCount++;
  if (stateSaveBurstCount > STATE_SAVE_BURST_LIMIT) {
    if (!stateSaveBurstWarned) {
      console.warn(
        "[grab-context/page] toolbar-state save storm detected; dropping further saves for this second",
      );
      stateSaveBurstWarned = true;
    }
    return true;
  }
  return false;
};

const turndownService = new TurndownService();

interface ToolbarState {
  edge: "top" | "bottom" | "left" | "right";
  ratio: number;
  collapsed: boolean;
  enabled: boolean;
}

let extensionApi: ReactGrabAPI | null = null;
let lastToolbarState: ToolbarState | null = null;
let isApplyingExternalState = false;
let stateChangeUnsubscribe: (() => void) | null = null;

const handleToolbarStateFromApi = (toolbarState: ToolbarState | null): void => {
  if (isApplyingExternalState) return;
  if (!toolbarState) return;
  if (
    lastToolbarState &&
    lastToolbarState.edge === toolbarState.edge &&
    lastToolbarState.ratio === toolbarState.ratio &&
    lastToolbarState.collapsed === toolbarState.collapsed &&
    lastToolbarState.enabled === toolbarState.enabled
  ) {
    return;
  }
  lastToolbarState = toolbarState;
  if (isInStateSaveBurst()) return;
  log("save toolbarState", toolbarState);
  window.postMessage({ type: "__REACT_GRAB_TOOLBAR_STATE_SAVE__", state: toolbarState }, "*");
};

const subscribeToStateChanges = (api: ReactGrabAPI): void => {
  if (stateChangeUnsubscribe) {
    stateChangeUnsubscribe();
  }
  stateChangeUnsubscribe = api.onToolbarStateChange((state) => {
    handleToolbarStateFromApi(state);
  });
};

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
  subscribeToStateChanges(api);
  forceAutoCopyDefaultAction(api);
  return api;
};

const forceAutoCopyDefaultAction = (api: ReactGrabAPI): void => {
  const current = api.getToolbarState();
  if (current?.defaultAction === AUTO_COPY_ACTION_ID) return;
  // Run the API mutation outside the guard so the resulting save propagates
  // through the bridge to chrome.storage. Otherwise our preferred default
  // action stays in react-grab's localStorage but never overrides the older
  // value persisted in chrome.storage, and the next page load resets it.
  api.setToolbarState({ defaultAction: AUTO_COPY_ACTION_ID });
  const next = api.getToolbarState();
  if (next) {
    log("force defaultAction=copy -> persist", next);
    window.postMessage({ type: "__REACT_GRAB_TOOLBAR_STATE_SAVE__", state: next }, "*");
  }
};

const getActiveApi = (): ReactGrabAPI | null => {
  return extensionApi ?? window.__REACT_GRAB__ ?? null;
};

const initializeReactGrab = (): Promise<ReactGrabAPI | null> => {
  const activeApi = getActiveApi();
  if (activeApi) {
    extensionApi = activeApi;
    return Promise.resolve(activeApi);
  }

  if (isLocalhost) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const delayedApi = getActiveApi();
        if (delayedApi) {
          extensionApi = delayedApi;
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
  subscribeToStateChanges(pageApi);
});

// NOTE: previous versions called api.activate() here so the cursor armed
// immediately on toolbar-icon click. That triggered react-grab's
// wasActivatedByToggle path, which deactivates the picker after every copy
// and, combined with focus-loss handlers + chrome.storage echoes, caused a
// runaway state cycle. Reverted to upstream-style enable/disable only — the
// user clicks the in-page grab button to start picking.
const handleToggle = async (enabled: boolean): Promise<void> => {
  log("handleToggle", { enabled });
  await initializeReactGrab();
  const api = getActiveApi();
  if (!api) return;
  if (api.isEnabled() !== enabled) {
    api.setEnabled(enabled);
  }
};

const handleToolbarStateChange = async (state: ToolbarState): Promise<void> => {
  if (isApplyingExternalState) return;

  await initializeReactGrab();
  const api = getActiveApi();
  if (api) {
    isApplyingExternalState = true;
    api.setToolbarState(state);
    isApplyingExternalState = false;
  }
};

window.addEventListener("message", (event: MessageEvent) => {
  if (event.data?.type === "__REACT_GRAB_EXTENSION_TOGGLE__") {
    void handleToggle(event.data.enabled);
  }

  if (event.data?.type === "__REACT_GRAB_TOOLBAR_STATE_CHANGE__") {
    void handleToolbarStateChange(event.data.state);
  }
});

interface InitialState {
  enabled: boolean;
  toolbarState: ToolbarState | null;
}

const queryInitialState = (): Promise<InitialState> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ enabled: true, toolbarState: null });
    }, STATE_QUERY_TIMEOUT_MS);

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "__REACT_GRAB_STATE_RESPONSE__") {
        clearTimeout(timeout);
        window.removeEventListener("message", handler);
        resolve({
          enabled: event.data.enabled ?? true,
          toolbarState: event.data.toolbarState ?? null,
        });
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "__REACT_GRAB_QUERY_STATE__" }, "*");
  });
};

const startup = async (): Promise<void> => {
  const initialState = await queryInitialState();
  const api = await initializeReactGrab();

  if (api) {
    if (initialState.toolbarState) {
      isApplyingExternalState = true;
      api.setToolbarState(initialState.toolbarState);
      isApplyingExternalState = false;
    } else if (!initialState.enabled) {
      api.setEnabled(false);
    }
    forceAutoCopyDefaultAction(api);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void startup();
  });
} else {
  void startup();
}
