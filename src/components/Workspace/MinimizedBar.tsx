/**
 * MinimizedBar component - Compact bar for minimized MDI windows
 * Renders at top of workspace with document name, restore and close buttons.
 * Draggable within the workspace per user decision.
 */

import React, { useCallback, useRef } from 'react';
import { useEditorStore } from '@core/editor';

interface Props {
  documentId: string;
  onClose: (docId: string) => void;
}

export const MinimizedBar: React.FC<Props> = ({ documentId, onClose }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const windowState = useEditorStore((state) => state.windowStates.get(documentId));
  const isActive = useEditorStore((state) => state.activeDocumentId === documentId);
  const restoreWindow = useEditorStore((state) => state.restoreWindow);
  const setActiveDocument = useEditorStore((state) => state.setActiveDocument);

  // Compute display title
  const document = useEditorStore((state) => state.documents.get(documentId));
  const displayTitle = React.useMemo(() => {
    if (!document) return 'Untitled';
    const filename = document.filePath
      ? document.filePath.split(/[\/]/).pop() || 'Untitled'
      : 'Untitled';
    const modified = document.map?.modified ? ' *' : '';
    return `${filename}${modified}`;
  }, [document]);

  // Click title area to restore
  const handleRestore = useCallback(() => {
    restoreWindow(documentId);
  }, [documentId, restoreWindow]);

  // Close button
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(documentId);
  }, [documentId, onClose]);

  // Click bar to activate (set as active document without restoring)
  const handleBarClick = useCallback(() => {
    if (!isActive) {
      setActiveDocument(documentId);
    }
  }, [documentId, isActive, setActiveDocument]);

  // Draggable bar — manual drag implementation
  const handleBarMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('.window-btn')) return;

    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: bar.offsetLeft,
      origY: bar.offsetTop
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !barRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      barRef.current.style.position = 'absolute';
      barRef.current.style.left = `${dragRef.current.origX + dx}px`;
      barRef.current.style.top = `${dragRef.current.origY + dy}px`;
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  if (!windowState || !windowState.isMinimized) return null;

  return (
    <div
      ref={barRef}
      className={`minimized-bar ${isActive ? 'active' : ''}`}
      onMouseDown={handleBarMouseDown}
      onClick={handleBarClick}
    >
      <div className="minimized-title" onDoubleClick={handleRestore}>
        {displayTitle}
      </div>
      <div className="minimized-controls">
        <button
          className="window-btn window-restore-btn"
          onClick={(e) => { e.stopPropagation(); handleRestore(); }}
          title="Restore"
        />
        <button
          className="window-btn window-close-btn"
          onClick={handleClose}
          title="Close"
        />
      </div>
    </div>
  );
};
