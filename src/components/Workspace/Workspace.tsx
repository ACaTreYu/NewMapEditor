/**
 * Workspace component - MDI workspace container that manages child windows
 */

import React from 'react';
import { useEditorStore } from '@core/editor';
import { useShallow } from 'zustand/react/shallow';
import { ChildWindow } from './ChildWindow';
import './Workspace.css';

interface Props {
  tilesetImage: HTMLImageElement | null;
  onCloseDocument: (docId: string) => void;
  onCursorMove?: (x: number, y: number) => void;
}

export const Workspace: React.FC<Props> = ({ tilesetImage, onCloseDocument, onCursorMove }) => {
  const documentIds = useEditorStore(useShallow((state) => Array.from(state.documents.keys())));

  if (documentIds.length === 0) {
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
      {documentIds.map((id) => (
        <ChildWindow
          key={id}
          documentId={id}
          tilesetImage={tilesetImage}
          onClose={onCloseDocument}
          onCursorMove={onCursorMove}
        />
      ))}
    </div>
  );
};
