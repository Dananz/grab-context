// This script runs in ISOLATED world and bridges chrome.runtime messages to MAIN world.

const DEBUG = true;
const log = (...args: unknown[]): void => {
  if (DEBUG) console.log("[grab-context/bridge]", ...args);
};

chrome.storage.onChanged.addListener((changes) => {
  if (changes.react_grab_enabled) {
    const newEnabled = changes.react_grab_enabled.newValue ?? true;
    log("storage.onChanged enabled ->", newEnabled);
    window.postMessage({ type: "__REACT_GRAB_EXTENSION_TOGGLE__", enabled: newEnabled }, "*");
  }

  if (changes.react_grab_toolbar_state) {
    const newState = changes.react_grab_toolbar_state.newValue;
    if (newState) {
      log("storage.onChanged toolbarState ->", newState);
      window.postMessage({ type: "__REACT_GRAB_TOOLBAR_STATE_CHANGE__", state: newState }, "*");
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REACT_GRAB_TOGGLE") {
    log("runtime.onMessage REACT_GRAB_TOGGLE ->", message.enabled);
    window.postMessage({ type: "__REACT_GRAB_EXTENSION_TOGGLE__", enabled: message.enabled }, "*");
    sendResponse({ success: true });
  }

  if (message.type === "GET_STATE") {
    sendResponse({ enabled: true });
  }

  return true;
});

window.addEventListener("message", (event) => {
  if (event.data?.type === "__REACT_GRAB_QUERY_STATE__") {
    chrome.storage.local.get(["react_grab_enabled", "react_grab_toolbar_state"], (result) => {
      const enabled = result.react_grab_enabled ?? true;
      const toolbarState = result.react_grab_toolbar_state ?? null;

      window.postMessage(
        {
          type: "__REACT_GRAB_STATE_RESPONSE__",
          enabled,
          toolbarState,
        },
        "*",
      );
    });
  }

  if (event.data?.type === "__REACT_GRAB_TOOLBAR_STATE_SAVE__") {
    log("page -> storage.set toolbarState", event.data.state);
    chrome.storage.local.set({ react_grab_toolbar_state: event.data.state });
  }
});

export {};
