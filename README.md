# Assetain | Professional Asset Intelligence

**Assetain** is a mission-critical Asset Management and Verification platform designed for high-integrity operations. Built with a "Local-First" philosophy, it ensures 100% data availability even in remote areas without internet, while providing forensic-level traceability for all registry modifications.

---

## 🏗 System Overview

Assetain uses a triple-layer storage architecture to ensure maximum resilience:
1.  **Cloud Database**: The central source of truth for global reporting and reconciliation.
2.  **Shadow Mirror**: A real-time standby replica providing high-availability failover.
3.  **Local Storage**: Device-level encrypted persistence allowing for seamless offline work.

---

## 🖥 Workstation Breakdown

### 1. Dashboard (Overview)
Your primary mission-control hub.
*   **Asset Summary**: Real-time statistical counters for the entire registry (Total Assets, Good Condition, Critical State, etc.).
*   **Problem Assets**: An interactive scanner that highlights records with missing data, discrepancies, or critical conditions.
*   **Quick Samples**: A high-fidelity carousel for browsing sample records from your assigned regional scope.
*   **Activity Ledger**: A collapsible feed showing recent sync status and audit requests.

### 2. Asset Registry (Inventory)
The core database workspace for managing asset folders.
*   **Folder View**: Browse assets grouped by logical categories (e.g., Laptops, Motorcycles, Vehicles).
*   **Multi-Project Support**: Enable and view multiple projects (e.g., TB and C19) concurrently in a single unified view.
*   **Advanced Table & Cards**: Switch between a high-density table for desktop or an interactive card grid for mobile assessment.
*   **Technical Dossier**: A comprehensive profile view for every asset, including history, data checklists, and visual evidence.

### 3. Field Assessment (Verification)
A specialized workflow optimized for on-site auditors.
*   **One-Tap Verification**: Quickly mark assets as "Verified" or report "Discrepancies."
*   **Condition Reporting**: Record the physical state of assets using standardized condition status updates.
*   **Audit Observations**: Document site findings and remarks directly on the record.

### 4. History (Audit Trail)
A deterministic trace of every single modification made to the registry.
*   **Side-by-Side Diffs**: View "Old Value" vs "New Value" for forensic auditing of every change.
*   **Undo Function**: Administrators can instantly revert any update to its previous state if a mistake is detected.

### 5. Settings (Governance)
The administrative control center for registry orchestration.
*   **General Settings**: Manage visual themes and your personal system access passcode.
*   **Project Scope**: Enable/disable projects, add new grants, and manage asset folder definitions (Rename, Delete, and Setup).
*   **Personnel Directory**: Provision system auditors, assign regional state scopes, and manage access levels.
*   **System Health**: Access granular database explorer tools and error audits (Super-Admin only).

### 6. Sync Status (Connectivity)
Manages the heartbeat between your device and the cloud.
*   **Push/Pull Logic**: Manually broadcast your local work or download the latest registry scope from the cloud.
*   **Conflict Resolution**: View and resolve any data conflicts that occurred during offline work.

---

## 🛠 User Instructions

### Initial Setup & Login
1.  **Enter Credentials**: Input your **Username** and **Passcode**.
2.  **Location Selection**: If you manage multiple states, select your target regional scope for the current session.
3.  **Synchronize**: Upon first login, the system will automatically pull your authorized registry scope from the cloud.

### Managing Assets
1.  **Browse**: Use the **Registry** to open an asset folder.
2.  **Search**: Use the search bar (or **⌘K**) to find assets by Description, Tag ID, or Serial Number.
3.  **Inspect**: Click any record to open the **Dossier**. Use **Right-Click** or **Long-Press** for quick actions.
4.  **Edit**: Update any field. If you are not an Admin, your changes will be sent to the **Approval Queue**.

### Physical Verification (Field Mode)
1.  **Open Assessment**: Select an asset in the registry or use the **Verify** workstation.
2.  **Confirm Identity**: Check the Tag ID and Serial Number against the physical item.
3.  **Update Status**: Tap **Verified** if everything matches.
4.  **Report Issues**: If the asset is damaged or missing, select the appropriate condition and add a remark.

### Administrative Governance
1.  **Manage Folders**: Go to **Settings > Project Scope**. Here you can Rename folders or use the **Wrench** icon to customize which fields are shown in Table, Card, and Checklist views.
2.  **Manage Users**: Go to **Settings > Personnel** to add new auditors. Set their **Passcode** and lock them to specific **States**.
3.  **Approve Changes**: Admins see a notification bell for pending changes. Open the **Inbox** to Approve or Reject these updates.

---
© 2024 Assetain. Professional. Resilient. Secure.
