---
name: Orval generation compatibility
description: Why generated client code needs explicit Zod compatibility and browser model workers need ES module output.
---

Do not rely on automatic Zod version selection when regenerating the OpenAPI client for this imported workspace; use the version that its generated-schema package actually depends on. For large dynamic imports in browser workers, produce ES module worker bundles rather than the default IIFE output.

**Why:** Orval emitted Zod 4-only calls against the installed Zod 3 entry point even though the existing schemas compiled before regeneration. Separately, production Vite builds failed because the browser inference worker required code splitting, which IIFE workers do not support. Typechecking alone missed the latter.

**How to apply:** When updating the API specification or local browser-worker dependencies, regenerate clients, run the entire workspace typecheck, and run the web production build before treating the feature as complete.