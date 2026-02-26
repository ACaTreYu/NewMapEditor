/**
 * Workspace component - MDI workspace container that manages child windows
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ChildWindow } from './ChildWindow';
import { MinimizedBar } from './MinimizedBar';
import { TraceImageWindow } from './TraceImageWindow';
import './Workspace.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  farplaneImage?: HTMLImageElement | null;
  customBgImage?: HTMLImageElement | null;
  onCloseDocument: (docId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const Workspace: React.FC<Props> = ({ tilesetImage, farplaneImage, customBgImage, onCloseDocument, onCursorMove }) => {
  const documentIds = useEditorStore(useShallow((state) => Array.from(state.documents.keys())));
  const minimizedDocIds = useEditorStore(useShallow((state) =>
    Array.from(state.documents.keys()).filter(id =>
      state.windowStates.get(id)?.isMinimized
    )
  ));
  const traceImageIds = useEditorStore(useShallow((state) => Array.from(state.traceImageWindows.keys())));

  // Show workspace even when no documents open (to allow trace images without documents)
  const hasContent = documentIds.length > 0 || traceImageIds.length > 0;

  if (!hasContent) {
    return (
      <div className="workspace empty">
        <div className="empty-workspace-message">
          <p>No documents open</p>
          <p>File &gt; New or File &gt; Open to begin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace">
      {minimizedDocIds.length > 0 && (
        <div className="minimized-bars-container">
          {minimizedDocIds.map((id) => (
            <MinimizedBar
              key={id}
              documentId={id}
              onClose={onCloseDocument}
            />
          ))}
        </div>
      )}
      {documentIds.map((id) => (
        <ChildWindow
          key={id}
          documentId={id}
          tilesetImage={tilesetImage}
          farplaneImage={farplaneImage}
          customBgImage={customBgImage}
          onClose={onCloseDocument}
          onCursorMove={onCursorMove}
        />
      ))}
      {traceImageIds.map((id) => (
        <TraceImageWindow key={id} traceId={id} />
      ))}
    </div>
  );
};
