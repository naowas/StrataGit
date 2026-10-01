<div align="center">

<img src="./build/icon.png" alt="StrataGit Logo" width="128" height="128" />

# StrataGit

**Visual commit strata &amp; effortless Git workflow for Linux and macOS.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-44.4.5-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS-lightgrey.svg)](#installation--build)

</div>

---

## 🌟 Overview

**StrataGit** is an open-source, commit-graph-centric desktop Git client built for developers who need crystalline visual clarity over complex repository histories, parallel branch lanes, and active working trees.

Inspired by modern visual Git workflows, StrataGit combines the responsiveness of native Git with a rich, aesthetic interface crafted in React, TypeScript, and Electron. It shells out directly to your system's native `git` binary asynchronously—avoiding brittle native C++ bindings while ensuring 100% fidelity with your existing Git hooks, SSH keys, GPG signing, and `.gitconfig`.

---

## ✨ Features

### 🌳 Interactive Commit Strata Graph
- **Dynamic Branch Lanes**: Visualizes parallel branches with dedicated color tracks, smooth cubic bezier curves, and glowing commit nodes.
- **Inline Branch & Tag Badges**: Quick identification of `HEAD`, local branches, remote tracking branches, and tags directly alongside commit summaries.
- **Instant Commit Inspection**: Click any node to instantly populate commit details, author information, parent commit links, and modified files.

### 📑 Multi-Repository Workspace & Tabs
- **Tabbed Browsing**: Seamlessly open and switch between multiple repositories in parallel tabs.
- **Launchpad Hub**: Clean welcome screen showing recently opened repositories with single-click access and quick removal.
- **Frameless Window Chrome**: Integrated drag region, custom window controls, and repository switcher.

### 🔍 Deep Commit Details & File Hierarchy
- **Dual File Tree Views**: Toggle between a flat file path list and an expandable folder tree hierarchy.
- **Change Badges**: Visual indicators for Added (`+`), Modified (`M`), Deleted (`-`), and Renamed (`R`) files with line additions/deletions.
- **Parent Navigation**: Click any parent commit hash to jump directly across the commit graph.

### ⚡ Unified & Side-by-Side Diff Viewer
- **Syntax Highlighting**: Beautiful code diff rendering with language detection and clean contrast.
- **Hunk-Level Granularity**: Review changes hunk-by-hunk, with options to stage, unstage, or discard hunks individually.
- **File System Operations**: Open files in your system's default editor or reveal them in your OS file manager.

### 🔀 Branch & Stash Management
- **Branch Operations**: Fast checkout, branch creation from any commit, rename, and local/remote branch deletion.
- **Merge & Rebase Controls**: Merge branches with fast-forward support or interactive rebase workflows.
- **Full Stash Suite**: Stash staged/unstaged changes with optional descriptions; inspect, pop, apply, or drop stashes on demand.

### 🛠️ Commit History Actions
- **Interactive Mutations**: Soft, mixed, or hard reset to any historical commit.
- **Rebase Helpers**: Revert commits, drop commits, and edit commit messages without writing complex rebase scripts by hand.
- **Patch Application**: Apply individual commit patches onto your current working branch.

### 🛟 Reflog & Recovery
- Browse recent local `HEAD` and reference movements to find commits hidden by a reset, rebase, or deleted branch.
- Create a recovery branch at any reflog entry to keep that commit reachable.
- Restore the current branch to a selected entry after confirming; StrataGit first creates a safety branch at the current tip and requires a clean working tree.

### 🎨 Theming & Visual Customization
- **Curated Theme Palettes**:
  - `StrataGit Dark` (Default, sleek onyx & electric cyan)
  - `GitHub Dark Dimmed`
  - `Dracula`
  - `Nord`
  - `Cyberpunk`
  - `Monokai Pro`
  - `One Dark Pro`
  - `Solarized Dark`
  - `Clean Studio Light`
- **Custom Typography**: Select from Google Fonts presets (Inter, Roboto, Outfit, JetBrains Mono, Fira Code) or specify your own installed system fonts.
- **Adjustable Graph Density**: Tailor graph row height to your preferred information density.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Electron Main Process                │
│  - Window Management & Native Frameless Chrome        │
│  - Async Child Process Git Engine (simple-git/exec)   │
│  - Native Dialogs, OS Integration & Config Storage    │
└──────────────────────────┬─────────────────────────────┘
                           │ (contextBridge / IPC)
┌──────────────────────────▼─────────────────────────────┐
│                 Typed IPC Layer (StrataGitApi)          │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                  React 19 Renderer Process             │
│  - TabBar & Launchpad State (Zustand)                  │
│  - SVG Commit Strata Graph Renderer                   │
│  - Diff Viewer & File Tree Hierarchy                   │
│  - Theme & Typography Engine (CSS Vars / Tailwind v4)  │
└────────────────────────────────────────────────────────┘
```

- **Non-blocking Execution**: Git operations execute in the Node.js background process without freezing the 60fps UI renderer.
- **Secure Context Isolation**: Renderer runs with `contextIsolation: true` and `nodeIntegration: false`. All capabilities are exposed through a strictly typed `StrataGitApi` context bridge.
- **Native Git Compatibility**: Zero proprietary database lock-in. StrataGit reads directly from your repository's `.git/` folder using the system Git CLI.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **npm** or **pnpm**
- **Git**: System `git` CLI installed and available in `$PATH`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/naowas/StrataGit.git
   cd stratagit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Verify TypeScript types:**
   ```bash
   npm run typecheck
   ```

---

## 📦 Building & Packaging

StrataGit uses [`electron-builder`](https://www.electron.build/) to package distribution-ready binaries:

### Build for Linux (AppImage, deb, rpm & Arch)
```bash
npm run dist:linux
```
This creates an AppImage, Debian package, RPM package, and Pacman package in `dist/`.

### Build for Windows (NSIS installer)
```bash
npm run dist:win
```
This creates a Windows installer (`.exe`) and `latest.yml` updater metadata in `dist/`. Build on Windows for the most reliable release and smoke-test the installer there. Linux can cross-build it when Wine is available.

### Build for macOS (manual download)
```bash
npm run dist:mac
```
This creates a DMG and ZIP in `dist/`. macOS builds are unsigned and will always use the GitHub release page for manual download and installation; in-app macOS updates are not enabled.

### Publishing a release and its update files

StrataGit checks public, non-draft GitHub Releases in `naowas/StrataGit`. Local `dist` commands only build files; the GitHub Actions release workflow builds and uploads them automatically when a version tag is pushed.

First commit and push the workflow and packaging changes to `main`. For each release, bump `package.json`'s version to match the tag (without the `v` prefix), commit and push that version, then push the tag:

```bash
npm version 0.1.1-beta.1 --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: prepare v0.1.1-beta.1 release"
git tag v0.1.1-beta.1
git push origin main
git push origin v0.1.1-beta.1
```

The workflow builds Linux packages on Ubuntu, the Windows installer on Windows, and a universal unsigned DMG/ZIP on macOS. It creates a **draft** GitHub Release and attaches all installers, updater metadata, and blockmaps. A new draft for a tag with a prerelease suffix (such as `-beta.1`) is marked as a prerelease. Wait for the **Build release packages** workflow to finish successfully before publishing. Do not create or publish the release manually while the builds are running: the updater can see a published release before its metadata is attached and report a 404. Review the draft's title and notes, confirm `latest-linux.yml`, `latest.yml`, and the platform installers are attached, then publish it in GitHub. If metadata is missing after the workflow finishes, rerun the workflow; do not upload a `dist/` file from an older build.

Windows NSIS and Linux AppImage, deb, rpm, and Pacman builds can download and install updates from About → Software updates. Package-manager installs may request system authorization. macOS stays manual because builds are unsigned: StrataGit opens the release page for download and installation.

The workflow uses GitHub's `GITHUB_TOKEN` with `contents: write` for draft releases. If the release job is denied permission, allow read/write workflow token permissions under the repository's **Settings → Actions → General**. Re-running a tag workflow replaces same-named installer assets on that tag's release.

The updater is included in the first public build. Builds made before it is included cannot update themselves and must be replaced manually.

### Production Bundle Check
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>,</kbd> / <kbd>Cmd</kbd> + <kbd>,</kbd> | Open Settings & Preferences |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> / <kbd>Cmd</kbd> + <kbd>F</kbd> | Filter / Search Commits & Branches |
| <kbd>Ctrl</kbd> + <kbd>R</kbd> / <kbd>Cmd</kbd> + <kbd>R</kbd> | Refresh Current Repository Status |
| <kbd>Esc</kbd> | Close Diff Viewer / Dismiss Modals |
| <kbd>Ctrl</kbd> + <kbd>T</kbd> / <kbd>Cmd</kbd> + <kbd>T</kbd> | Open New Tab / Return to Launchpad |

---

## 📁 Project Structure

```
stratagit/
├── build/                     # Desktop icons (SVG, multi-resolution PNGs)
├── scripts/                   # Utility scripts (icon generator, git test harness)
├── src/
│   ├── main/                  # Electron main process
│   │   ├── git/               # Git engine modules (log, status, diff, history, branch)
│   │   ├── index.ts           # Application lifecycle & window creation
│   │   └── ipc.ts             # Strongly-typed IPC handlers
│   ├── preload/               # Secure contextBridge preload script
│   │   └── index.ts
│   ├── renderer/              # React 19 frontend
│   │   ├── assets/            # Embedded vector assets
│   │   ├── components/        # UI components
│   │   │   ├── CommitDetailPanel/ # Changed files tree & commit metadata
│   │   │   ├── CommitGraph/   # SVG visual commit strata graph
│   │   │   ├── Common/        # Shared components (StrataLogo)
│   │   │   ├── DiffViewer/    # Syntax-highlighted file & hunk diffs
│   │   │   ├── Launchpad/     # Home workspace & recent repositories
│   │   │   ├── Loading/       # Smooth splash & initialization screen
│   │   │   ├── Settings/      # Preferences & theme customizer
│   │   │   ├── Sidebar/       # Branch, stash & remote tree navigation
│   │   │   ├── StatusBar/     # Git sync status, branch info & counter
│   │   │   ├── TabBar/        # Multi-repo tabs & frameless window chrome
│   │   │   └── Toolbar/       # Push, pull, branch, stash & terminal bar
│   │   ├── store/             # Zustand state stores (app & settings)
│   │   └── index.html         # HTML root document
│   └── shared/                # Cross-process TypeScript types & contracts
├── package.json               # Manifest, ESM type, & build configurations
├── postcss.config.js          # Tailwind v4 PostCSS adapter (@tailwindcss/postcss)
└── tsconfig.json              # TypeScript project configuration
```

> **Tailwind v4** — design tokens (colors, fonts, sizes) live in an `@theme {}` block
> inside `src/renderer/global.css`. There is no `tailwind.config.js`; all theme
> customisation is done via standard CSS custom properties.

---

## 🤝 Contributing

Contributions are welcome! Whether you are reporting a bug, proposing a feature, or submitting a pull request, we appreciate your help in making StrataGit better.

1. **Fork** the repository
2. **Create** your feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
<sub>Crafted with passion for the open-source Git community.</sub>
</div>
