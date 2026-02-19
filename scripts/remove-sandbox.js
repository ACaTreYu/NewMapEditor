// afterPack hook for electron-builder: fix Linux sandbox for AppImage.
//
// Strategy: rename the real binary and replace it with a shell wrapper
// that passes --no-sandbox as a real CLI argument. This is the only
// reliable way to bypass the SUID sandbox check, which runs before
// any JavaScript (including app.commandLine.appendSwitch).

const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
  if (context.electronPlatformName !== 'linux') return;

  const appOutDir = context.appOutDir;

  // Remove chrome-sandbox binary
  const sandbox = path.join(appOutDir, 'chrome-sandbox');
  if (fs.existsSync(sandbox)) {
    fs.unlinkSync(sandbox);
    console.log('[afterPack] Removed chrome-sandbox');
  }

  // Find the main executable (matches productName from package.json)
  const execName = context.packager.executableName;
  const execPath = path.join(appOutDir, execName);
  const realBin = path.join(appOutDir, execName + '.bin');

  if (!fs.existsSync(execPath)) {
    console.log('[afterPack] Executable not found:', execPath);
    return;
  }

  // Rename real binary → .bin
  fs.renameSync(execPath, realBin);
  console.log('[afterPack] Renamed', execName, '→', execName + '.bin');

  // Create wrapper script that passes --no-sandbox
  const wrapper = `#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
exec "$HERE/${execName}.bin" --no-sandbox "$@"
`;

  fs.writeFileSync(execPath, wrapper, { mode: 0o755 });
  console.log('[afterPack] Created wrapper script with --no-sandbox');
};
