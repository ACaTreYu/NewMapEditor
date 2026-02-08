# Phase 26: Portability Layer - Research

**Researched:** 2026-02-08
**Domain:** TypeScript adapter pattern, file I/O abstraction, cross-platform portability
**Confidence:** HIGH

## Summary

Phase 26 aims to extract Electron dependencies behind adapter interfaces to enable web portability of the map editor core. The current architecture has `window.electronAPI` calls scattered in App.tsx for file operations (dialogs, read/write) and zlib compression. The goal is to create a FileService adapter interface in `src/core/` with Electron and browser implementations, extract map decompression logic from App.tsx into MapParser/service, and eliminate direct `window.electronAPI` calls from components and core modules.

The research reveals this is a well-established pattern in cross-platform TypeScript applications. The standard approach uses the Adapter Pattern with Interface Segregation Principle (ISP) to create focused, implementation-agnostic interfaces. For browser environments, the File API, pako library (for zlib), and native Blob/URL APIs provide equivalent functionality. React Context API is the recommended dependency injection mechanism for React applications, avoiding service locator anti-patterns.

**Primary recommendation:** Create a FileService interface using the Adapter Pattern, inject implementations via React Context Provider, use pako for browser-based zlib compression, and move all file I/O and compression logic from App.tsx into the adapter layer.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.7+ | Type-safe interfaces | Industry standard for portable abstractions, enables compile-time interface validation |
| pako | 2.1.0 | Browser zlib compression | High-speed zlib port to JavaScript, works in browser & Node.js, drop-in replacement for Node zlib |
| React Context API | Built-in | Dependency injection | React's native DI mechanism, avoids service locator anti-pattern, type-safe with TypeScript |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/pako | 2.0.4 | TypeScript definitions for pako | Required for TypeScript projects using pako |
| file-saver | 2.1.11 | Browser file download | Optional - can use native Blob URL approach, useful for cross-browser compatibility |
| CompressionStream API | Native | Modern browser compression | Alternative to pako for modern browsers, requires feature detection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pako | CompressionStream/DecompressionStream API | Native browser API, but requires polyfill for older browsers, supported in all modern browsers since 2023 |
| React Context | Dependency injection libraries (TSyringe, InversifyJS) | DI containers add complexity and bundle size, React Context is simpler and built-in |
| Adapter pattern | Service locator pattern | Service locator is anti-pattern for testability, hides dependencies, makes mocking harder |

**Installation:**
```bash
npm install pako
npm install --save-dev @types/pako
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/                     # Portable logic (no Electron/browser deps)
│   ├── map/                  # Map parsing, encoding, types
│   ├── editor/               # Editor state management
│   └── services/             # NEW: Service interfaces (adapters)
│       ├── FileService.ts    # Interface definition
│       └── types.ts          # Shared service types
├── adapters/                 # NEW: Platform-specific implementations
│   ├── electron/             # Electron implementations
│   │   ├── ElectronFileService.ts
│   │   └── index.ts
│   └── browser/              # Browser implementations
│       ├── BrowserFileService.ts
│       └── index.ts
└── components/               # React UI (uses services via Context)
    └── App.tsx               # Consumes FileService via useContext
```

### Pattern 1: FileService Adapter Interface

**What:** Abstract interface defining file operations independent of platform
**When to use:** When code needs to run in both Electron and browser environments
**Example:**
```typescript
// src/core/services/FileService.ts
export interface FileDialogResult {
  filePath: string | null;
  canceled: boolean;
}

export interface FileReadResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

export interface FileWriteResult {
  success: boolean;
  error?: string;
}

export interface CompressionResult {
  success: boolean;
  data?: ArrayBuffer;
  error?: string;
}

/**
 * FileService adapter interface
 * Platform-agnostic file operations for map editor
 */
export interface FileService {
  // File dialogs
  openMapDialog(): Promise<FileDialogResult>;
  saveMapDialog(): Promise<FileDialogResult>;

  // File I/O
  readFile(filePath: string): Promise<FileReadResult>;
  writeFile(filePath: string, data: ArrayBuffer): Promise<FileWriteResult>;

  // Compression (zlib format)
  compress(data: ArrayBuffer): Promise<CompressionResult>;
  decompress(data: ArrayBuffer): Promise<CompressionResult>;
}
```

### Pattern 2: Electron Implementation

**What:** Electron-specific implementation using window.electronAPI
**When to use:** When running in Electron environment
**Example:**
```typescript
// src/adapters/electron/ElectronFileService.ts
import { FileService, FileDialogResult, FileReadResult, FileWriteResult, CompressionResult } from '@core/services/FileService';

export class ElectronFileService implements FileService {
  async openMapDialog(): Promise<FileDialogResult> {
    const filePath = await window.electronAPI.openFileDialog();
    return { filePath, canceled: !filePath };
  }

  async saveMapDialog(): Promise<FileDialogResult> {
    const filePath = await window.electronAPI.saveFileDialog();
    return { filePath, canceled: !filePath };
  }

  async readFile(filePath: string): Promise<FileReadResult> {
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Decode base64 to ArrayBuffer
    const binary = atob(result.data!);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return { success: true, data: bytes.buffer };
  }

  async writeFile(filePath: string, data: ArrayBuffer): Promise<FileWriteResult> {
    // Convert ArrayBuffer to base64 for IPC
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    return await window.electronAPI.writeFile(filePath, base64);
  }

  async compress(data: ArrayBuffer): Promise<CompressionResult> {
    // Convert to base64 for IPC
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const result = await window.electronAPI.compress(base64);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Decode result
    const resultBinary = atob(result.data!);
    const resultBytes = new Uint8Array(resultBinary.length);
    for (let i = 0; i < resultBinary.length; i++) {
      resultBytes[i] = resultBinary.charCodeAt(i);
    }

    return { success: true, data: resultBytes.buffer };
  }

  async decompress(data: ArrayBuffer): Promise<CompressionResult> {
    // Convert to base64 for IPC
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    const result = await window.electronAPI.decompress(base64);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Decode result
    const resultBinary = atob(result.data!);
    const resultBytes = new Uint8Array(resultBinary.length);
    for (let i = 0; i < resultBinary.length; i++) {
      resultBytes[i] = resultBinary.charCodeAt(i);
    }

    return { success: true, data: resultBytes.buffer };
  }
}
```

### Pattern 3: Browser Implementation

**What:** Browser-specific implementation using File API and pako
**When to use:** When running in browser environment (future web version)
**Example:**
```typescript
// src/adapters/browser/BrowserFileService.ts
import * as pako from 'pako';
import { FileService, FileDialogResult, FileReadResult, FileWriteResult, CompressionResult } from '@core/services/FileService';

export class BrowserFileService implements FileService {
  async openMapDialog(): Promise<FileDialogResult> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.map,.lvl';

      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Store file reference for later read
          this.lastSelectedFile = file;
          resolve({ filePath: file.name, canceled: false });
        } else {
          resolve({ filePath: null, canceled: true });
        }
      };

      input.oncancel = () => {
        resolve({ filePath: null, canceled: true });
      };

      input.click();
    });
  }

  async saveMapDialog(): Promise<FileDialogResult> {
    // Browser doesn't need pre-save dialog - download happens directly
    // Return a placeholder path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return { filePath: `map-${timestamp}.map`, canceled: false };
  }

  private lastSelectedFile: File | null = null;

  async readFile(filePath: string): Promise<FileReadResult> {
    if (!this.lastSelectedFile) {
      return { success: false, error: 'No file selected' };
    }

    try {
      const arrayBuffer = await this.lastSelectedFile.arrayBuffer();
      return { success: true, data: arrayBuffer };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async writeFile(filePath: string, data: ArrayBuffer): Promise<FileWriteResult> {
    try {
      // Create blob and trigger download
      const blob = new Blob([data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async compress(data: ArrayBuffer): Promise<CompressionResult> {
    try {
      const input = new Uint8Array(data);
      const compressed = pako.deflate(input);
      return { success: true, data: compressed.buffer };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async decompress(data: ArrayBuffer): Promise<CompressionResult> {
    try {
      const input = new Uint8Array(data);
      const decompressed = pako.inflate(input);
      return { success: true, data: decompressed.buffer };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
```

### Pattern 4: Dependency Injection via React Context

**What:** Use React Context API to inject FileService implementation
**When to use:** In React applications requiring dependency injection without third-party libraries
**Example:**
```typescript
// src/contexts/FileServiceContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { FileService } from '@core/services/FileService';

const FileServiceContext = createContext<FileService | null>(null);

interface FileServiceProviderProps {
  service: FileService;
  children: ReactNode;
}

export const FileServiceProvider: React.FC<FileServiceProviderProps> = ({ service, children }) => {
  return (
    <FileServiceContext.Provider value={service}>
      {children}
    </FileServiceContext.Provider>
  );
};

export const useFileService = (): FileService => {
  const service = useContext(FileServiceContext);
  if (!service) {
    throw new Error('useFileService must be used within FileServiceProvider');
  }
  return service;
};
```

**Usage in main.tsx:**
```typescript
// src/main.tsx
import { ElectronFileService } from '@/adapters/electron/ElectronFileService';
import { BrowserFileService } from '@/adapters/browser/BrowserFileService';
import { FileServiceProvider } from '@/contexts/FileServiceContext';

const isElectron = typeof window !== 'undefined' && window.electronAPI;
const fileService = isElectron ? new ElectronFileService() : new BrowserFileService();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FileServiceProvider service={fileService}>
      <App />
    </FileServiceProvider>
  </React.StrictMode>
);
```

**Usage in components:**
```typescript
// src/App.tsx
import { useFileService } from '@/contexts/FileServiceContext';

export const App: React.FC = () => {
  const fileService = useFileService();

  const handleOpenMap = async () => {
    const dialogResult = await fileService.openMapDialog();
    if (dialogResult.canceled) return;

    const readResult = await fileService.readFile(dialogResult.filePath!);
    if (!readResult.success) {
      alert(`Failed to read file: ${readResult.error}`);
      return;
    }

    // Parse map data...
  };

  // ...
};
```

### Pattern 5: MapService for Decompression Logic

**What:** Extract map loading/saving business logic from App.tsx into a service
**When to use:** When file I/O and map parsing are tightly coupled in UI code
**Example:**
```typescript
// src/core/services/MapService.ts
import { MapData } from '../map/types';
import { mapParser } from '../map/MapParser';
import { FileService } from './FileService';

export class MapService {
  constructor(private fileService: FileService) {}

  async loadMap(): Promise<{ success: boolean; map?: MapData; error?: string }> {
    // Open dialog
    const dialogResult = await this.fileService.openMapDialog();
    if (dialogResult.canceled) {
      return { success: false, error: 'User canceled' };
    }

    // Read file
    const readResult = await this.fileService.readFile(dialogResult.filePath!);
    if (!readResult.success) {
      return { success: false, error: readResult.error };
    }

    // Parse header
    const parseResult = mapParser.parse(readResult.data!, dialogResult.filePath!);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }

    const mapData = parseResult.data!;

    // Decompress v3 maps
    if (mapData.header.version === 3) {
      const compressedStart = mapData.header.dataOffset + 2;
      const compressedData = readResult.data!.slice(compressedStart);

      const decompResult = await this.fileService.decompress(compressedData);
      if (!decompResult.success) {
        return { success: false, error: `Decompression failed: ${decompResult.error}` };
      }

      // Copy decompressed tiles
      mapData.tiles = new Uint16Array(decompResult.data!);
    }

    return { success: true, map: mapData };
  }

  async saveMap(map: MapData): Promise<{ success: boolean; error?: string }> {
    // Open save dialog
    const dialogResult = await this.fileService.saveMapDialog();
    if (dialogResult.canceled) {
      return { success: false, error: 'User canceled' };
    }

    // Serialize header
    const headerBuffer = mapParser.serialize(map);

    // Compress tiles
    const tileBuffer = map.tiles.buffer;
    const compResult = await this.fileService.compress(tileBuffer);
    if (!compResult.success) {
      return { success: false, error: `Compression failed: ${compResult.error}` };
    }

    // Combine header and compressed data
    const headerBytes = new Uint8Array(headerBuffer);
    const compBytes = new Uint8Array(compResult.data!);
    const fullBuffer = new Uint8Array(headerBytes.length + compBytes.length);
    fullBuffer.set(headerBytes);
    fullBuffer.set(compBytes, headerBytes.length);

    // Write file
    const writeResult = await this.fileService.writeFile(dialogResult.filePath!, fullBuffer.buffer);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    return { success: true };
  }
}
```

### Anti-Patterns to Avoid

- **Service Locator Pattern:** Don't create a global service registry - it hides dependencies and makes testing harder. Use dependency injection via React Context instead.
- **Leaking Platform Dependencies:** Don't import Electron or browser-specific code in `src/core/` - keep core modules truly portable by depending only on interfaces.
- **Fat Interfaces:** Don't create one monolithic FileService with 20+ methods. Apply Interface Segregation Principle - split into focused interfaces if needed (e.g., FileDialogService, FileIOService, CompressionService).
- **Premature Abstraction:** Don't abstract things that aren't used in multiple places yet. Focus on the current Electron/browser split, not theoretical future platforms.
- **Async Constructors:** Don't do async work in service constructors. Keep constructors synchronous, do initialization in separate init() methods if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zlib compression in browser | Custom deflate/inflate implementation | pako library | Battle-tested, handles edge cases, optimized for performance, 10+ years of production use |
| File downloads in browser | Custom blob URL handling with IE fallbacks | Native Blob URL API (or file-saver for IE11) | Modern browsers support Blob URLs natively, file-saver handles legacy browsers |
| Dependency injection container | Custom service registry/locator | React Context API | Built-in, type-safe, prevents service locator anti-pattern, zero dependencies |
| Base64 encoding/decoding | Custom binary string conversion | Native atob/btoa or TextEncoder/TextDecoder | Optimized native implementation, handles edge cases correctly |
| ArrayBuffer utilities | Custom buffer manipulation | Native TypedArray APIs | Performance-optimized, handles endianness correctly |

**Key insight:** File I/O and compression are deceptively complex domains with many edge cases. pako handles zlib header formats, checksums, and compression levels correctly. The browser File API handles character encodings, binary data, and cross-browser quirks. Don't reimplement what's already solved.

## Common Pitfalls

### Pitfall 1: Context Provider Not Wrapping App

**What goes wrong:** `useFileService()` throws "must be used within FileServiceProvider" error
**Why it happens:** Provider is missing in component tree or placed below components that need it
**How to avoid:** Place FileServiceProvider in main.tsx wrapping the entire App component
**Warning signs:** Runtime error on first useFileService() call, not caught by TypeScript

### Pitfall 2: ArrayBuffer Slicing in Electron IPC

**What goes wrong:** ArrayBuffer becomes detached/unusable after sending through Electron IPC
**Why it happens:** Electron's IPC uses structured clone algorithm which can transfer ownership
**How to avoid:** Always convert ArrayBuffer to base64 string before IPC boundary, convert back on other side
**Warning signs:** Data corruption, zero-length buffers after IPC, "ArrayBuffer was detached" errors

### Pitfall 3: pako vs zlib Format Incompatibility

**What goes wrong:** pako.deflate() output doesn't decompress with Node zlib.inflateSync()
**Why it happens:** pako has raw deflate, zlib, and gzip modes - must match Node's format
**How to avoid:** Use pako.deflate() (not deflateRaw()) to match zlib format with headers/checksum
**Warning signs:** "incorrect header check" errors, decompression returns garbage data

### Pitfall 4: Browser File Input Reuse

**What goes wrong:** Second file open doesn't trigger onchange handler
**Why it happens:** File input doesn't fire change event if same file selected twice
**How to avoid:** Set `input.value = ''` before triggering click, or create new input element each time
**Warning signs:** File dialog opens but nothing happens when user selects file

### Pitfall 5: Forgetting to Revoke Blob URLs

**What goes wrong:** Memory leaks in browser when downloading many files
**Why it happens:** URL.createObjectURL() creates URLs that persist until manually revoked
**How to avoid:** Call URL.revokeObjectURL() after download link is clicked
**Warning signs:** Increasing memory usage in long-running sessions with file downloads

### Pitfall 6: Interface Breaking Changes

**What goes wrong:** Updating Electron adapter breaks browser adapter (or vice versa)
**Why it happens:** Interface changes without updating all implementations
**How to avoid:** TypeScript will catch this if both implementations import the same interface - run typecheck after interface changes
**Warning signs:** Type errors in one adapter after modifying interface

## Code Examples

Verified patterns from official sources:

### File Reading with FileReader API
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsArrayBuffer
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsArrayBuffer(file);
  });
}
```

### Pako Compression/Decompression
```typescript
// Source: https://github.com/nodeca/pako
import * as pako from 'pako';

// Compress with zlib format (includes header and checksum)
const input = new Uint8Array([1, 2, 3, 4]);
const compressed = pako.deflate(input); // Returns Uint8Array

// Decompress
const decompressed = pako.inflate(compressed); // Returns Uint8Array

// Error handling
try {
  const result = pako.inflate(compressedData);
} catch (err) {
  console.error('Decompression failed:', err.message);
}
```

### Modern File Download
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
function downloadFile(data: ArrayBuffer, filename: string): void {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up
  URL.revokeObjectURL(url);
}
```

### React Context for DI
```typescript
// Source: https://codedrivendevelopment.com/posts/dependency-injection-in-react
import { createContext, useContext } from 'react';

// 1. Create context
const ServiceContext = createContext<MyService | null>(null);

// 2. Provider component
export const ServiceProvider: React.FC<{ service: MyService; children: ReactNode }> =
  ({ service, children }) => (
    <ServiceContext.Provider value={service}>
      {children}
    </ServiceContext.Provider>
  );

// 3. Custom hook
export const useService = (): MyService => {
  const service = useContext(ServiceContext);
  if (!service) {
    throw new Error('useService must be used within ServiceProvider');
  }
  return service;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| file-saver library | Native Blob URL API | 2020+ | Modern browsers support natively, smaller bundle, one less dependency |
| Custom DI containers | React Context API | React 16.3+ (2018) | Built-in, type-safe, no third-party library needed |
| Service locator pattern | Dependency injection via Context | 2015+ | Better testability, explicit dependencies, avoids anti-pattern |
| Mixed platform code | Adapter pattern with clear boundaries | Ongoing | Enables code reuse, testability, platform independence |
| FileSaver.js saveAs() | file.arrayBuffer() + Blob download | 2020+ | Native API preferred for modern browsers, FileSaver still useful for IE11 |
| Promise constructor for FileReader | file.arrayBuffer() | 2020+ | Simpler API, less boilerplate, available on File/Blob objects |

**Deprecated/outdated:**
- **FileSaver.js for modern apps:** Modern browsers support native File API, only needed for IE11 support
- **Service locator pattern in React:** React Context is the recommended approach since 16.3
- **InversifyJS for simple DI:** Overkill for most React apps, React Context sufficient unless complex container features needed
- **FileReader promise wrappers:** File/Blob.arrayBuffer() provides native promise-based API

## Open Questions

1. **Should we support IE11?**
   - What we know: IE11 requires FileSaver.js for downloads, polyfills for Promise, lacks Blob.arrayBuffer()
   - What's unclear: Target browser matrix for web version - do we need IE11 support?
   - Recommendation: Assume modern browsers only (Chrome/Edge 90+, Firefox 88+, Safari 14+) unless user specifies otherwise. Add IE11 polyfills only if explicitly required.

2. **Should MapService be in core or adapters?**
   - What we know: MapService orchestrates FileService (platform-specific) and MapParser (portable)
   - What's unclear: Does it belong in `src/core/services/` or `src/adapters/`?
   - Recommendation: Place in `src/core/services/` - it uses FileService interface (portable abstraction), doesn't know about platform specifics. It's business logic, not adapter code.

3. **Should we extract other Electron dependencies (dialogs)?**
   - What we know: AnimationPanel uses `window.electronAPI.openDllDialog()` for loading custom.dat
   - What's unclear: Is this in scope for Phase 26 or future phase?
   - Recommendation: Include in Phase 26 - add `openDllDialog()` to FileService interface. Small incremental addition, completes the portability layer.

4. **How to handle file path differences (Electron vs browser)?**
   - What we know: Electron has real file paths, browser has only file names
   - What's unclear: Does MapData.filePath need special handling?
   - Recommendation: Keep `filePath` as string in MapData. Electron stores full path, browser stores filename only. UI can display basename for consistency.

5. **Should compression be synchronous or async?**
   - What we know: Node zlib has both sync and async, pako is synchronous
   - What's unclear: Should FileService.compress() be sync for simplicity?
   - Recommendation: Keep async - future-proof for Web Workers, matches existing Electron IPC pattern, minimal code impact with async/await.

## Sources

### Primary (HIGH confidence)
- [pako GitHub Repository](https://github.com/nodeca/pako) - Official pako documentation and examples
- [pako npm package](https://www.npmjs.com/package/pako) - Package information and installation
- [@types/pako](https://www.npmjs.com/package/@types/pako) - TypeScript definitions
- [MDN FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) - Official browser File API documentation
- [MDN File.arrayBuffer()](https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer) - Modern file reading API
- [MDN CompressionStream](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream/CompressionStream) - Native browser compression API
- [React Context documentation](https://legacy.reactjs.org/docs/context.html) - Official React Context API docs
- [TypeScript Adapter Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/adapter/typescript/example) - Canonical adapter pattern reference

### Secondary (MEDIUM confidence)
- [Dependency Injection in React - Code Driven Development](https://codedrivendevelopment.com/posts/dependency-injection-in-react) - React Context for DI pattern
- [Using React Context for DI, not state management - Test Double](https://testdouble.com/insights/react-context-for-dependency-injection-not-state-management) - Best practices for Context as DI
- [Interface Segregation Principle in TypeScript - Medium](https://medium.com/@khomyakov/interface-segregation-principle-isp-with-typescript-examples-8f82f538a9b2) - ISP examples
- [Advanced Electron.js Architecture - LogRocket](https://blog.logrocket.com/advanced-electron-js-architecture/) - Electron architecture patterns
- [Compression Streams in all browsers - web.dev](https://web.dev/blog/compressionstreams) - Browser compression API support

### Tertiary (LOW confidence)
- [Service Locator Anti-Pattern - Mark Seemann](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisanAnti-Pattern/) - Why service locator is problematic
- [Decoupling with DI and Repository Pattern - Better Programming](https://betterprogramming.pub/decoupling-your-concerns-with-dependency-injection-the-repository-pattern-react-and-typescript-6b455788a374) - Repository pattern with DI in React

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pako is the established standard for browser zlib, React Context is built-in and well-documented
- Architecture: HIGH - Adapter pattern is well-established in TypeScript, multiple verified sources for React Context DI
- Pitfalls: MEDIUM-HIGH - pako format issues verified in docs, IPC ArrayBuffer issues from Electron experience, other pitfalls from general web development knowledge

**Research date:** 2026-02-08
**Valid until:** 2026-04-08 (60 days - stable technologies, slow-moving standards)
