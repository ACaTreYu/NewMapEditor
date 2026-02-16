/**
 * RulerNotepadPanel - Tabbed panel with Notepad and Measurements tabs
 * Auto-switches to Measurements when ruler measurements are pinned
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@core/editor';
import { RulerMode } from '@core/editor/slices/globalSlice';
import { ToolType } from '@core/map';
import { formatMeasurement } from '@/utils/measurementFormatter';
import { LuEye, LuEyeOff } from 'react-icons/lu';
import './RulerNotepadPanel.css';

type TabId = 'notepad' | 'measurements';

export const RulerNotepadPanel: React.FC = () => {
  const pinnedMeasurements = useEditorStore(state => state.pinnedMeasurements);
  const unpinMeasurement = useEditorStore(state => state.unpinMeasurement);
  const updateMeasurementLabel = useEditorStore(state => state.updateMeasurementLabel);
  const toggleMeasurementVisibility = useEditorStore(state => state.toggleMeasurementVisibility);
  const pinMeasurement = useEditorStore(state => state.pinMeasurement);
  const setRulerMeasurement = useEditorStore(state => state.setRulerMeasurement);
  const rulerMeasurement = useEditorStore(state => state.rulerMeasurement);
  const currentTool = useEditorStore(state => state.currentTool);
  const rulerMode = useEditorStore(state => state.rulerMode);

  const [activeTab, setActiveTab] = useState<TabId>('notepad');
  const [notepadText, setNotepadText] = useState('');
  const prevCountRef = useRef(pinnedMeasurements.length);

  // Auto-switch to measurements tab when a new measurement is pinned
  useEffect(() => {
    if (pinnedMeasurements.length > prevCountRef.current) {
      setActiveTab('measurements');
    }
    prevCountRef.current = pinnedMeasurements.length;
  }, [pinnedMeasurements.length]);

  const isPathActive = currentTool === ToolType.RULER &&
    rulerMode === RulerMode.PATH &&
    rulerMeasurement?.mode === RulerMode.PATH &&
    (rulerMeasurement.waypoints?.length ?? 0) >= 2;

  const handleSetPath = () => {
    pinMeasurement();
    setRulerMeasurement(null);
    window.dispatchEvent(new Event('ruler-path-complete'));
  };

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

  // Toggle all measurements visibility
  const allVisible = pinnedMeasurements.length > 0 && pinnedMeasurements.every(p => p.visible);
  const handleToggleAll = () => {
    const newVisible = !allVisible;
    pinnedMeasurements.forEach(p => {
      if (p.visible !== newVisible) {
        toggleMeasurementVisibility(p.id);
      }
    });
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

  const buildExportText = () => {
    const lines = pinnedMeasurements.map(p => {
      const timestamp = formatTimestamp(p.id);
      const measurement = formatMeasurement(p.measurement);
      const label = p.label ? ` - ${p.label}` : '';
      return `[${timestamp}] ${measurement}${label}`;
    });
    return lines.join('\n');
  };

  const handleCopyAll = () => {
    window.electronAPI.writeClipboard(buildExportText());
  };

  const handleExport = async () => {
    const filePath = await window.electronAPI.saveTextFileDialog();
    if (!filePath) return;
    const text = buildExportText();
    await window.electronAPI.writeTextFile(filePath, text);
  };

  const handleNotepadCopy = () => {
    if (notepadText.trim()) {
      window.electronAPI.writeClipboard(notepadText);
    }
  };

  const handleNotepadExport = async () => {
    const filePath = await window.electronAPI.saveTextFileDialog();
    if (!filePath) return;
    await window.electronAPI.writeTextFile(filePath, notepadText);
  };

  return (
    <div className="ruler-notepad-panel">
      {/* Tab bar */}
      <div className="notepad-tab-bar">
        <button
          className={`notepad-tab ${activeTab === 'notepad' ? 'active' : ''}`}
          onClick={() => setActiveTab('notepad')}
        >
          Notepad
        </button>
        <button
          className={`notepad-tab ${activeTab === 'measurements' ? 'active' : ''}`}
          onClick={() => setActiveTab('measurements')}
        >
          Measurements{pinnedMeasurements.length > 0 ? ` (${pinnedMeasurements.length})` : ''}
        </button>
      </div>

      {/* Notepad tab content */}
      {activeTab === 'notepad' && (
        <div className="notepad-tab-content">
          {notepadText.trim().length > 0 && (
            <div className="notepad-header">
              <div className="notepad-header-actions">
                <button className="notepad-action-btn" onClick={handleNotepadExport} title="Export to file">
                  Export
                </button>
                <button className="notepad-action-btn" onClick={handleNotepadCopy} title="Copy all to clipboard">
                  Copy
                </button>
              </div>
            </div>
          )}
          <textarea
            className="notepad-textarea"
            value={notepadText}
            onChange={(e) => setNotepadText(e.target.value)}
            placeholder="Type notes here..."
            spellCheck={false}
          />
        </div>
      )}

      {/* Measurements tab content */}
      {activeTab === 'measurements' && (
        <div className="notepad-tab-content">
          {isPathActive && (
            <button className="set-path-panel-btn" onClick={handleSetPath} title="Pin this path to notepad (Enter)">
              Set Path
            </button>
          )}

          {/* Header with actions */}
          {pinnedMeasurements.length > 0 && (
            <div className="notepad-header">
              <div className="notepad-header-actions">
                <button
                  className="notepad-vis-all-btn"
                  onClick={handleToggleAll}
                  title={allVisible ? 'Hide all measurements' : 'Show all measurements'}
                >
                  {allVisible ? <LuEye size={12} /> : <LuEyeOff size={12} />}
                </button>
                <button className="notepad-action-btn" onClick={handleExport} title="Export to file">
                  Export
                </button>
                <button className="notepad-action-btn" onClick={handleCopyAll} title="Copy all to clipboard">
                  Copy
                </button>
              </div>
            </div>
          )}

          {pinnedMeasurements.length === 0 ? (
            <div className="notepad-empty-state">
              <p>
                Press <kbd>Enter</kbd> or click Set Path to pin
              </p>
            </div>
          ) : (
            <div className="notepad-entries">
              {pinnedMeasurements.map(p => (
                <div key={p.id} className={`notepad-entry${p.visible ? '' : ' entry-dimmed'}`}>
                  <div className="entry-header">
                    <span className="entry-timestamp">{formatTimestamp(p.id)}</span>
                    <div className="entry-actions">
                      <button
                        className={`entry-vis-btn${p.visible ? '' : ' entry-hidden'}`}
                        onClick={() => toggleMeasurementVisibility(p.id)}
                        title={p.visible ? 'Hide from map' : 'Show on map'}
                      >
                        {p.visible ? <LuEye size={12} /> : <LuEyeOff size={12} />}
                      </button>
                      <button
                        className="entry-delete-btn"
                        onClick={() => handleDelete(p.id)}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className={`entry-value${p.visible ? '' : ' entry-value-hidden'}`}>{formatMeasurement(p.measurement)}</div>
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
      )}
    </div>
  );
};
