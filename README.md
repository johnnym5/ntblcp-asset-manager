
# Assetain

**Assetain** is a professional, offline-first Asset Management and Verification platform designed for high-stakes environments where internet connectivity is intermittent or unavailable. Built with Next.js, Tailwind CSS, and a hybrid Firebase architecture, it provides a robust solution for tracking, auditing, and maintaining large-scale asset inventories.

## Core Capabilities

### 🌐 Hybrid Online/Offline Architecture
*   **Offline-First by Design**: Utilizes IndexedDB for full browser-based persistence. Work continues seamlessly without an internet connection.
*   **Intelligent Synchronization**: Detects connection state and provides a controlled "Sync Up/Down" workflow to resolve conflicts and update the global cloud database.
*   **Regional Data Scoping**: Automatically downloads only the assets relevant to a user's authorized region to optimize device storage and performance.

### 📊 Comprehensive Asset Management
*   **Dynamic Inventory Dashboard**: Real-time "Inventory Pulse" providing 10+ key metrics on data quality, verification coverage, and asset health.
*   **Advanced Filtering**: Multi-criteria filtering by location, assignee, status, condition, and missing data fields.
*   **Batch Operations**: High-speed batch editing for categories or individual selections, enabling thousands of records to be updated in seconds.

### 📑 Professional Reporting & Imports
*   **Smart Excel Scanner**: Automatically detects and maps headers from complex workbooks to internal templates.
*   **Automated Travel Reports**: Generates professional Word documents (`.docx`) summarizing field verification findings, objectives, and exceptions based on active project data.
*   **Flexible Schema**: Supports custom fields and per-sheet column configurations managed via an administrative interface.

### 🔐 Enterprise Security & Controls
*   **Role-Based Access Control (RBAC)**: Distinct permissions for Administrators, Field Users, and Guest accounts.
*   **Verification Guardrails**: Optional "Asset List Lock" prevents accidental record creation/deletion during critical audit periods.
*   **Change Audit Log**: Tracks modifications including timestamps, user identity, and regional scope.

## Technical Foundation
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Shadcn UI
- **Database**: Hybrid Firestore (Configuration) & Realtime Database (High-volume Assets)
- **Client Storage**: IndexedDB (via `idb` library)
- **Animations**: Framer Motion

---

© 2024 Assetain. Professional Asset Intelligence.
