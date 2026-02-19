// afterPack hook for electron-builder: remove chrome-sandbox on Linux.
// The SUID sandbox requires root-owned chrome-sandbox with mode 4755,
// which can't be guaranteed in AppImage/tar.gz distribution.
// Removing the binary prevents the check entirely; the --no-sandbox
// switch in main.ts handles the rest.

const fs = require('fs');
const path = require('path');

module.exports = async function (context) {
  if (context.electronPlatformName !== 'linux') return;

  const sandbox = path.join(context.appOutDir, 'chrome-sandbox');
  if (fs.existsSync(sandbox)) {
    fs.unlinkSync(sandbox);
    console.log('[afterPack] Removed chrome-sandbox from Linux build');
  }
};
