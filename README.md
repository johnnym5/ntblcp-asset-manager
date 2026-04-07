# Assetain | Professional Asset Intelligence

**Assetain** is a mission-critical, enterprise-grade Asset Management and Verification platform engineered for high-integrity operations in geographically dispersed and low-connectivity environments. Built with a "Local-First" philosophy, it transforms complex physical asset registers into actionable intelligence through automated verification workflows, regional governance, and deep data engineering.

---

## 🏗 System Architecture: Triple-Layer Redundancy

Assetain utilizes a sophisticated storage topology to ensure 100% data availability regardless of internet stability.

1.  **Cloud Authority (Firestore)**: The primary source of truth. All verified pulses are broadcast here for global reporting and regional dashboards.
2.  **Shadow Mirror (RTDB)**: A high-speed, hot-standby replica. Every modification to the Cloud Authority is instantly mirrored to the Realtime Database to provide a failover pulse during primary service latency.
3.  **Local Persistence (IndexedDB)**: The device’s internal engine. All user interactions occur here first. Mutations are enqueued in a Write-Ahead Log (Sync Queue) for background synchronization.

---

## 🔐 Identity Governance (RBAC) & Regional Scoping

The system implements a strict Role-Based Access Control (RBAC) model to maintain registry integrity.

| Role | Permissions | Scope |
| :--- | :--- | :--- |
| **SuperAdmin** | Full system reset, unrestricted mutation, user provisioning. | Global |
| **Admin** | Manage projects, edit global configuration, adjudicate requests. | Global |
| **Manager** | Batch edit, export executive reports, view activity ledger. | Regional / Zonal |
| **Verifier** | Physical asset assessment, update status/remarks, sync pulse. | State-Locked |
| **Viewer** | Read-only registry access, view dashboard metrics. | State-Locked |

**Regional Scope Locking**: Non-admin users are cryptographically locked into their authorized geographical zones (e.g., Lagos State). They cannot view or mutate records outside their assigned pulse.

---

## 🖥 Workstation Breakdown

### 1. Mission Control (Dashboard)
The primary entry pulse. It provides high-density analytics including:
*   **Audit Coverage**: Real-time percentage of physically verified assets.
*   **Fidelity Index**: Global score based on data quality and pattern consistency.
*   **Readiness Hub**: Quick-access tiles for pending tasks and critical alerts.

### 2. Inventory Hub (Registry)
A dual-mode browser for the entire project register.
*   **Folder View**: Groups assets into logical categories. Supports multi-select for batch sync, structural renaming, or global purge pulses.
*   **Table View**: A high-density grid for detailed inspection. Features customizable headers, advanced sorting, and real-time filtering.
*   **Profile Dossier**: A deep-dive view into an asset’s technical metadata, forensic signatures, and visual evidence.

### 3. Ingestion Center (Import)
A deterministic engine designed to parse complex, hierarchical Excel workbooks.
*   **Structural Discovery**: Automatically identifies group boundaries by traversing "Column A" markers.
*   **Synthetic Headers**: Automatically maps columns to registry fields (S/N, ID Code, etc.) even when explicit header rows are missing.
*   **Sandbox Reconciliation**: Stages imported data in an isolated layer for review before merging into the production registry.

### 4. Records to Review (Verification)
Optimized for field auditors on the move.
*   **One-Tap Assessment**: High-speed triggers to mark assets as "Verified" or "Discrepancy".
*   **Identity Scanner**: Uses the device camera to scan physical QR labels and instantly open the corresponding digital pulse.

### 5. Pending Sync (Write-Ahead Log)
Manages the bidirectional movement of data between the device and the cloud.
*   **Sequential Replay**: Changes are broadcast in chronological order to prevent state corruption.
*   **Accordion Grouping**: Pending updates are categorized by operation type (New, Edit, Delete) for clear review.
*   **Select All**: Allows for the batch broadcast of thousands of modifications with a single pulse.

### 6. Activity Ledger (History)
An immutable audit trail of every modification made to the registry.
*   **Forensic Diffs**: Shows exactly which fields changed, including "Before" and "After" values.
*   **Restoration Pulse**: Allows administrators to undo specific mutations and roll back records to their previous verified state.

### 7. Tactical Alerts (Exceptions)
A dedicated cockpit for managing high-risk registry events.
*   **Loss Monitoring**: Tracks assets marked as Stolen or Unsalvageable.
*   **Escalation**: Provides one-tap "Notify Manager" pulses for urgent field issues.

### 8. Infrastructure Command
The low-level orchestration suite for system maintenance.
*   **Failover Engine**: Manually pivot the primary read authority between Firestore and the Shadow Mirror.
*   **Node Purge**: Tiered wipe functions to reset specific storage layers (Local, Mirror, or Global).
*   **Self-Test**: Executes a holistic heartbeat check across all storage and auth nodes.

---

## 🛠 Advanced Logic Pulses

*   **Integrity Engine**: A heuristic scanner that proactively identifies duplicate serials, inconsistent location naming, and high-value data gaps.
*   **Version Control**: A global system counter that increments with every committed change, providing a deterministic index for registry snapshots.
*   **PWA Pulse**: 100% offline functionality with automatic network detection and standalone installation capabilities.
*   **High-Density Scaling**: All UI elements are scaled to 50% of standard web components to maximize the "Data-to-Pixel" ratio for professional workstations.

---
© 2024 Assetain. Professional Asset Intelligence. Deterministic. Resilient. Secure.
