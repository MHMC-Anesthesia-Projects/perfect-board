# 🏥 Hospital OR Digital Whiteboard System

A responsive, touchscreen-optimized digital twin of a hospital surgical suite magnetic whiteboard designed for **65" touch displays**, desktop workstations, and mobile devices.

Built with **Next.js (App Router)**, **React**, **TypeScript**, and **Vanilla CSS Modules**, featuring real-time multi-device synchronization via **Server-Sent Events (SSE)**, immutable activity audit logging, and Voice AI shorthand processing.

---

## 📸 Overview & Layout

The whiteboard is pre-configured with a direct digital replica of the operating room magnet board:

```
+---------------------------------------------------------------------------------------------------------+--------------------+--------------------+
| TOP NAV: [Surgical Suite Whiteboard]  [Live Clock]  [User Role Badge]  [Theme]  [Sync]  [Audit]  [Keyboard]                                       |
+---------------------------------------------------------------------------------------------------------+--------------------+--------------------+
| MAIN OR           | WEST PAV          | ORTHO             | VILLAGE                                     | DEPARTURE          | LATES              |
| Runners: Cavanaugh| Runners: Chuan,   | Runner: Gunn      | Runner: Hirsch                              |                    |                    |
|          Shenoy   |          Patel P  |                   |                                             | [Doctor Order]     | 4p: CHUAN          |
| Rooms: 1 - 12     | Rooms: 1 - 12     | Rooms: 1 - 8      | Rooms: 1 - 8, P1, P2                        | - KOVAC            | 5p: HIRSCH, ANDES, |
|                   |                   |                   |                                             | - MANN             |     MCGUIRE, etc.  |
|-------------------+-------------------+-------------------+---------------------------------------------| - CAV              | 7p: GUYE, PATAGOC  |
| 9th FLOOR         | ENDO              | OB                | IVF                                         | - SHIRAK           | 8p: BEARD, LI, etc.|
| Rooms: EP1, EP2,  | Runner: Martinez  | Runner: Tallackson| Rooms: LU                                   | - GASHLER          | 7p-7a: RUTAS,      |
| CCL1-3, IR, NIR,  | Rooms: 1-4, MRI   | Rooms: 1-4        |                                             | - PATEL...         |        NORMAND     |
| TEE (1200, 1300)  |                   |                   |                                             | [Scratch Notes...] | [Late Notes...]    |
+-------------------+-------------------+-------------------+---------------------------------------------+--------------------+--------------------+
| BULLPEN (Available Unassigned Staff - Categorized Alphabetically)                                                                                 |
| [ A - F ]               | [ G - L ]               | [ M - R ]               | [ S - Z ]                                                           |
| ALANIZ, ATAGA, CHEN R...| ISHAM, LAMBA, LOWE...   | MUTYALA, NGUYEN K, ROACH| SHETTY, SHROCKEL, TRAN...                                             |
+---------------------------------------------------------------------------------------------------------------------------------------------------+
```

---

## 🔐 3-Tier User Role System & Authentication

| Role | Permissions | Login Requirement | Demo Credentials |
|---|---|---|---|
| **Basic User** | View live board, check room assignments, and **mark Breakfast `[B]` & Lunch `[L]` breaks**. | **Zero Friction / No Login Required**. Default access level for anyone loading the site on their phone, tablet, or terminal. | Open site directly |
| **Board Runner** | Move magnetic tiles between Bullpen and Rooms, assign runners, manage daily assignments, edit departure/lates, add voice notes. | Authenticated via 4-digit PIN or credentials. | **PIN**: `1234`<br/>*(Username: `runner` / Password: `runner`)* |
| **Superuser** | Full system control + **Admin Command Center**: manage user accounts (add/edit/delete/change role), edit staff roster, modify department & room layout structure, configure scheduling portal credentials. | Authenticated via 4-digit PIN or credentials. | **PIN**: `9999`<br/>*(Username: `admin` / Password: `admin`)* |

---

## 🌟 Key Features

1. **65" Touchscreen Ergonomics**:
   - **Tactile Drag-and-Drop**: Direct manipulation of 3D beveled magnetic staff tiles between rooms, runners, and the bullpen.
   - **Tap-to-Assign Quick Modal**: Ergonomic fallback so staff don't have to reach across a 65" TV screen to assign a provider.
   - **On-Screen Touch Virtual Keyboard**: Slides up from the bottom with surgical shortcuts (`TEE`, `PACU`, `DELAY`, `STAT`) for typing without physical peripherals.
2. **Break Tracking Checkboxes (`[B]` Breakfast & `[L]` Lunch)**:
   - Direct 2-state checkboxes next to every assigned provider.
   - Any staff member can tap to check off their break without logging in.
   - Status changes are immediately broadcast via SSE and recorded in the audit trail.
3. **Staff Contact Cards & Credential Management**:
   - Tap any staff magnet to inspect their credentials (`MD`, `CRNA`, `Resident`, `SRNA`), phone number with click-to-call `tel:` links, and scheduled shift.
4. **Voice AI Clinical Notes**:
   - Web Speech API microphone dictation on rooms and departure scratchpads.
   - **"AI Medical Polish"** normalizes conversational speech into concise hospital shorthand (e.g. *"patient needs transesophageal echocardiogram at twelve thirty"* ➔ *"Patient needs TEE 1230"*).
5. **Real-Time Multi-Device Sync**:
   - Built on Server-Sent Events (`/api/realtime`). Adjustments on the 65" wall screen instantly propagate to all laptops and tablets in the surgical suite.
6. **Immutable Historical Audit Ledger**:
   - Complete record of all staff movements, runner assignments, break completions, and notes with exact timestamps.
   - Slide-out ledger with search and date filters + **1-Click CSV and JSON export for operations data analysis**.
7. **Scheduling Portal Integration (QGenda / Amion / Custom)**:
   - Superuser can configure portal URL, username, and password under the Admin Dashboard.
   - Header sync button triggers instantaneous schedule refresh.
8. **Dual Visual Themes**:
   - **Physical Whiteboard Mode**: Authentic porcelain enamel whiteboard with dry-erase marker textures and realistic 3D magnetic tiles.
   - **OR Dark Mode**: Deep slate high-contrast glassmorphic UI for surgical lighting and glare reduction.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **UI & Logic**: React 19, TypeScript
- **Styling**: Tailored Modern Vanilla CSS Modules + CSS Custom Properties (Zero runtime CSS dependency)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Data Persistence**: File-backed atomic JSON store (`data/whiteboard_state.json`, `data/users.json`, `data/audit_log.json`)
- **Real-Time Engine**: Server-Sent Events (SSE) `/api/realtime`

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or `http://localhost:3001` if port 3000 is occupied).

---

## 👥 Default Demo Accounts

- **Superuser**: PIN `9999` (or `admin` / `admin`)
- **Board Runner**: PIN `1234` (or `runner` / `runner`)
- **Basic User**: No credentials required (loaded automatically)
