/**
 * TraceImageWindow component - Overlay window for trace images with opacity control
 * Simplified version of ChildWindow specialized for trace image overlays.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useEditorStore } from '@core/editor';
import './TraceImageWindow.css';

interface Props {
  traceId: string;
}

export const TraceImageWindow: React.FC<Props> = ({ traceId }) => {
  const rndRef = useRef<Rnd>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Get trace window state from store
  const windowState = useEditorStore((state) => state.traceImageWindows.get(traceId));
  const updateTraceImageWindow = useEditorStore((state) => state.updateTraceImageWindow);
  const raiseTraceImageWindow = useEditorStore((state) => state.raiseTraceImageWindow);
  const removeTraceImageWindow = useEditorStore((state) => state.removeTraceImageWindow);

  // Sync Rnd position/size when store changes externally
  useEffect(() => {
    if (!rndRef.current || !windowState) return;
    rndRef.current.updatePosition({ x: windowState.x, y: windowState.y });
    rndRef.current.updateSize({ width: windowState.width, height: windowState.height });
  }, [windowState?.x, windowState?.y, windowState?.width, windowState?.height]);

  // Manual title bar drag — bypasses react-rnd drag for precise 1:1 cursor tracking
  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left button, ignore all buttons
    if (e.button !== 0 || (e.target as HTMLElement).closest('.trace-close-btn, .trace-opacity-slider')) return;

    // Raise window to front on title bar interaction
    raiseTraceImageWindow(traceId);

    e.preventDefault();
    const rndEl = rndRef.current?.getSelfElement();
    if (!rndEl) return;

    const rect = rndEl.getBoundingClientRect();
    const parentRect = rndEl.parentElement?.getBoundingClientRect();
    if (!parentRect) return;

    // Current position relative to parent
    const origX = rect.left - parentRect.left;
    const origY = rect.top - parentRect.top;

    dragRef.current = { startX: e.clientX, startY: e.clientY, origX, origY };

    const contentEl = rndEl.querySelector('.trace-image-content') as HTMLElement;
    if (contentEl) contentEl.style.pointerEvents = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !rndRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      let newX = dragRef.current.origX + dx;
      let newY = dragRef.current.origY + dy;

      // Clamp to parent bounds
      const ws = useEditorStore.getState().traceImageWindows.get(traceId);
      if (ws && parentRect) {
        const maxX = parentRect.width - ws.width;
        const maxY = parentRect.height - ws.height;
        newX = Math.max(0, Math.min(maxX, newX));
        newY = Math.max(0, Math.min(maxY, newY));
      }

      rndRef.current.updatePosition({ x: newX, y: newY });
    };

    const handleMouseUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (contentEl) contentEl.style.pointerEvents = '';

      if (!dragRef.current || !rndRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      let newX = dragRef.current.origX + dx;
      let newY = dragRef.current.origY + dy;

      const ws = useEditorStore.getState().traceImageWindows.get(traceId);
      if (ws && parentRect) {
        const maxX = parentRect.width - ws.width;
        const maxY = parentRect.height - ws.height;
        newX = Math.max(0, Math.min(maxX, newX));
        newY = Math.max(0, Math.min(maxY, newY));
      }

      dragRef.current = null;
      updateTraceImageWindow(traceId, { x: newX, y: newY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [traceId, raiseTraceImageWindow, updateTraceImageWindow]);

  // Handle resize completion
  const handleResizeStop = useCallback((_e: any, _direction: any, ref: any, _delta: any, position: any) => {
    updateTraceImageWindow(traceId, {
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight
    });
  }, [traceId, updateTraceImageWindow]);

  // Handle opacity slider change
  const handleOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateTraceImageWindow(traceId, { opacity: Number(e.target.value) });
  }, [traceId, updateTraceImageWindow]);

  // Handle close button
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    removeTraceImageWindow(traceId);
  }, [traceId, removeTraceImageWindow]);

  // Handle slider mousedown to prevent drag
  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!windowState || windowState.isMinimized) return null;

  return (
    <Rnd
      ref={rndRef}
      default={{
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
      }}
      onResizeStop={handleResizeStop}
      bounds="parent"
      minWidth={100}
      minHeight={80}
      style={{ zIndex: windowState.zIndex, pointerEvents: 'none' }}
      disableDragging={true}
    >
      <div className="trace-image-window">
        <div className="trace-image-title-bar" onMouseDown={handleTitleBarMouseDown}>
          <div className="trace-image-title">{windowState.fileName}</div>
          <div className="trace-opacity-label">{windowState.opacity}%</div>
          <input
            type="range"
            min="0"
            max="100"
            value={windowState.opacity}
            onChange={handleOpacityChange}
            onMouseDown={handleSliderMouseDown}
            className="trace-opacity-slider"
            title="Opacity"
          />
          <button
            className="window-btn trace-close-btn"
            onClick={handleClose}
            title="Close"
          />
        </div>
        <div className="trace-image-content">
          <img
            src={windowState.imageSrc}
            alt={windowState.fileName}
            style={{ opacity: windowState.opacity / 100 }}
            draggable={false}
          />
        </div>
      </div>
    </Rnd>
  );
};
