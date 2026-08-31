---
name: Deployment package manager
description: How lockfile selection affects publishing for this workspace
---

Publishing selects the package manager from the repository's package-manager markers. Keep the workspace on its declared pnpm flow; unrelated Bun lock/config files can make publishing run Bun with a frozen lockfile and stop before dependencies install. When autodetection still selects Bun, explicitly set the Replit packager language to Node.js.

**Why:** The workspace uses pnpm-specific lifecycle checks and a pnpm lockfile, while stale Bun markers caused the deployment installer to select Bun and reject the dependency graph.

**How to apply:** When diagnosing a deployment failure during dependency installation, check for competing root lockfiles first. Keep only the lockfile for the package manager declared by the workspace. Prefer the hosting packager setting over a packageManager version pin when local and hosting pnpm versions differ.

Do not add a `packageManager` pin unless the environment already has that exact pnpm release available; pnpm can try to self-install a different pinned release before running the workspace install.