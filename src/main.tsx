import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { FileServiceProvider } from './contexts/FileServiceContext';
import { ElectronFileService } from './adapters/electron/ElectronFileService';

const fileService = new ElectronFileService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FileServiceProvider service={fileService}>
      <App />
    </FileServiceProvider>
  </React.StrictMode>
);
