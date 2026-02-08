/**
 * FileServiceContext: React Context for dependency injection
 *
 * Provides FileService implementation to the component tree.
 * Allows swapping implementations (Electron vs Web) at the app root
 * without changing any consuming components.
 */

import { createContext, useContext, ReactNode } from 'react';
import type { FileService } from '../core/services/FileService';

const FileServiceContext = createContext<FileService | null>(null);

interface FileServiceProviderProps {
  service: FileService;
  children: ReactNode;
}

/**
 * FileServiceProvider: Injects FileService into the component tree
 *
 * Usage:
 * ```tsx
 * const electronFileService = new ElectronFileService();
 *
 * <FileServiceProvider service={electronFileService}>
 *   <App />
 * </FileServiceProvider>
 * ```
 */
export const FileServiceProvider = ({ service, children }: FileServiceProviderProps) => {
  return (
    <FileServiceContext.Provider value={service}>
      {children}
    </FileServiceContext.Provider>
  );
};

/**
 * useFileService: Hook to access FileService from any component
 *
 * Usage:
 * ```tsx
 * const fileService = useFileService();
 * const result = await fileService.readFile(path);
 * ```
 *
 * @throws Error if used outside FileServiceProvider
 */
export const useFileService = (): FileService => {
  const service = useContext(FileServiceContext);
  if (!service) {
    throw new Error('useFileService must be used within FileServiceProvider');
  }
  return service;
};
