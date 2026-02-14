/**
 * RulerNotepadPanel - Measurement log panel for pinned ruler measurements
 */

import React, { useState } from 'react';
import { useEditorStore } from '@core/editor';
import { formatMeasurement } from '@/utils/measurementFormatter';
import './RulerNotepadPanel.css';

export const RulerNotepadPanel: React.FC = () => {
  const pinnedMeasurements = useEditorStore(state => state.pinnedMeasurements);
  const unpinMeasurement = useEditorStore(state => state.unpinMeasurement);
  const updateMeasurementLabel = useEditorStore(state => state.updateMeasurementLabel);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditStart = (id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
  };

  const handleEditSave = () => {
    if (editingId === null) return;
    const trimmed = editValue.trim();
    updateMeasurementLabel(editingId, trimmed);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (editingId === id) {
      setEditingId(null);
    }
    unpinMeasurement(id);
  };

  const formatTimestamp = (id: string): string => {
    const timestamp = parseInt(id);
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCopyAll = () => {
    const lines = pinnedMeasurements.map(p => {
      const timestamp = formatTimestamp(p.id);
      const measurement = formatMeasurement(p.measurement);
      const label = p.label ? ` - ${p.label}` : '';
      return `[${timestamp}] ${measurement}${label}`;
    });
    const text = lines.join('\n');
    window.electronAPI.writeClipboard(text);
  };

  return (
    <div className="ruler-notepad-panel">
      <div className="notepad-header">
        <span>Measurements</span>
        {pinnedMeasurements.length > 0 && (
          <button
            className="notepad-copy-btn"
            onClick={handleCopyAll}
            title="Copy all to clipboard"
          >
            Copy
          </button>
        )}
      </div>

      {pinnedMeasurements.length === 0 ? (
        <div className="notepad-empty-state">
          <p>
            Press <kbd>P</kbd> to pin measurements
          </p>
        </div>
      ) : (
        <div className="notepad-entries">
          {pinnedMeasurements.map(p => (
            <div key={p.id} className="notepad-entry">
              <div className="entry-header">
                <span className="entry-timestamp">{formatTimestamp(p.id)}</span>
                <button
                  className="entry-delete-btn"
                  onClick={() => handleDelete(p.id)}
                  title="Remove"
                >
                  ×
                </button>
              </div>
              <div className="entry-value">{formatMeasurement(p.measurement)}</div>
              {editingId === p.id ? (
                <input
                  className="entry-label-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleEditSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditSave();
                    } else if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  autoFocus
                  placeholder="Add note..."
                />
              ) : (
                <div
                  className={`entry-label${p.label ? '' : ' entry-label-placeholder'}`}
                  onClick={() => handleEditStart(p.id, p.label || '')}
                >
                  {p.label || 'Add note...'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
