---
name: Imported workspace dependency restoration
description: Limitation of the package installation callback when restoring an imported pnpm workspace.
---

For an imported pnpm workspace, restore its existing locked dependencies rather than adding an arbitrary dependency just to trigger installation.

**Why:** The package installation callback requires at least one package, invokes a root-level add rejected by pnpm's workspace safeguard, and rejects workspace flags as package tokens. These constraints prevent expressing a dependency-only restore through that callback.

**How to apply:** Read the package-management guidance first. If the callback still has these limitations, use the workspace's frozen-lockfile restore command without changing package versions or disabling workspace safeguards.