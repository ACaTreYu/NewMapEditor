/**
 * ChildWindow component - Individual MDI window with title bar, drag, resize
 */

import React, { useCallback } from 'react';
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
  // Individual selectors (1-3 fields)
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

  // Handle window activation
  const handleMouseDown = useCallback(() => {
    if (!isActive) {
      setActiveDocument(documentId);
    } else {
      // Still raise to front even if already active (brings to front on click)
      raiseWindow(documentId);
    }
  }, [documentId, isActive, setActiveDocument, raiseWindow]);

  // Handle drag completion
  const handleDragStop = useCallback((_e: any, d: any) => {
    updateWindowState(documentId, { x: d.x, y: d.y });
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
    e.stopPropagation(); // Prevent focus change
    onClose(documentId);
  }, [documentId, onClose]);

  if (!windowState) return null;

  return (
    <Rnd
      size={{ width: windowState.width, height: windowState.height }}
      position={{ x: windowState.x, y: windowState.y }}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      bounds="parent"
      minWidth={400}
      minHeight={300}
      style={{ zIndex: windowState.zIndex }}
      onMouseDown={handleMouseDown}
      dragHandleClassName="window-title-bar"
    >
      <div className={`child-window ${isActive ? 'active' : 'inactive'}`}>
        <div className="window-title-bar">
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
