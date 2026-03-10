import { useRef, useCallback, useEffect } from 'react';
import { PointerManager, PointerManagerCallbacks } from '../core/input/PointerManager';

/**
 * React hook wrapping PointerManager.
 *
 * Returns stable handler functions to attach to a canvas element's
 * onPointerDown/Move/Up/Leave and onWheel props, plus a ref to
 * the manager instance for state queries (pen mode, phase, etc.).
 *
 * Usage:
 *   const { handlers, managerRef } = usePointerManager(callbacks);
 *   <canvas {...handlers} />
 */
export function usePointerManager(callbacks: PointerManagerCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const managerRef = useRef<PointerManager | null>(null);

  if (!managerRef.current) {
    // Create manager with a proxy that always calls the latest callbacks
    const proxy: PointerManagerCallbacks = {
      onToolDown: (...args) => cbRef.current.onToolDown(...args),
      onToolMove: (...args) => cbRef.current.onToolMove(...args),
      onToolUp: () => cbRef.current.onToolUp(),
      onToolCancel: () => cbRef.current.onToolCancel(),
      onPanStart: (...args) => cbRef.current.onPanStart(...args),
      onPanMove: (...args) => cbRef.current.onPanMove(...args),
      onPanEnd: () => cbRef.current.onPanEnd(),
      onZoom: (...args) => cbRef.current.onZoom(...args),
      onWheelZoom: (...args) => cbRef.current.onWheelZoom(...args),
      onUndo: () => cbRef.current.onUndo(),
      onRedo: () => cbRef.current.onRedo(),
      onLongPress: (...args) => cbRef.current.onLongPress(...args),
      onHover: (...args) => cbRef.current.onHover(...args),
      onLeave: () => cbRef.current.onLeave(),
    };
    managerRef.current = new PointerManager(proxy);
  }

  // Reset manager on unmount
  useEffect(() => {
    return () => {
      managerRef.current?.reset();
    };
  }, []);

  const mgr = managerRef.current;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Capture this pointer so we get move/up even if it leaves the element
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    mgr.handlePointerDown(e);
  }, [mgr]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    mgr.handlePointerMove(e);
  }, [mgr]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    mgr.handlePointerUp(e);
  }, [mgr]);

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    // Only handle leave if this pointer isn't captured
    // (captured pointers fire pointerup, not pointerleave when released outside)
    if (!(e.target as HTMLElement).hasPointerCapture?.(e.pointerId)) {
      mgr.handlePointerLeave(e);
    }
  }, [mgr]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    mgr.handleWheel(e);
  }, [mgr]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onWheel,
    onContextMenu,
  };

  return { handlers, managerRef };
}
