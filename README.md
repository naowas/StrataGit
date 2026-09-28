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
   git clone https://github.com/naowas/stratagit.git
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

### Build for Linux (AppImage & deb)
```bash
npm run dist:linux
```
Output files will be generated in `dist/`:
- `dist/StrataGit-<version>.AppImage`
- `dist/stratagit_<version>_amd64.deb`

### Build for macOS (dmg & zip)
```bash
npm run dist:mac
```
Output files will be generated in `dist/`:
- `dist/StrataGit-<version>.dmg`
- `dist/StrataGit-<version>-mac.zip`

### Publishing a release and its update files

StrataGit checks public, non-draft GitHub Releases in `naowas/stratagit`. Release uploads are manual; the `dist` commands build files locally and do not publish anything. Set `package.json`'s version to the release version before building, and use a matching `v<version>` tag.

Build each supported platform on its native operating system:

```bash
npm run dist:linux
npm run dist:mac
```

Attach the installers and every updater file generated in `dist/` to the same GitHub Release. This includes the platform metadata (`latest-linux.yml` and `latest-mac.yml`) and any generated `.blockmap` files alongside the AppImage, deb, dmg, and macOS zip. Keep the release public and non-draft so installed apps can find its metadata.

Linux AppImage and deb builds can download and install an update from About → Software updates. A deb install may ask for system authorization. macOS builds are currently unsigned, so StrataGit checks for a release but opens the release page for manual download and installation until code signing is configured.

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
