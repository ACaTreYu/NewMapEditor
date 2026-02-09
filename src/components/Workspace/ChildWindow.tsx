/**
 * ChildWindow component - Individual MDI window with title bar, drag, resize
 * Uses manual drag on title bar for precise cursor tracking.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { useEditorStore } from '@core/editor';
import { MapCanvas } from '../MapCanvas/MapCanvas';

interface Props {
  documentId: string;
  tilesetImage: HTMLImageElement | null;
  onClose: (docId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const ChildWindow: React.FC<Props> = ({ documentId, tilesetImage, onClose, onCursorMove }) => {
  const rndRef = useRef<Rnd>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Individual selectors
  const windowState = useEditorStore((state) => state.windowStates.get(documentId));
  const isActive = useEditorStore((state) => state.activeDocumentId === documentId);
  const document = useEditorStore((state) => state.documents.get(documentId));
  const setActiveDocument = useEditorStore((state) => state.setActiveDocument);
  const updateWindowState = useEditorStore((state) => state.updateWindowState);
  const raiseWindow = useEditorStore((state) => state.raiseWindow);

  // Compute window title from document
  const windowTitle = React.useMemo(() => {
    if (!document) return 'Untitled';
    const filename = document.filePath
      ? document.filePath.split(/[\\/]/).pop() || 'Untitled'
      : 'Untitled';
    const modified = document.map?.modified ? ' *' : '';
    return `${filename}${modified}`;
  }, [document]);

  // Sync Rnd position/size when store changes externally (arrangement commands)
  useEffect(() => {
    if (!rndRef.current || !windowState) return;
    rndRef.current.updatePosition({ x: windowState.x, y: windowState.y });
    rndRef.current.updateSize({ width: windowState.width, height: windowState.height });
  }, [windowState?.x, windowState?.y, windowState?.width, windowState?.height]);

  // Handle window activation on any click
  const handleMouseDown = useCallback(() => {
    if (!isActive) {
      setActiveDocument(documentId);
    } else {
      raiseWindow(documentId);
    }
  }, [documentId, isActive, setActiveDocument, raiseWindow]);

  // Manual title bar drag — bypasses react-rnd drag for precise 1:1 cursor tracking
  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left button, ignore close button clicks
    if (e.button !== 0 || (e.target as HTMLElement).closest('.window-close-btn')) return;

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

    const contentEl = rndEl.querySelector('.window-content') as HTMLElement;
    if (contentEl) contentEl.style.pointerEvents = 'none';

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !rndRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      let newX = dragRef.current.origX + dx;
      let newY = dragRef.current.origY + dy;

      // Clamp to parent bounds
      const ws = useEditorStore.getState().windowStates.get(documentId);
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

      const ws = useEditorStore.getState().windowStates.get(documentId);
      if (ws && parentRect) {
        const maxX = parentRect.width - ws.width;
        const maxY = parentRect.height - ws.height;
        newX = Math.max(0, Math.min(maxX, newX));
        newY = Math.max(0, Math.min(maxY, newY));
      }

      dragRef.current = null;
      updateWindowState(documentId, { x: newX, y: newY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [documentId, updateWindowState]);

  // Handle resize completion
  const handleResizeStop = useCallback((_e: any, _direction: any, ref: any, _delta: any, position: any) => {
    updateWindowState(documentId, {
      x: position.x,
      y: position.y,
      width: ref.offsetWidth,
      height: ref.offsetHeight
    });
  }, [documentId, updateWindowState]);

  // Handle close button
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(documentId);
  }, [documentId, onClose]);

  if (!windowState) return null;

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
      minWidth={400}
      minHeight={300}
      style={{ zIndex: windowState.zIndex }}
      onMouseDown={handleMouseDown}
      disableDragging={true}
    >
      <div className={`child-window ${isActive ? 'active' : 'inactive'}`}>
        <div className="window-title-bar" onMouseDown={handleTitleBarMouseDown}>
          <div className="window-title">{windowTitle}</div>
          <button
            className="window-close-btn"
            onClick={handleClose}
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="window-content">
          <MapCanvas tilesetImage={tilesetImage} onCursorMove={onCursorMove} documentId={documentId} />
        </div>
      </div>
    </Rnd>
  );
};
