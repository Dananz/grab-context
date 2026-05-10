const STORAGE_KEY = "react_grab_enabled";
const LEGACY_TOOLBAR_STATE_KEY = "react_grab_toolbar_state";

const DEBUG = true;
const log = (...args: unknown[]): void => {
  if (DEBUG) console.log("[grab-context/bg]", ...args);
};

// One-shot cleanup. Earlier versions of this extension synced the toolbar
// state through chrome.storage, which caused a runaway feedback loop with
// react-grab's in-page Toolbar component. The toolbar state now lives only
// in window.localStorage. Wipe the stale chrome.storage value so users on
// the previous version stop receiving its onChanged echoes.
chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.remove(LEGACY_TOOLBAR_STATE_KEY).then(() => {
    log("removed legacy chrome.storage key", LEGACY_TOOLBAR_STATE_KEY);
  });
});
chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.local.remove(LEGACY_TOOLBAR_STATE_KEY);
});

const getGlobalEnabled = async (): Promise<boolean> => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const enabled = result[STORAGE_KEY] ?? true;
  return enabled;
};

const setGlobalEnabled = async (enabled: boolean): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEY]: enabled });
};

const updateActionIcon = async (tabId: number, enabled: boolean): Promise<void> => {
  const title = enabled ? "Grab Context (Active)" : "Grab Context (Inactive)";
  const badgeText = enabled ? "" : "OFF";
  const badgeColor = "#FF40E0";

  await chrome.action.setTitle({ tabId, title });
  await chrome.action.setBadgeText({ tabId, text: badgeText });
  if (badgeText) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_STATE") {
    getGlobalEnabled().then((enabled) => {
      sendResponse({ enabled });
    });
    return true;
  }
  return false;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const currentEnabled = await getGlobalEnabled();
  const newEnabled = !currentEnabled;
  log("action.onClicked", { from: currentEnabled, to: newEnabled, tabId: tab.id });
  await setGlobalEnabled(newEnabled);

  // Update only the active tab's badge synchronously. Other tabs pick up the
  // new state from chrome.storage.onChanged in their bridge content script;
  // their badges refresh on next chrome.tabs.onUpdated. Iterating every tab
  // here previously blocked the action listener whenever a single content
  // script was unresponsive, making the toolbar icon appear "stuck."
  void updateActionIcon(tab.id, newEnabled);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    const enabled = await getGlobalEnabled();
    await updateActionIcon(tabId, enabled);
  }
});

export {};
