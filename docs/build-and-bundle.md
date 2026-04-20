# Build and bundle Juice

This guide explains how to produce packaged Juice desktop builds for **macOS** and **Windows**.

## What the packaging command does

The standard packaging command is:

```bash
npm run tauri:build
```

That command delegates to Tauri and, through `src-tauri/tauri.conf.json`, runs:

1. `npm run build`
2. `npm run package:runtime`
3. native Tauri bundling for the current operating system

`npm run package:runtime` snapshots the external Cubicles runtime into `src-tauri/resources/cubicles-runtime`, so the packaged app contains the backend files it needs. Juice still expects `node` to be available on the target machine at runtime.

## Shared prerequisites

Before bundling on any platform, make sure you have:

- Node.js `>=25`
- the Rust toolchain
- the Tauri platform prerequisites for your host OS
- a valid `.env` file with `JUICE_CUBICLES_ROOT` pointing at your Cubicles checkout
- a buildable Cubicles workspace at that path

Install app dependencies first:

```bash
npm install
```

## macOS bundle

Build on a macOS machine:

```bash
npm run tauri:build
```

Primary outputs:

- App bundle: `src-tauri/target/release/bundle/macos/Juice.app`
- DMG installer: `src-tauri/target/release/bundle/dmg/Juice_<version>_<arch>.dmg`

Typical verification flow:

1. Open `src-tauri/target/release/bundle/macos/Juice.app`
2. Confirm the dock icon, window title, and backend startup behavior
3. If you distribute via drag-and-drop, test the generated `.dmg`

Notes:

- Build the macOS app on macOS. This repo does not include a cross-compilation or signing pipeline for producing macOS bundles from another OS.
- If the Dock shows a stale icon after a rebuild, make sure you open the newly built `.app` from `src-tauri/target/release/bundle/macos/` rather than an older copy.
- If `npm run tauri:build` fails during the runtime packaging step because of local npm cache permissions, fix the local cache ownership and rerun the build.

## Windows bundle

Build on a Windows machine:

```powershell
npm install
npm run tauri:build
```

Primary outputs are written under:

```text
src-tauri\target\release\bundle\
```

Depending on the installed Tauri bundlers, expect Windows artifacts such as:

- `msi\Juice_<version>_x64_en-US.msi`
- `nsis\Juice_<version>_x64-setup.exe`

Notes:

- Build the Windows installers on Windows. This repo does not include a cross-platform Windows packaging setup.
- Juice expects `node` to be available on the target Windows machine because the app launches the packaged Cubicles runtime through Node.
- Windows shell behavior is configured through `src-tauri/capabilities/default-windows.json`.

## Recommended release workflow

For both macOS and Windows:

1. Run `npm install`
2. Verify `.env` points at the correct Cubicles workspace
3. Run `npm run tauri:build`
4. Launch the packaged app from the bundle output directory
5. Confirm session creation, backend startup, and chat streaming
6. Archive the generated `.app`, `.dmg`, `.msi`, or `.exe` from `src-tauri/target/release/bundle/`

## Troubleshooting

### Bundling fails before the native package step

The most common causes are:

- `JUICE_CUBICLES_ROOT` is missing or points at the wrong workspace
- Cubicles fails to build
- Node or Rust is missing from the build host
- local npm cache permissions block `npm run package:runtime`

### Packaged app launches but backend does not start

Check:

- `node` is installed on the target machine
- the bundled runtime exists under the app resources
- Cubicles can start without interactive prompts

### Output path seems missing

Tauri writes native bundles under `src-tauri/target/release/bundle/`. If that directory does not contain the expected artifact, the platform-specific bundling step did not finish successfully.
