---
name: Artifact server runtime
description: Production runtime conventions for TanStack web artifacts with server functions.
---

For a TanStack web artifact with server functions, use the structured production build/run blocks in artifact.toml and build with Nitro's node-server preset; the web service must honor the injected PORT.

**Why:** The static web template cannot execute server functions, and Vite otherwise falls back to occupied default ports instead of the managed artifact port.

**How to apply:** Keep development on the managed Vite workflow, set Vite server and preview ports from process.env["PORT"], and run the generated Nitro server in production.