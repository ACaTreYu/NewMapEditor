/**
 * BatchRenderDialog - Modal dialog for batch rendering all patches.
 *
 * Shows progress during rendering and a summary on completion.
 * Orchestrates the batch render: directory picker, executeBatchRender, cancel.
 * Reads all state from Zustand (no props).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '@core/editor';
import { executeBatchRender } from '@core/export/batchRenderer';
import './BatchRenderDialog.css';

export const BatchRenderDialog: React.FC = () => {
  const batchRendering = useEditorStore((s) => s.batchRendering);
  const batchProgress = useEditorStore((s) => s.batchProgress);
  const batchResult = useEditorStore((s) => s.batchResult);
  const updateBatchProgress = useEditorStore((s) => s.updateBatchProgress);
  const finishBatchRender = useEditorStore((s) => s.finishBatchRender);
  const closeBatchDialog = useEditorStore((s) => s.closeBatchDialog);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startedRef = useRef(false);

  // Orchestrate the batch render on mount
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      // Get map tiles from store
      const mapTiles = useEditorStore.getState().map?.tiles;
      if (!mapTiles) {
        alert('No map loaded. Open or create a map first.');
        closeBatchDialog();
        return;
      }

      // Pick output directory
      const outputDir = await window.electronAPI.selectDirectory();
      if (!outputDir) {
        closeBatchDialog();
        return;
      }

      // Create abort controller for cancellation
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const result = await executeBatchRender(
          mapTiles,
          outputDir,
          (p) => updateBatchProgress(p.current, p.total, p.patchName),
          controller.signal
        );

        finishBatchRender(result.rendered, result.failed, result.errors);
      } catch (err) {
        finishBatchRender(0, 1, [(err as Error).message || 'Unknown error']);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  // Rendering in progress
  if (batchRendering && batchProgress) {
    const percent = batchProgress.total > 0
      ? Math.round((batchProgress.current / batchProgress.total) * 100)
      : 0;

    return (
      <div className="batch-render-overlay">
        <div className="batch-render-dialog">
          <div className="batch-render-title">Rendering Patches...</div>
          <div className="batch-render-progress-bar">
            <div
              className="batch-render-progress-fill"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="batch-render-status">
            {batchProgress.current + 1} / {batchProgress.total} &mdash; {batchProgress.currentPatch}
          </div>
          <div className="batch-render-buttons">
            <button className="batch-render-btn batch-render-btn-cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rendering complete -- show summary
  if (!batchRendering && batchResult) {
    const total = batchResult.rendered + batchResult.failed;

    return (
      <div className="batch-render-overlay">
        <div className="batch-render-dialog">
          <div className="batch-render-title">Batch Render Complete</div>
          <div className="batch-render-summary">
            {batchResult.rendered} of {total} patches rendered successfully
          </div>
          {batchResult.failed > 0 && (
            <div className="batch-render-errors">
              Failed: {batchResult.errors.join(', ')}
            </div>
          )}
          <div className="batch-render-buttons">
            <button className="batch-render-btn" onClick={closeBatchDialog}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Waiting state (directory picker open, loading...)
  return (
    <div className="batch-render-overlay">
      <div className="batch-render-dialog">
        <div className="batch-render-title">Batch Render All Patches</div>
        <div className="batch-render-status">Select output directory...</div>
      </div>
    </div>
  );
};
