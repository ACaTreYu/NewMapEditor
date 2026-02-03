import { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { SETTING_CATEGORIES } from '@core/map';
import './MapSettingsDialog.css';

export interface MapSettingsDialogHandle {
  open: () => void;
}

export const MapSettingsDialog = forwardRef<MapSettingsDialogHandle>((_, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [activeTab, setActiveTab] = useState(0);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal()
  }));

  const handleClose = () => {
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="map-settings-dialog">
      <div className="dialog-title-bar">
        Map Settings
      </div>
      <div className="dialog-content">
        <menu role="tablist" className="dialog-tabs">
          {SETTING_CATEGORIES.map((cat, i) => (
            <li
              key={cat}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
            >
              {cat}
            </li>
          ))}
        </menu>

        <div className="tab-content">
          {SETTING_CATEGORIES.map((cat, i) => (
            <div
              key={cat}
              role="tabpanel"
              hidden={activeTab !== i}
              className="tab-panel"
            >
              {/* Content filled in Plan 02 */}
              <p>Settings for {cat} tab</p>
            </div>
          ))}
        </div>

        <div className="dialog-buttons">
          <button className="win95-button" onClick={handleClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});

MapSettingsDialog.displayName = 'MapSettingsDialog';
