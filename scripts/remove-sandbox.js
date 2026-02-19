// afterPack hook for electron-builder: remove chrome-sandbox on Linux.
// The SUID sandbox check runs before Node.js, so app.commandLine.appendSwitch
// is too late. Removing the binary is the only reliable fix for AppImage.

const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
  if (context.electronPlatformName !== 'linux') return;

  const appOutDir = context.appOutDir;
  console.log('[afterPack] Linux build detected, appOutDir:', appOutDir);

  // Search for chrome-sandbox in the output directory and all subdirectories
  const candidates = [
    path.join(appOutDir, 'chrome-sandbox'),
    path.join(appOutDir, 'chrome_sandbox'),
  ];

  // Also scan the directory for any sandbox binary
  try {
    const files = fs.readdirSync(appOutDir);
    for (const f of files) {
      if (f.includes('sandbox')) {
        candidates.push(path.join(appOutDir, f));
      }
    }
  } catch (_) {}

  let removed = 0;
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log('[afterPack] Removed:', file);
      removed++;
    }
  }

  if (removed === 0) {
    console.log('[afterPack] No sandbox binaries found in:', appOutDir);
    console.log('[afterPack] Directory contents:', fs.readdirSync(appOutDir).join(', '));
  }
};
