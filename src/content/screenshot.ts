// Screenshot plugin: registers a "Screenshot" action in react-grab's
// context menu/toolbar. When triggered the selected element's bounding rect
// is captured via chrome.tabs.captureVisibleTab in the background, cropped
// in-page, and written to the clipboard as a PNG.
//
// This is a content-script add-on, not part of the upstream react-grab
// package. The official Chrome extension ships an unpublished react-grab
// build that includes a screenshot plugin natively; we mirror its API by
// registering an external plugin against the public 0.1.29 release.

import type { ReactGrabAPI } from "react-grab";

const SCREENSHOT_PLUGIN = "grab-context-screenshot";
let installedOn: ReactGrabAPI | null = null;

interface CaptureResponse {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

const requestCapture = (): Promise<CaptureResponse> =>
  new Promise((resolve) => {
    // Bridge content script forwards CAPTURE_VISIBLE_TAB to the service worker.
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "__GRAB_CONTEXT_CAPTURE_RESPONSE__") {
        window.removeEventListener("message", listener);
        resolve(event.data.payload as CaptureResponse);
      }
    };
    window.addEventListener("message", listener);
    window.postMessage({ type: "__GRAB_CONTEXT_CAPTURE_REQUEST__" }, "*");
    // 8s safety timeout
    setTimeout(() => {
      window.removeEventListener("message", listener);
      resolve({ ok: false, error: "Capture timed out" });
    }, 8000);
  });

const cropDataUrl = (dataUrl: string, rect: DOMRect): Promise<Blob | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      // The captured image is at devicePixelRatio of the source tab. Crop
      // accordingly so the output matches the element's rendered size in CSS
      // pixels, but at native resolution so it's sharp.
      const dpr = window.devicePixelRatio || 1;
      const sx = Math.max(0, Math.floor(rect.left * dpr));
      const sy = Math.max(0, Math.floor(rect.top * dpr));
      const sw = Math.max(1, Math.floor(rect.width * dpr));
      const sh = Math.max(1, Math.floor(rect.height * dpr));

      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });

const writeBlobToClipboard = async (blob: Blob): Promise<boolean> => {
  // navigator.clipboard.write requires the page to be focused. After a user
  // gesture (the click that triggered the action) it works on https/localhost;
  // on http it may be blocked.
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
};

const captureElement = async (element: Element): Promise<{ ok: boolean; error?: string }> => {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return { ok: false, error: "Element has zero size" };
  }

  const response = await requestCapture();
  if (!response.ok || !response.dataUrl) {
    return { ok: false, error: response.error ?? "Capture failed" };
  }

  const blob = await cropDataUrl(response.dataUrl, rect);
  if (!blob) return { ok: false, error: "Crop failed" };

  const wrote = await writeBlobToClipboard(blob);
  if (!wrote) return { ok: false, error: "Clipboard write failed" };

  return { ok: true };
};

export const installScreenshotPlugin = (api: ReactGrabAPI): void => {
  if (installedOn === api) return;
  installedOn = api;
  api.registerPlugin({
    name: SCREENSHOT_PLUGIN,
    setup: () => ({
      actions: [
        {
          id: "screenshot",
          label: "Screenshot",
          shortcut: "S",
          showInToolbarMenu: true,
          onAction: (context: { elements?: Element[] }) => {
            const elements = context.elements ?? [];
            const target = elements[0];
            if (!target) return;
            void captureElement(target);
          },
        },
      ],
    }),
  });
};
