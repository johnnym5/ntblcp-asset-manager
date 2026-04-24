# Build and Firebase App Hosting Audit (April 24, 2026)

## Scope
This audit reviewed the repository structure, build configuration, Firebase hosting configuration, and available TypeScript diagnostics. It also re-ran local checks where possible.

## What the app is (high-level)
- **Framework**: Next.js 15 (App Router), React 19, TypeScript.
- **Purpose**: Asset registry + verification platform with offline workflows.
- **Core domains**:
  - Workstation pages in `src/app/*`.
  - Shared state/auth in `src/contexts/*`.
  - Asset/domain types in `src/types/*`.
  - Firebase integration in `src/firebase/*` and `src/services/firebase/*`.
  - Parser + import pipeline in `src/parser/*`.

## Build blockers observed now
1. **Hard TypeScript syntax issue (fixed in this patch)**
   - File: `src/components/asset-list.tsx`
   - Issue: malformed conditional JSX (`&& (...) : null`) caused parser failure.
   - Impact: build/typecheck cannot proceed.

2. **Dependency/tooling availability in this environment**
   - `next` binary unavailable because dependencies are not installed.
   - `npm install` failed with `403 Forbidden` for `sisteransi` in this environment.
   - Impact: full `next build`/`next lint` could not be executed here.

## Repository diagnostics snapshot (from existing typecheck logs)
Using `typecheck_output2.txt`, the previous run reported:
- **272 TypeScript errors total**.
- **Top error concentration**: `src/components/asset-list.tsx` (142 errors).
- **Most frequent error families**:
  - TS2339 (missing properties)
  - TS2367 (invalid comparisons between incompatible unions)
  - TS2304 (unknown names)
  - TS7006 (implicit any)
  - TS2322 (assignment/type incompatibility)

### Most likely root causes in codebase
- **Type model drift** between `Asset`, `AppSettings`, and consumers (legacy fields like `activeGrantId`, `verifiedStatus`, etc. used in UI but not in current canonical types).
- **Legacy component drift** centered in `asset-list.tsx` (single huge component with many outdated assumptions).
- **Test typing drift** in `src/core/*/__tests__` and parser/offline tests.
- **Enum/value mismatch** (`'VERIFIED'` vs `'Verified'`; `DataSource` comparisons to invalid literals).

## Firebase App Hosting-focused findings
1. `apphosting.yaml` exists and is structurally valid for runtime/env declaration.
2. `firebase.json` uses framework hosting (`frameworksBackend`) and Firestore rules.
3. The likely App Hosting deployment failure is **build-time TypeScript/Next failure**, not Firebase configuration syntax.
4. The env values in `apphosting.yaml` are placeholders; deployment can succeed with placeholders, but runtime auth/firestore behavior will fail unless proper values/secrets are configured.

## Recommended remediation order
1. **Stabilize dependencies in CI/build image**
   - Ensure npm registry access policy allows all transitive packages.
   - Run `npm ci` in the same environment used by App Hosting prebuild checks.
2. **Refactor `asset-list.tsx` first**
   - Align imports with current exports.
   - Replace legacy field references with current `Asset`/`AppSettings` schema.
   - Resolve `DataSource` union mismatches.
3. **Unify domain models**
   - Consolidate duplicate/legacy asset types in `src/types/domain.ts` and related consumers.
4. **Repair remaining pages/components**
   - `src/app/gis/page.tsx`, `src/components/workstations/GISWorkstation.tsx`, `src/components/asset-form.tsx`, settings/admin dialogs.
5. **Re-run strict gate**
   - `npm run typecheck && npm run lint && npm run build`.
6. **Then deploy App Hosting**
   - With real environment values in Firebase Console/Secrets.

## Practical deployment checklist
- [ ] `npm ci` succeeds locally and in CI.
- [ ] TypeScript has zero errors.
- [ ] Next build succeeds.
- [ ] Firebase env vars set to real values (not placeholders).
- [ ] `firebase deploy` (or App Hosting pipeline) succeeds without build fallback errors.
