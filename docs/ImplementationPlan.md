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
- **Phase 1: Foundation (Complete):** Global shell, Auth gateway, and core domain models.
- **Phase 2: Ingestion Center (Complete):** Multi-profile parser with sandbox reconciliation.
- **Phase 3: Registry & Audit (Complete):** Advanced grid, activity ledger, and verification queue.
- **Phase 4: Governance (Complete):** Infrastructure mission control and role management.
