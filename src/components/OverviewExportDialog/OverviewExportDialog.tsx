import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useEditorStore } from '@core/editor';
import { findMainAreaBounds, fitBoundsToAspectRatio } from '@core/smart-crop';
import { renderOverview, BackgroundMode } from '@core/export/overviewRenderer';
import type { Bounds } from '@core/smart-crop';

const ASPECT_PRESETS = [
  { label: 'Auto', w: 0, h: 0 },
  { label: '1:1', w: 1, h: 1 },
  { label: '4:5', w: 4, h: 5 },
  { label: '4:3', w: 4, h: 3 },
  { label: '16:9', w: 16, h: 9 },
  { label: '9:16', w: 9, h: 16 },
] as const;
import './OverviewExportDialog.css';

export interface OverviewExportDialogHandle {
  open: () => void;
}

type CropMode = 'full' | 'smart' | 'selection';
type BgType = 'farplane' | 'transparent' | 'classic' | 'color' | 'image';

interface Props {
  tilesetImage: HTMLImageElement | null;
  farplaneImage: HTMLImageElement | null;
}

export const OverviewExportDialog = forwardRef<OverviewExportDialogHandle, Props>(
  ({ tilesetImage, farplaneImage }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);

    const [cropMode, setCropMode] = useState<CropMode>('smart');
    const [aspectIdx, setAspectIdx] = useState(0); // 0 = Auto (no ratio forcing)
    const [bgType, setBgType] = useState<BgType>('farplane');
    const [customColor, setCustomColor] = useState('#000000');
    const [customImage, setCustomImage] = useState<HTMLImageElement | null>(null);
    const [customImageName, setCustomImageName] = useState('');
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [exporting, setExporting] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        setStatus(null);
        dialogRef.current?.showModal();
      }
    }));

    // Check if there's an active selection
    const hasSelection = useEditorStore((state) => {
      if (!state.activeDocumentId) return false;
      const doc = state.documents.get(state.activeDocumentId);
      return doc?.selection.active ?? false;
    });

    const handleBrowseImage = useCallback(async () => {
      const filePath = await window.electronAPI?.openImageDialog?.();
      if (!filePath) return;

      const res = await window.electronAPI.readFile(filePath);
      if (!res.success || !res.data) return;

      const ext = filePath.split('.').pop()?.toLowerCase() || 'png';
      const mimeMap: Record<string, string> = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        bmp: 'image/bmp', gif: 'image/gif', webp: 'image/webp',
      };
      const mime = mimeMap[ext] || 'image/png';

      const img = new Image();
      img.onload = () => {
        setCustomImage(img);
        setCustomImageName(filePath.split(/[\\/]/).pop() || 'image');
      };
      img.src = `data:${mime};base64,${res.data}`;
    }, []);

    const handleExport = useCallback(async () => {
      const state = useEditorStore.getState();
      if (!state.activeDocumentId) return;
      const doc = state.documents.get(state.activeDocumentId);
      if (!doc?.map || !tilesetImage) return;

      setExporting(true);
      setStatus(null);

      try {
        // Determine bounds
        let bounds: Bounds | null = null;

        if (cropMode === 'smart') {
          const result = findMainAreaBounds(doc.map.tiles);
          bounds = result.paddedBounds;
          if (!bounds) {
            setStatus({ type: 'error', message: 'No content tiles found for smart crop.' });
            setExporting(false);
            return;
          }
        } else if (cropMode === 'selection') {
          const sel = doc.selection;
          if (!sel.active) {
            setStatus({ type: 'error', message: 'No active selection. Use the SELECT tool first.' });
            setExporting(false);
            return;
          }
          bounds = {
            minX: Math.min(sel.startX, sel.endX),
            minY: Math.min(sel.startY, sel.endY),
            maxX: Math.max(sel.startX, sel.endX),
            maxY: Math.max(sel.startY, sel.endY),
          };
        }
        // cropMode === 'full' → bounds stays null (full 256x256)

        // Apply aspect ratio preset if selected (and we have bounds)
        const preset = ASPECT_PRESETS[aspectIdx];
        if (bounds && preset.w > 0 && preset.h > 0) {
          bounds = fitBoundsToAspectRatio(bounds, preset.w, preset.h);
        }

        // Determine background mode
        let background: BackgroundMode;
        switch (bgType) {
          case 'farplane':
            if (!farplaneImage) {
              setStatus({ type: 'error', message: 'No farplane image loaded. Load a patch with imgFarplane first.' });
              setExporting(false);
              return;
            }
            background = { type: 'farplane', image: farplaneImage };
            break;
          case 'transparent':
            background = { type: 'transparent' };
            break;
          case 'classic':
            background = { type: 'classic' };
            break;
          case 'color':
            background = { type: 'color', color: customColor };
            break;
          case 'image':
            if (!customImage) {
              setStatus({ type: 'error', message: 'No custom background image selected.' });
              setExporting(false);
              return;
            }
            background = { type: 'image', image: customImage };
            break;
          default:
            background = { type: 'transparent' };
        }

        // Build default filename from map name
        const mapName = doc.map.header.name || 'map';
        const safeName = mapName.replace(/[^a-zA-Z0-9_\-() ]/g, '_');
        const suffix = cropMode === 'smart' ? '_smart' : cropMode === 'selection' ? '_selection' : '';
        const defaultFilename = `${safeName}${suffix}.png`;

        // Open save dialog (PNG-specific)
        const savePath = await window.electronAPI?.savePngFileDialog?.(defaultFilename);
        if (!savePath) {
          setExporting(false);
          return; // User cancelled
        }

        // Render
        const canvas = renderOverview(doc.map.tiles, tilesetImage, bounds, background);

        // Convert to PNG blob → base64
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create PNG blob'));
          }, 'image/png');
        });

        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        // Write file via IPC
        const result = await window.electronAPI.writeFile(savePath, base64);
        if (result.success) {
          setStatus({ type: 'success', message: `Exported to ${savePath.split(/[\\/]/).pop()}` });
        } else {
          setStatus({ type: 'error', message: result.error || 'Failed to write file.' });
        }
      } catch (err) {
        setStatus({ type: 'error', message: (err as Error).message });
      } finally {
        setExporting(false);
      }
    }, [cropMode, aspectIdx, bgType, customColor, customImage, tilesetImage, farplaneImage]);

    const tryClose = () => {
      dialogRef.current?.close();
    };

    // Dragging
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

    const handleTitleBarMouseDown = useCallback((e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.dialog-close-button')) return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const rect = dialog.getBoundingClientRect();
      dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = ev.clientX - dragRef.current.startX;
        const dy = ev.clientY - dragRef.current.startY;
        dialog.style.margin = '0';
        dialog.style.left = `${dragRef.current.origX + dx}px`;
        dialog.style.top = `${dragRef.current.origY + dy}px`;
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }, []);

    return (
      <dialog ref={dialogRef} className="overview-export-dialog">
        <div className="dialog-title-bar" onMouseDown={handleTitleBarMouseDown}>
          <span className="dialog-title-text">Export Overview</span>
          <button type="button" className="dialog-close-button" onClick={tryClose}>&times;</button>
        </div>

        <div className="overview-export-content">
          {/* Crop Mode */}
          <div>
            <h3 className="section-heading">Crop Mode</h3>
            <div className="export-radio-group">
              <label className="export-radio-label">
                <input
                  type="radio"
                  name="crop"
                  checked={cropMode === 'full'}
                  onChange={() => setCropMode('full')}
                />
                Full Map (4096x4096)
              </label>

              <label className="export-radio-label">
                <input
                  type="radio"
                  name="crop"
                  checked={cropMode === 'smart'}
                  onChange={() => setCropMode('smart')}
                />
                Smart Crop (exclude holding pens)
              </label>

              <label className={`export-radio-label${!hasSelection ? ' disabled' : ''}`}>
                <input
                  type="radio"
                  name="crop"
                  checked={cropMode === 'selection'}
                  onChange={() => setCropMode('selection')}
                  disabled={!hasSelection}
                />
                Selected Area
              </label>
              {!hasSelection && (
                <span className="export-radio-hint">Use the SELECT tool to define a region first</span>
              )}
            </div>
          </div>

          {/* Aspect Ratio — only shown for Smart Crop / Selection */}
          {cropMode !== 'full' && (
            <div>
              <h3 className="section-heading">Aspect Ratio</h3>
              <div className="export-aspect-presets">
                {ASPECT_PRESETS.map((p, i) => (
                  <button
                    key={p.label}
                    type="button"
                    className={`export-aspect-btn${aspectIdx === i ? ' active' : ''}`}
                    onClick={() => setAspectIdx(i)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background */}
          <div>
            <h3 className="section-heading">Background</h3>
            <div className="export-select-row">
              <select
                className="export-select"
                value={bgType}
                onChange={(e) => setBgType(e.target.value as BgType)}
              >
                <option value="farplane">Farplane</option>
                <option value="transparent">Transparent</option>
                <option value="classic">Classic SEdit (Magenta)</option>
                <option value="color">Custom Color</option>
                <option value="image">Custom Image</option>
              </select>
            </div>

            {bgType === 'color' && (
              <div className="export-color-row">
                <label>Color:</label>
                <input
                  type="color"
                  className="export-color-input"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                />
                <input
                  type="text"
                  className="export-color-hex"
                  value={customColor}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomColor(v);
                  }}
                  maxLength={7}
                />
              </div>
            )}

            {bgType === 'image' && (
              <div className="export-browse-row">
                <button type="button" className="win95-button" onClick={handleBrowseImage}>
                  Browse...
                </button>
                <span className="export-browse-filename">
                  {customImageName || 'No image selected'}
                </span>
              </div>
            )}

            {bgType === 'farplane' && !farplaneImage && (
              <span className="export-radio-hint">No farplane loaded — will fall back to transparent</span>
            )}
          </div>

          {/* Status */}
          {status && (
            <div className={`export-status ${status.type}`}>
              {status.message}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="dialog-buttons">
          <button
            type="button"
            className="win95-button"
            onClick={handleExport}
            disabled={exporting || !tilesetImage}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button
            type="button"
            className="win95-button"
            onClick={tryClose}
          >
            Close
          </button>
        </div>
      </dialog>
    );
  }
);

OverviewExportDialog.displayName = 'OverviewExportDialog';
