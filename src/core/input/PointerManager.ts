/**
 * PointerManager — Unified input abstraction for mouse, touch, and pen.
 *
 * Replaces all MouseEvent handling with a gesture state machine that
 * disambiguates tool actions from navigation gestures in real-time.
 *
 * States:
 *   IDLE → SINGLE_DOWN (grace period) → TOOL_ACTIVE or NAVIGATING
 *   TOOL_ACTIVE → NAVIGATING (if 2nd pointer arrives, cancel tool)
 *   NAVIGATING → IDLE (all pointers up)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PointerState {
  id: number;
  type: 'mouse' | 'touch' | 'pen';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  button: number;
}

export enum GesturePhase {
  IDLE = 'IDLE',
  SINGLE_DOWN = 'SINGLE_DOWN',
  TOOL_ACTIVE = 'TOOL_ACTIVE',
  NAVIGATING = 'NAVIGATING',
  LONG_PRESS_FIRED = 'LONG_PRESS_FIRED',
}

export interface PointerManagerCallbacks {
  /** Single-pointer tool action started (left-click or single touch) */
  onToolDown: (x: number, y: number, button: number, pointerType: string, altKey: boolean) => void;
  /** Tool pointer moved */
  onToolMove: (x: number, y: number) => void;
  /** Tool pointer released — commit action */
  onToolUp: () => void;
  /** Tool action cancelled (e.g. 2nd pointer arrived mid-stroke) */
  onToolCancel: () => void;

  /** Pan started (middle-click, right-click, 2-finger drag) */
  onPanStart: (x: number, y: number) => void;
  /** Pan delta */
  onPanMove: (dx: number, dy: number) => void;
  /** Pan ended */
  onPanEnd: () => void;

  /** Pinch zoom (touch only) — centerX/Y in client coords, scaleDelta multiplicative */
  onZoom: (centerX: number, centerY: number, scaleDelta: number) => void;
  /** Mouse wheel zoom */
  onWheelZoom: (clientX: number, clientY: number, deltaY: number) => void;

  /** Two-finger tap → undo */
  onUndo: () => void;
  /** Three-finger tap → redo */
  onRedo: () => void;

  /** Long-press (500ms hold) → picker / context menu */
  onLongPress: (x: number, y: number) => void;

  /** Hover (mouse/pen only, no buttons pressed) */
  onHover: (x: number, y: number) => void;
  /** Pointer left the element */
  onLeave: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** ms to wait for a 2nd pointer before committing to tool action */
const GRACE_PERIOD_MS = 60;
/** px movement threshold to commit to tool during grace period */
const MOVE_THRESHOLD = 4;
/** ms for long-press detection */
const LONG_PRESS_MS = 500;
/** px max movement for long-press to still fire */
const LONG_PRESS_MOVE_LIMIT = 10;
/** ms max for multi-finger tap detection */
const TAP_TIME_LIMIT = 300;
/** px max movement for tap detection */
const TAP_MOVE_LIMIT = 15;

// ---------------------------------------------------------------------------
// PointerManager
// ---------------------------------------------------------------------------

export class PointerManager {
  private pointers = new Map<number, PointerState>();
  private phase: GesturePhase = GesturePhase.IDLE;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private cb: PointerManagerCallbacks;

  // Navigation state for 2-finger gestures
  private lastPinchDist = 0;
  private lastMidX = 0;
  private lastMidY = 0;

  // Pen mode: when pen is detected, touch events become navigation-only
  penModeActive = false;
  private penDetected = false;

  // Track alt key state for pan-via-alt detection
  private altKeyDown = false;

  constructor(callbacks: PointerManagerCallbacks) {
    this.cb = callbacks;
  }

  // -----------------------------------------------------------------------
  // Public API — call these from React onPointer* / onWheel handlers
  // -----------------------------------------------------------------------

  handlePointerDown(e: PointerEvent | React.PointerEvent, altKey?: boolean): void {
    const ptr = this.makePointer(e);
    this.pointers.set(ptr.id, ptr);

    // Track alt key
    this.altKeyDown = altKey ?? (e as any).altKey ?? false;

    // Pen auto-detection
    if (ptr.type === 'pen' && !this.penDetected) {
      this.penDetected = true;
      this.penModeActive = true;
    }

    // In pen mode, touch only navigates (palm rejection)
    const isTouchInPenMode = this.penModeActive && ptr.type === 'touch';

    const count = this.pointers.size;

    switch (this.phase) {
      case GesturePhase.IDLE: {
        // Desktop: middle/right click or alt+click → immediate pan
        if (ptr.type === 'mouse' && (ptr.button === 1 || ptr.button === 2 || this.altKeyDown)) {
          this.phase = GesturePhase.NAVIGATING;
          this.cb.onPanStart(ptr.currentX, ptr.currentY);
          return;
        }

        // Pen always goes straight to tool (no grace period needed)
        if (ptr.type === 'pen') {
          this.phase = GesturePhase.TOOL_ACTIVE;
          this.cb.onToolDown(ptr.currentX, ptr.currentY, ptr.button, ptr.type, this.altKeyDown);
          return;
        }

        // Touch in pen mode → navigate
        if (isTouchInPenMode) {
          this.phase = GesturePhase.NAVIGATING;
          this.cb.onPanStart(ptr.currentX, ptr.currentY);
          return;
        }

        // Single touch or left mouse click → grace period
        this.phase = GesturePhase.SINGLE_DOWN;
        this.startGraceTimer(ptr);
        this.startLongPressTimer(ptr);
        return;
      }

      case GesturePhase.SINGLE_DOWN: {
        // 2nd pointer arrived during grace → switch to navigating
        if (count >= 2) {
          this.clearGraceTimer();
          this.clearLongPressTimer();
          this.phase = GesturePhase.NAVIGATING;
          this.initPinchState();
          this.cb.onPanStart(this.lastMidX, this.lastMidY);
        }
        return;
      }

      case GesturePhase.TOOL_ACTIVE: {
        // 2nd pointer during tool → cancel tool, switch to navigating
        if (count >= 2) {
          this.cb.onToolCancel();
          this.phase = GesturePhase.NAVIGATING;
          this.initPinchState();
          this.cb.onPanStart(this.lastMidX, this.lastMidY);
        }
        return;
      }

      case GesturePhase.NAVIGATING:
        // Additional pointers during navigation — update pinch state
        if (count >= 2) {
          this.initPinchState();
        }
        return;

      case GesturePhase.LONG_PRESS_FIRED:
        // Ignore additional pointers after long-press
        return;
    }
  }

  handlePointerMove(e: PointerEvent | React.PointerEvent): void {
    const ptr = this.pointers.get(this.getPtrId(e));
    if (!ptr) {
      // Hover (no button pressed)
      if (this.phase === GesturePhase.IDLE) {
        this.cb.onHover(this.getX(e), this.getY(e));
      }
      return;
    }

    ptr.currentX = this.getX(e);
    ptr.currentY = this.getY(e);

    switch (this.phase) {
      case GesturePhase.SINGLE_DOWN: {
        // Check if movement exceeds threshold → commit to tool early
        const dx = ptr.currentX - ptr.startX;
        const dy = ptr.currentY - ptr.startY;
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
          this.clearGraceTimer();
          this.clearLongPressTimer();
          this.phase = GesturePhase.TOOL_ACTIVE;
          this.cb.onToolDown(ptr.startX, ptr.startY, ptr.button, ptr.type, this.altKeyDown);
          this.cb.onToolMove(ptr.currentX, ptr.currentY);
        }
        return;
      }

      case GesturePhase.TOOL_ACTIVE: {
        this.cb.onToolMove(ptr.currentX, ptr.currentY);
        return;
      }

      case GesturePhase.NAVIGATING: {
        if (this.pointers.size >= 2) {
          // Two-finger: pan + pinch
          const [p1, p2] = this.getTwoPointers();
          const midX = (p1.currentX + p2.currentX) / 2;
          const midY = (p1.currentY + p2.currentY) / 2;
          const dist = Math.hypot(p2.currentX - p1.currentX, p2.currentY - p1.currentY);

          // Pan
          const panDx = midX - this.lastMidX;
          const panDy = midY - this.lastMidY;
          if (Math.abs(panDx) > 0.5 || Math.abs(panDy) > 0.5) {
            this.cb.onPanMove(panDx, panDy);
          }

          // Pinch zoom
          if (this.lastPinchDist > 0) {
            const scale = dist / this.lastPinchDist;
            if (Math.abs(scale - 1) > 0.005) {
              this.cb.onZoom(midX, midY, scale);
            }
          }

          this.lastMidX = midX;
          this.lastMidY = midY;
          this.lastPinchDist = dist;
        } else {
          // Single-pointer pan (middle/right-click drag)
          this.cb.onPanMove(
            ptr.currentX - (this.lastMidX || ptr.startX),
            ptr.currentY - (this.lastMidY || ptr.startY),
          );
          this.lastMidX = ptr.currentX;
          this.lastMidY = ptr.currentY;
        }
        return;
      }

      case GesturePhase.LONG_PRESS_FIRED:
        // Ignore movement after long-press
        return;
    }
  }

  handlePointerUp(e: PointerEvent | React.PointerEvent): void {
    const id = this.getPtrId(e);
    const ptr = this.pointers.get(id);
    this.pointers.delete(id);

    const remaining = this.pointers.size;

    switch (this.phase) {
      case GesturePhase.SINGLE_DOWN: {
        // Released before grace expired → this is a click/tap
        this.clearGraceTimer();
        this.clearLongPressTimer();
        if (ptr) {
          // Fire as a quick tool down+up (click)
          this.cb.onToolDown(ptr.startX, ptr.startY, ptr.button, ptr.type, this.altKeyDown);
          this.cb.onToolUp();
        }
        this.phase = GesturePhase.IDLE;
        return;
      }

      case GesturePhase.TOOL_ACTIVE: {
        this.cb.onToolUp();
        this.phase = GesturePhase.IDLE;
        return;
      }

      case GesturePhase.NAVIGATING: {
        if (remaining === 0) {
          // Check for multi-finger tap (undo/redo)
          if (ptr && this.wasMultiFingerTap(ptr)) {
            // Already handled in wasMultiFingerTap
          } else {
            this.cb.onPanEnd();
          }
          this.phase = GesturePhase.IDLE;
          this.lastPinchDist = 0;
        } else if (remaining === 1) {
          // Went from 2→1 finger — continue as single-pointer pan
          const [sole] = [...this.pointers.values()];
          this.lastMidX = sole.currentX;
          this.lastMidY = sole.currentY;
          this.lastPinchDist = 0;
        } else {
          // Still 2+ pointers, recalculate pinch state
          this.initPinchState();
        }
        return;
      }

      case GesturePhase.LONG_PRESS_FIRED: {
        if (remaining === 0) {
          this.phase = GesturePhase.IDLE;
        }
        return;
      }
    }
  }

  handlePointerLeave(e: PointerEvent | React.PointerEvent): void {
    const id = this.getPtrId(e);
    this.pointers.delete(id);

    if (this.pointers.size === 0) {
      this.clearGraceTimer();
      this.clearLongPressTimer();

      if (this.phase === GesturePhase.TOOL_ACTIVE) {
        this.cb.onToolUp();
      } else if (this.phase === GesturePhase.NAVIGATING) {
        this.cb.onPanEnd();
      }
      this.phase = GesturePhase.IDLE;
      this.lastPinchDist = 0;
      this.cb.onLeave();
    }
  }

  handleWheel(e: WheelEvent | React.WheelEvent): void {
    // Prevent browser zoom/scroll
    e.preventDefault();
    this.cb.onWheelZoom((e as any).clientX, (e as any).clientY, (e as any).deltaY);
  }

  /** Call on contextmenu event to prevent default */
  handleContextMenu(e: Event): void {
    e.preventDefault();
  }

  // -----------------------------------------------------------------------
  // State queries
  // -----------------------------------------------------------------------

  getPhase(): GesturePhase { return this.phase; }
  getPointerCount(): number { return this.pointers.size; }
  isPenMode(): boolean { return this.penModeActive; }
  setPenMode(active: boolean): void { this.penModeActive = active; }

  /** Reset all state — call on unmount or when switching documents */
  reset(): void {
    this.clearGraceTimer();
    this.clearLongPressTimer();
    this.pointers.clear();
    this.phase = GesturePhase.IDLE;
    this.lastPinchDist = 0;
    this.lastMidX = 0;
    this.lastMidY = 0;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private makePointer(e: PointerEvent | React.PointerEvent): PointerState {
    return {
      id: this.getPtrId(e),
      type: (e as any).pointerType as 'mouse' | 'touch' | 'pen',
      startX: this.getX(e),
      startY: this.getY(e),
      currentX: this.getX(e),
      currentY: this.getY(e),
      startTime: performance.now(),
      button: (e as any).button ?? 0,
    };
  }

  private getPtrId(e: PointerEvent | React.PointerEvent): number {
    return (e as any).pointerId ?? 0;
  }

  private getX(e: PointerEvent | React.PointerEvent): number {
    return (e as any).clientX;
  }

  private getY(e: PointerEvent | React.PointerEvent): number {
    return (e as any).clientY;
  }

  private startGraceTimer(ptr: PointerState): void {
    this.clearGraceTimer();
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (this.phase === GesturePhase.SINGLE_DOWN) {
        // Grace expired with no 2nd pointer → commit to tool
        this.clearLongPressTimer();
        this.phase = GesturePhase.TOOL_ACTIVE;
        this.cb.onToolDown(ptr.startX, ptr.startY, ptr.button, ptr.type, this.altKeyDown);
      }
    }, GRACE_PERIOD_MS);
  }

  private clearGraceTimer(): void {
    if (this.graceTimer !== null) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  private startLongPressTimer(ptr: PointerState): void {
    this.clearLongPressTimer();
    this.longPressTimer = setTimeout(() => {
      this.longPressTimer = null;
      if (this.phase !== GesturePhase.SINGLE_DOWN && this.phase !== GesturePhase.TOOL_ACTIVE) return;

      const current = this.pointers.get(ptr.id);
      if (!current) return;

      const dx = current.currentX - current.startX;
      const dy = current.currentY - current.startY;
      if (Math.hypot(dx, dy) <= LONG_PRESS_MOVE_LIMIT) {
        // Long-press detected — fire picker
        if (this.phase === GesturePhase.TOOL_ACTIVE) {
          this.cb.onToolCancel();
        }
        this.phase = GesturePhase.LONG_PRESS_FIRED;
        this.cb.onLongPress(current.currentX, current.currentY);
      }
    }, LONG_PRESS_MS);
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private initPinchState(): void {
    if (this.pointers.size >= 2) {
      const [p1, p2] = this.getTwoPointers();
      this.lastMidX = (p1.currentX + p2.currentX) / 2;
      this.lastMidY = (p1.currentY + p2.currentY) / 2;
      this.lastPinchDist = Math.hypot(
        p2.currentX - p1.currentX,
        p2.currentY - p1.currentY,
      );
    }
  }

  private getTwoPointers(): [PointerState, PointerState] {
    const iter = this.pointers.values();
    return [iter.next().value!, iter.next().value!];
  }

  /**
   * Check if the just-released pointer was part of a multi-finger tap.
   * All pointers must have been brief (<300ms) and barely moved (<15px).
   */
  private wasMultiFingerTap(releasedPtr: PointerState): boolean {
    const now = performance.now();
    const elapsed = now - releasedPtr.startTime;
    if (elapsed > TAP_TIME_LIMIT) return false;

    const moved = Math.hypot(
      releasedPtr.currentX - releasedPtr.startX,
      releasedPtr.currentY - releasedPtr.startY,
    );
    if (moved > TAP_MOVE_LIMIT) return false;

    // We need to know how many fingers were down at peak.
    // Since we're in NAVIGATING, at least 2 were down.
    // If remaining === 0 and we had 2+ pointers, this was a 2-finger tap.
    // (3-finger tap would require tracking max pointer count)
    // For now: 2-finger tap = undo
    this.cb.onPanEnd(); // end the nav gesture cleanly
    this.cb.onUndo();
    return true;
  }
}
