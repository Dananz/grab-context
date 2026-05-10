// This script runs in ISOLATED world and bridges chrome.* APIs to MAIN world.
//
// Scope: only the global enable/disable flag (`react_grab_enabled`) is
// synchronized via chrome.storage. The toolbar's UI state (edge, ratio,
// collapsed, defaultAction) is NOT mirrored here — react-grab already
// persists it in window.localStorage per origin, which is the correct scope
// for a per-origin UI preference.
//
// An earlier version of this bridge synced the toolbar state across tabs via
// chrome.storage. That created a feedback loop: applying an external toolbar
// state to react-grab causes the in-page Toolbar component to re-emit its
// own state in a microtask, which the bridge wrote back to chrome.storage,
// which fired storage.onChanged in every tab including this one, which
// applied it again, and so on. The loop became unbreakable once two tabs
// were oscillating because each tab's dedup couldn't suppress the other
// tab's writes. Removing the round-trip kills the loop at the source.

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
    chrome.storage.local.get(["react_grab_enabled"], (result) => {
      const enabled = result.react_grab_enabled ?? true;
      window.postMessage(
        {
          type: "__REACT_GRAB_STATE_RESPONSE__",
          enabled,
          toolbarState: null,
        },
        "*",
      );
    });
  }
});

export {};
