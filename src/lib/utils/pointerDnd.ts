/**
 * Enkel dra-og-slipp basert på pekerhendelser (mus/touch) i stedet for nettleserens
 * innebygde HTML5 drag-and-drop. Tauri/WebView2 på Windows fanger opp HTML5-drag
 * (fil-slipp) og lar aldri `drop` nå siden, så vi tegner draget selv.
 *
 * Bruk: `use:pointerDrag={{ id, onDrop }}` på det som kan dras, og
 * `data-dnd-target={id}` på det som kan slippes på.
 */
export type PointerDragOptions = {
  /** Identifikator for kilden – sendes til onDrop. */
  id: string;
  enabled?: boolean;
  onStart?: () => void;
  /** Id-en til målet under pekeren (eller null). Kilden selv regnes ikke som mål. */
  onHover?: (targetId: string | null) => void;
  onDrop: (sourceId: string, targetId: string) => void;
  onEnd?: () => void;
};

const THRESHOLD_PX = 5;

export function pointerDrag(node: HTMLElement, initial: PointerDragOptions) {
  let opts = initial;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let ghost: HTMLElement | null = null;
  let offsetX = 0;
  let offsetY = 0;
  let hovered: string | null = null;

  const applyEnabled = () => {
    node.style.touchAction = opts.enabled === false ? "" : "none";
    node.style.userSelect = opts.enabled === false ? "" : "none";
  };
  applyEnabled();

  function targetAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const id = el?.closest<HTMLElement>("[data-dnd-target]")?.dataset.dndTarget ?? null;
    return id !== null && id !== opts.id ? id : null;
  }

  function setHover(id: string | null) {
    if (id === hovered) return;
    hovered = id;
    opts.onHover?.(id);
  }

  function startDrag(e: PointerEvent) {
    dragging = true;
    const rect = node.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    ghost = node.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${rect.width}px`,
      margin: "0",
      zIndex: "99999",
      pointerEvents: "none",
      opacity: "0.92",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      cursor: "grabbing",
    });
    document.body.appendChild(ghost);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    opts.onStart?.();
  }

  function move(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD_PX) return;
      startDrag(e);
    }
    if (ghost) {
      ghost.style.transform = `translate(${e.clientX - offsetX}px, ${e.clientY - offsetY}px)`;
    }
    setHover(targetAt(e.clientX, e.clientY));
  }

  function finish(drop: boolean) {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key);
    const target = hovered;
    const wasDragging = dragging;
    ghost?.remove();
    ghost = null;
    dragging = false;
    pointerId = -1;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    setHover(null);
    if (wasDragging) {
      if (drop && target) opts.onDrop(opts.id, target);
      opts.onEnd?.();
    }
  }

  const up = (e: PointerEvent) => {
    if (e.pointerId === pointerId) finish(true);
  };
  const cancel = (e: PointerEvent) => {
    if (e.pointerId === pointerId) finish(false);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === "Escape") finish(false);
  };

  function down(e: PointerEvent) {
    if (opts.enabled === false || e.button !== 0 || pointerId !== -1) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
  }

  node.addEventListener("pointerdown", down);

  return {
    update(next: PointerDragOptions) {
      opts = next;
      applyEnabled();
    },
    destroy() {
      node.removeEventListener("pointerdown", down);
      if (pointerId !== -1) finish(false);
    },
  };
}
