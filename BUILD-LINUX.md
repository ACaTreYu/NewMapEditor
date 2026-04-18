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
release/ac-map-editor_1.5.01_amd64.deb
```

The version in the filename is **pinned literally to 1.5.01** via
`package.json -> build.deb.artifactName`. Electron-builder normally
normalizes versions like `1.5.01` → `1.5.1` when expanding `${version}`
in templates; the hardcoded string sidesteps that so the Linux filename
matches the Windows one and the site's download link.

When bumping the version, edit all three spots in `package.json`:

- `"version"` (top of file)
- `build.nsis.artifactName` (Windows `.exe`)
- `build.deb.artifactName`  (Linux `.deb`)

## Moving the .deb to the website

The `public/downloads/` folder on the site lives on the Windows box. After
building on Linux, transfer the .deb there.

```bash
# from the Linux box — replace <windows-host> with hostname or IP
scp release/ac-map-editor_1.5.01_amd64.deb \
    arcje@<windows-host>:/e/arcbound/site/public/downloads/
```

Then on the Windows box, follow the normal site-deploy steps in
`E:\arcbound\site\CLAUDE.md` (`npx vite build` + FileZilla upload).

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
`build.deb.artifactName` in `package.json` isn't pinned to the literal
version string, or the version string was bumped and the pin wasn't
updated alongside it.
