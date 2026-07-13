# Linux build cheatsheet

Quick reference for building the `.deb` on a Linux box after pulling from
master. Windows + web builds happen on the Windows box; only this target
needs Linux.

## One-time setup

### 1. Toolchain

```bash
sudo apt install -y nodejs npm ruby ruby-dev build-essential
sudo gem install fpm        # electron-builder needs this to package .deb
```

(Only run these once per Linux box. `fpm` is the actual missing piece —
without it, electron-builder succeeds through the vite stage and produces
`release/linux-unpacked/` but fails at the .deb packaging step.)

### 2. Clone (if not already)

```bash
git clone https://github.com/ACaTreYu/NewMapEditor.git
cd NewMapEditor
```

### 3. Stop Linux from bothering you about `package-lock.json`

```bash
git update-index --skip-worktree package-lock.json
```

Sticky per-clone. After this, `npm install` can rewrite the lockfile and
`git status` won't nag. Undo with `--no-skip-worktree` if you ever need
to update the committed lockfile on purpose.

## Every build

```bash
# 1. get the latest code
git checkout master            # only if detached HEAD; otherwise skip
git pull origin master

# 2. install deps (rewrites local package-lock.json, but --skip-worktree
#    above keeps git quiet about it)
npm install

# 3. build the .deb
npm run electron:build:linux
```

Output:

```
release/ac-map-editor_<version>_amd64.deb
release/latest-linux.yml          ← REQUIRED for auto-update
```

## Auto-update SOP — read this before every build

Every release MUST include the updater metadata file alongside the
installer, or users can't auto-update:

| Platform | Installer                       | Updater file       |
|----------|---------------------------------|--------------------|
| Windows  | `AC Map Editor Setup X.Y.Z.exe` | `latest.yml`       |
| Linux    | `ac-map-editor_X.Y.Z_amd64.deb` | `latest-linux.yml` |

After a build, upload **both** the installer and its `latest*.yml` to the
GitHub release. If only the installer ships, `autoUpdater.checkForUpdates()`
either 404s or sees stale version metadata, and users stay stuck.

**Also: never use leading zeros in the version (e.g. `1.5.01`).** That
string isn't valid semver. `app.getVersion()` returns it verbatim, so
electron-updater throws on *every* launch with an uncaught exception that
crashes the main process. Use plain `1.5.2`, `1.5.12`, etc.

With a valid version, `${version}` in both artifactName templates expands
cleanly — no need to hardcode the version literal. Only bump `"version"`
at the top of `package.json`; the two artifactName templates pick it up.

## Publishing the Linux release

After a successful build you have both pieces in `release/`:

- `ac-map-editor_<version>_amd64.deb`
- `latest-linux.yml`  (points at the deb with sha512 + size)

Upload **both** to the matching GitHub release:

```bash
gh release upload v<version> \
  release/ac-map-editor_<version>_amd64.deb \
  release/latest-linux.yml \
  --repo ACaTreYu/NewMapEditor --clobber
```

## Moving the .deb to the website

The `public/downloads/` folder on the site lives on the Windows box. After
building on Linux, transfer the .deb there.

```bash
# from the Linux box — replace <windows-host> with hostname or IP
scp release/ac-map-editor_<version>_amd64.deb \
    arcje@<windows-host>:/e/arcbound/site/public/downloads/
```

Then on the Windows box, follow the normal site-deploy steps in
`E:\arcbound\site\CLAUDE.md` (`npx vite build` + paramiko SFTP via
`E:/arcbound/game/scripts/deploy_site.py`). **FileZilla is not in use** —
ignore any stale doc that says otherwise.

## Troubleshooting

**`fpm: executable file not found in %PATH%`** — Ruby + fpm aren't
installed. See step 1 of one-time setup.

**`you are currently not on a branch`** — detached HEAD. Run:
```bash
git checkout master
git pull origin master
```

**`your local changes to 'package-lock.json' would be overwritten`** —
you didn't pin it with `--skip-worktree` (step 3 of one-time setup), or
a previous `npm install` regenerated it. Discard:
```bash
git checkout -- package-lock.json
git pull
```

**Built .deb but the filename doesn't match what's in the site HTML** —
mismatch between `package.json -> "version"` and the filename expected by
the site. `${version}` in `build.deb.artifactName` picks up whatever
`"version"` is set to; if the site HTML hardcodes a different version,
update the HTML.

**Windows users can't auto-update to the new version** — check that the
GitHub release has `latest.yml` uploaded alongside the exe+blockmap. Same
check for Linux: `latest-linux.yml` alongside the .deb.

**`npm install` spews EBADENGINE / "npm out of date" warnings** — system
Node is too old. Don't fight apt; use nvm (no sudo):
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# open a NEW terminal, then:
nvm install 22
```
(If curl says "failed to verify legitimacy", the system clock or CA certs
are stale: `sudo apt install -y ca-certificates && sudo timedatectl set-ntp true`.)

**`Invalid configuration object ... electron-builder 26.x ... does not
match the API schema`** — the local `package.json` was rewritten (usually
by a past `npm audit fix --force`), pulling in electron-builder 26 whose
schema rejects our `linux.desktop` block. NEVER run `npm audit fix` here.
Restore the committed files and reinstall:
```bash
git checkout -- package.json
git update-index --no-skip-worktree package-lock.json
git checkout -- package-lock.json
git update-index --skip-worktree package-lock.json
rm -rf node_modules
npm install
npm ls electron-builder   # must print 25.1.8
```

**Users hit `app version is not valid semver` on launch** — `"version"`
in `package.json` uses leading zeros (e.g. `1.5.01`). Bump to a valid
semver string (`1.5.2`), rebuild, re-release; users on the bad version
must download the new installer manually one time.
