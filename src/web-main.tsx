/**
 * Web entry point for AC Map Editor
 *
 * Uses browser-native File API and pako for zlib instead of Electron IPC.
 * Installs a shim for window.electronAPI to handle direct calls in App.tsx.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FileServiceProvider } from './contexts/FileServiceContext';
import { WebFileService } from './adapters/web/WebFileService';
import { installWebElectronShim } from './adapters/web/WebElectronShim';

// Install browser shim for window.electronAPI before React mounts
installWebElectronShim();

const fileService = new WebFileService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FileServiceProvider service={fileService}>
      <App />
    </FileServiceProvider>
  </React.StrictMode>
);
