# Implementation Plan - Assetain

## 1. Project Overview
**App Name:** Assetain  
**Purpose:** High-integrity, offline-first asset management and verification platform for NTBLCP registers.  
**Core Philosophy:** Local-first autonomy with manual cloud reconciliation and forensic source traceability.

## 2. Functional Requirements
- **Unified Workstation Shell:** Single-page operational console for switching sub-modules.
- **Stateful Ingestion:** Schema-aware parsing of complex hierarchical Excel workbooks (TB and C19).
- **Forensic Traceability:** Preservation of source workbook, sheet, row, and section context for every record.
- **Manual Sync Protocol:** User-initiated data movement between device and cloud authorities.
- **Identity Governance:** Role-based access control with regional scope locking.
- **Activity Ledger:** Immutable audit trail of all registry modifications.
- **Infrastructure Command:** Multi-layer database management and failover controls.

## 3. System Architecture
- **Frontend Layer:** Next.js 15 App Router with Workstation component orchestration.
- **Storage Layer:** Triple-layer redundancy (Cloud Firestore, Shadow RTDB Mirror, Local IndexedDB).
- **Service Layer:** Deterministic Parser, PDF/Excel generators, and Sync Replay Engine.
- **Validation Layer:** Zod-based schemas for all ingestion and mutation paths.

## 4. Implementation Phases
- **Phase 1: Foundation:** Global shell, Auth gateway, and core domain models are in place.
- **Phase 2: Ingestion Center:** Multi-profile parser and data import are implemented for Excel workflows.
- **Phase 3: Registry & Audit:** Asset registry, activity ledger, and verification queue are available.
- **Phase 4: Governance:** Infrastructure controls and role management are part of the roadmap and are being refined.

> Note: Current deployment focuses on the web shell, Firebase sync, and offline asset management. Planned enhancements include AI-assisted OCR, document scanning, and Google Sheets integration.
