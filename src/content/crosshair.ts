// Full-viewport crosshair overlay that follows the pointer while the picker
// is armed. Modeled after the official React Grab Chrome extension build,
// which renders thin horizontal + vertical guide lines through the cursor.
// The public react-grab@0.1.29 npm package only sets `cursor: crosshair`,
// the visible guide lines aren't part of it. Implemented here as our own
// content-script overlay.

const HOST_ATTR = "data-grab-context-crosshair";
const LINE_COLOR = "rgba(255, 64, 224, 0.55)"; // matches react-grab brand pink
const LINE_THICKNESS = 1; // CSS pixels

export class CrosshairOverlay {
  private host: HTMLDivElement | null = null;
  private hLine: HTMLDivElement | null = null;
  private vLine: HTMLDivElement | null = null;
  private active = false;
  private rafId = 0;
  private pendingX = -1;
  private pendingY = -1;
  private readonly onPointerMove: (event: PointerEvent) => void;
  private readonly onResize: () => void;

  constructor() {
    this.onPointerMove = (event) => {
      this.pendingX = event.clientX;
      this.pendingY = event.clientY;
      if (!this.rafId) this.rafId = requestAnimationFrame(() => this.flush());
    };
    this.onResize = () => this.flush();
  }

  show(): void {
    if (this.active) return;
    this.active = true;
    this.ensureMounted();
    document.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
    if (this.host) this.host.style.display = "";
  }

  hide(): void {
    if (!this.active) return;
    this.active = false;
    document.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("resize", this.onResize);
    if (this.host) this.host.style.display = "none";
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  destroy(): void {
    this.hide();
    if (this.host?.parentElement) this.host.parentElement.removeChild(this.host);
    this.host = null;
    this.hLine = null;
    this.vLine = null;
  }

  private flush(): void {
    this.rafId = 0;
    if (!this.active || !this.hLine || !this.vLine) return;
    if (this.pendingX < 0 || this.pendingY < 0) return;
    // Translate3d so the browser composites on the GPU instead of repainting.
    this.hLine.style.transform = `translate3d(0, ${this.pendingY - LINE_THICKNESS / 2}px, 0)`;
    this.vLine.style.transform = `translate3d(${this.pendingX - LINE_THICKNESS / 2}px, 0, 0)`;
  }

  private ensureMounted(): void {
    const existing = document.querySelector<HTMLDivElement>(`[${HOST_ATTR}]`);
    if (existing) {
      this.host = existing;
      this.hLine = existing.querySelector<HTMLDivElement>("[data-axis='h']");
      this.vLine = existing.querySelector<HTMLDivElement>("[data-axis='v']");
      return;
    }

    const host = document.createElement("div");
    host.setAttribute(HOST_ATTR, "true");
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483646", // 1 below react-grab's overlay so labels stay on top
      contain: "strict",
    });

    const hLine = document.createElement("div");
    hLine.dataset.axis = "h";
    Object.assign(hLine.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "100vw",
      height: `${LINE_THICKNESS}px`,
      background: LINE_COLOR,
      willChange: "transform",
    });

    const vLine = document.createElement("div");
    vLine.dataset.axis = "v";
    Object.assign(vLine.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${LINE_THICKNESS}px`,
      height: "100vh",
      background: LINE_COLOR,
      willChange: "transform",
    });

    host.appendChild(hLine);
    host.appendChild(vLine);

    if (document.body) {
      document.body.appendChild(host);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => document.body?.appendChild(host),
        { once: true },
      );
    }

    this.host = host;
    this.hLine = hLine;
    this.vLine = vLine;
  }
}
