# Vercel `Cannot find module 'pdf-parse'` — Diagnosis & Fix Report

**Project:** FlowVision (Nuxt 4 / Nitro)  
**Date:** 2026-06-15  
**Status:** Resolved in codebase — requires clean reinstall + redeploy to Vercel

---

## Root Cause

The 500 error `Cannot find module 'pdf-parse'` came from how **PDF text extraction** was implemented on the server, not from a missing entry in `package.json` alone.

### What was happening

1. **Server code used `pdf-parse` via CommonJS `require()`**  
   In `server/utils/documentParser.ts`, PDFs were parsed like this:

   ```ts
   import { createRequire } from 'module'
   const require = createRequire(import.meta.url)
   const pdf = require('pdf-parse')
   ```

   That pattern is hard for Nitro’s bundler and Vercel’s dependency tracer to follow.

2. **`nitro.externals.external: ['pdf-parse']` made things worse**  
   Earlier commits externalized `pdf-parse` so Nitro would not bundle it and Vercel would load it from `node_modules` at runtime. That only works if the package is **also** copied into the serverless function’s traced dependency tree.  
   A dynamic `createRequire(...).require('pdf-parse')` is often **not traced**, so the deployed function bundle contained code that still called `require('pdf-parse')` but **did not ship `pdf-parse` in `node_modules`** → exact runtime error you saw.

3. **Why `pdf-parse` is a poor fit for Vercel serverless**
   - Legacy **CommonJS** package; Nitro/Nuxt 4 defaults to **ESM**.
   - Depends on **`pdfjs-dist`**, which loads worker files and other assets via paths that break when Rollup/Nitro inlines or rewrites the bundle.
   - No first-class ESM/serverless story; teams usually migrate to **`unpdf`** (serverless PDF.js build) or similar.

4. **Why `nitro: { external: ['pdf-parse'] }` is the wrong shape**
   - Nitro expects **`nitro.externals.external`**, not a top-level `nitro.external` array.
   - Even with correct syntax, externalizing `pdf-parse` without reliable tracing reproduces the missing-module failure.

### Current state (after fix)

- `pdf-parse` is **removed** from `package.json`.
- PDF parsing uses **`unpdf`** with ESM `import('unpdf')` in `server/utils/documentParser.ts`.
- `mammoth` (DOCX) uses the same dynamic-import pattern.
- `nuxt.config.ts` inlines/traces `unpdf` and `mammoth` for Vercel’s serverless layer.

A local production build was verified: **no `pdf-parse` references** in `.output/`, and `unpdf@1.6.2` appears in the Nitro server trace.

If Vercel still shows `pdf-parse` after you push, you are almost certainly hitting a **cached deployment** or an environment that has not rebuilt from the latest commit (`1f3fb7a` and later).

---

## Fixes Applied

| Area | Change |
|------|--------|
| **`package.json`** | Removed `pdf-parse`; added `unpdf` under `dependencies` (production). |
| **`server/utils/documentParser.ts`** | Replaced `createRequire` + `pdf-parse` with `import('unpdf')` and `extractText` / `getDocumentProxy`. |
| **`nuxt.config.ts`** | Added `nitro.externals.inline: ['unpdf']` and `traceInclude: ['unpdf', 'mammoth']` so Vercel functions bundle PDF/DOCX parsers reliably. |
| **Removed** | Incorrect / ineffective `nitro.externals.external: ['pdf-parse', 'pdfjs-dist']` blocks from prior attempts. |

### Files touched in this remediation

- `nuxt.config.ts` — Nitro bundling rules for serverless
- `vercel-error-report.md` — this document

(PDF parser migration in `package.json` / `documentParser.ts` was already on `main`; this pass hardens Nitro for Vercel.)

---

## Verification Steps

Run these from the project root (`C:\Users\Andrew\Documents\FlowVision` on Windows, or your clone path).

### 1. Clean package manager state

**npm (recommended — project uses `package-lock.json`):**

```powershell
# Stop any running dev server first
Remove-Item -Recurse -Force node_modules, .nuxt, .output -ErrorAction SilentlyContinue
npm cache clean --force
npm ci
```

**Optional — clear only Nitro/Nuxt caches without full `node_modules` delete:**

```powershell
Remove-Item -Recurse -Force .nuxt, .output -ErrorAction SilentlyContinue
npm ci
```

### 2. Local production build

```powershell
npm run build
```

Confirm the build succeeds and that `pdf-parse` is absent:

```powershell
Select-String -Path .output\server\chunks\_\nitro.mjs -Pattern "pdf-parse"
# Expect: no matches

Select-String -Path .output\server\chunks\_\nitro.mjs -Pattern "unpdf"
# Expect: at least one match (dynamic import of unpdf)
```

### 3. Optional — preview server locally

```powershell
node .output/server/index.mjs
```

Upload a PDF to an API route that calls `extractTextFromFile` (e.g. `POST /api/ping` with a `file` field).

### 4. Push to Git and redeploy on Vercel

```powershell
git add nuxt.config.ts vercel-error-report.md
git status
git commit -m "fix: bundle unpdf for Vercel serverless; document pdf-parse removal"
git push fv main
```

Replace `fv` / `main` with your remote and branch if different (`git remote -v`).

### 5. Force a clean Vercel build (important)

In the Vercel dashboard for this project:

1. **Deployments** → latest deployment → **⋯** → **Redeploy**
2. Enable **“Clear build cache”** (or “Redeploy without cache”)
3. Confirm the deployment commit matches your latest push

Alternatively via CLI (if installed and linked):

```powershell
vercel --prod --force
```

### 6. Post-deploy smoke test

Hit a route that parses PDFs server-side, for example document upload or RAG query with a PDF attachment. Response should be `200`, not `500` with `Cannot find module 'pdf-parse'`.

---

## Quick reference — dependency check

| Package | Location | Purpose |
|---------|----------|---------|
| `unpdf` | `dependencies` | Server PDF text extraction |
| `pdf-lib` | `dependencies` | Client-side PDF QR embedding (browser) |
| ~~`pdf-parse`~~ | **removed** | Was causing Vercel serverless failures |

---

## Summary

The failure was a **serverless bundling + tracing** problem: externalized `pdf-parse` loaded through `createRequire` was not present in the Vercel function at runtime. The durable fix is **`unpdf` + Nitro inline/trace configuration**, not re-adding `pdf-parse` or externalizing it. After a clean `npm ci`, successful `npm run build`, and a **cache-cleared Vercel redeploy**, the error should not return.
