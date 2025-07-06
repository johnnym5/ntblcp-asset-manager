# **App Name**: Offline Asset Assist

## Core Features:

- Dynamic Excel Import: Implement dynamic asset register importer for Excel files from specific sheet names (Ntb far, Motorcycles, Pdx, Ecg monitors, Tb lamp, Ihvn, Truenat, Vehicles, GeneXpert, TBlamp c19rm). Each sheet to have its parsing logic.
- Asset Management UI: Enable users to input, edit, and view asset data, including required fields (Serial No., Model, Location) and optional items (Photos, Attachments, Condition notes).
- AI-Powered OCR: Integrate an AI-powered tool to read asset labels (OCR) from uploaded documents and images to automatically fill in asset entries and validate information. The AI tool should determine if data from the scanned asset label should override current fields.
- Integrated Document Scanner: Provide a document scanner interface that can auto-size images either from a camera or uploaded media. Auto-save generated/modified records, locally and remotely, by setting the appropriate upload to Firebase Storage.
- Cross platform Data Import/Export: Provide import and export functionality between excel, google sheets, and any data captured via the UI, along with its metadata, files, photos, attachments and conditions notes.
- Automatic Online/Offline Switch: Provide Auto-Switch User Interface capabilities. When offline the application shows `Locally Saved Assets`, whereas when there is a connection available the application switches to `Online Assets` view. Show connection state using toasts.

## Style Guidelines:

- Primary color: Navy blue (#2E3192) to convey stability and trust in managing assets.
- Background color: Very light blue-gray (#F0F4F8) for a clean, modern interface.
- Accent color: Teal (#008080) to draw attention to key actions and elements.
- Body and headline font: 'Inter' sans-serif for a modern, neutral, and highly readable style.
- lucide-react icons for a consistent and clean visual language throughout the application.
- Sidebar layout with collapsible navigation to provide easy access to asset categories and settings.
- Framer Motion for subtle transitions and animations to enhance user experience.