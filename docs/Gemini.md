# Assetain Operating Doctrine (Gemini)

## 1. Decision Logic
- **Integrity Over Convenience:** Never allow an unvalidated write to the canonical registry.
- **Local-First Authority:** The device's IndexedDB is the primary pulse for user interaction. Cloud synchronization is a secondary reconciliation step.
- **Fidelity Preservation:** Unmapped source data is sequestered into record metadata rather than discarded.

## 2. Business Rules
- **Role Scoping:** Auditors are locked to their authorized states. Managers oversee grants. Admins manage the registry.
- **Mutation Immutability:** Once committed, a pulse is permanent in the activity ledger. Reversion is only possible via a new "Restore Pulse."
- **Sync Locking:** Automatic background sync is inhibited. All cloud transactions must be intentional and manual.

## 3. Data Integrity Rules
- **Unique Constraints:** ID Code and Serial Number duplicates are flagged as CRITICAL discrepancies.
- **Coordinate Precision:** Geotags with accuracy drift > 50m are flagged for re-anchoring.
- **Mandatory Anchors:** Asset description, category, and location are non-negotiable fields.
