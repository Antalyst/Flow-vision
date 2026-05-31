# 🌊 Flow-vision: Comprehensive Documentation

**Flow-vision** is a sophisticated document management and tracking system designed for seamless document processing, automated tracking, and AI-driven analysis. Built with modern web technologies, it provides a robust platform for handling sensitive documents with built-in encryption and real-time tracking capabilities.

---

## ✨ Key Features

- 📑 **Document Processing**: Support for PDF and DOCX file formats.
- 🔍 **Real-time Tracking**: Automatically generates unique tracking IDs and embeds QR codes for physical/digital document tracing.
- 🤖 **AI-powered Analysis**: Integrated with Groq (Llama 3.3) to automatically extract titles and descriptions from uploaded content.
- 🛠️ **Seamless Preview**: Live in-browser preview for both PDF and Word documents.
- 🔐 **Secure Management**: End-to-end encryption for document data and secure storage using Supabase and MySQL.
- 💬 **Real-time Peer-to-Peer Chat**: Org-isolated discussion threads linked directly to documents, using Socket.io with strict `org_id` multi-tenancy enforcement for sub-second message delivery and non-blocking database persistence.
- 📱 **Responsive Design**: A sleek, modern dashboard built with Tailwind CSS.

---

## 🏗️ Technical Architecture & Workflows

Flow-vision is built as a full-stack Nuxt application, leveraging the power of Nitro for server-side logic and Supabase/MySQL for data persistence.

### 1. Document Lifecycle Workflow
1.  **Ingestion**: Users upload files (PDF/DOCX) via the frontend.
2.  **Tracking ID Generation**: A unique hashid (`FLOW-XXXXX`) is generated instantly.
3.  **Visual Injection**:
    *   **PDF**: The `pdf-lib` library embeds a tracking QR code directly onto every page of the document.
    *   **DOCX**: A QR code is overlaid on the document preview and included in the print-ready HTML generation.
4.  **AI Analysis**: The document text is extracted and sent to the **Groq AI (Llama 3.3)** engine to derive a concise title and summary.
5.  **Secure Storage**: The document buffer is encrypted using an AES-256-GCM Nitro plugin before being stored in the MySQL database.
6.  **Tracking**: The trackable ID allows offices to update the document's stage (e.g., "Pending", "Approved", "Released").

### 2. Core Components
- **`useDocProcessor` (Frontend)**: Handles file reading, QR generation, and conditional rendering (PDF vs. Word).
- **`aiAnalyzer` (Server)**: Interfaces with `llama-3.3-70b-versatile` via Groq SDK for sub-second analysis.
- **`Encryption Plugin` (Server)**: Nitro plugin providing mandatory encryption/decryption for all database payloads.
- **`Stateful Socket Plugin` (Server)**: Org-isolated Socket.io engine handling real-time messaging using organization-scoped rooms (`org_${orgId}_user_${userId}`), in-memory user→org registry for O(1) cross-org verification, and asynchronous background MySQL database writes. Validates all 5 required `IChatPayload` fields (`document_id`, `sender_id`, `receiver_id`, `org_id`, `message_text`) before dispatch. Cross-organization messages are silently dropped with security warnings logged.
- **`Chat Type System` (Server)**: Centralized strongly-typed interfaces (`IChatPayload` for writes, `IChatResponse` for reads) in `server/utils/types/chat.ts`, serving as the single source of truth for the `chats` table schema.
- **`Chat Storage Worker` (Server)**: Asynchronous MySQL persistence helper accepting typed `IChatPayload` objects, with parameterized INSERT targeting all 6 columns and explicit foreign key constraint violation logging.
- **`Ingestion Page (/upload)` (Frontend)**: Glassmorphic drag-and-drop page using Supabase auth caches to register document uploads.
- **`Documents Ingestion API (/api/documents)` (Server)**: Parses payloads, encrypts binary files using AES-256-GCM, and routes records to MySQL.
- **`Chats Retrieval API` (Server)**: Org-secured stateless GET endpoint (`/api/chats/:org_id?document_id=X`) returning all 7 `chats` table columns mapped to `IChatResponse[]`. Enforces `org_id` route-level isolation with document `office_id` parity verification, returning `403 Forbidden` on organizational mismatch.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [Nuxt 4](https://nuxt.com/) (Vue.js 3)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Pinia](https://pinia.vuejs.org/)
- **Utilities**: `pdf-lib`, `docx-preview`, `qrcode`, `docxtemplater`

### Backend & API
- **Server**: [Nitro](https://nitro.unjs.io/)
- **Real-Time Communication**: [Socket.io](https://socket.io/)
- **Database**: [MySQL](https://www.mysql.com/) & [Supabase](https://supabase.com/)
- **AI Integration**: [Groq SDK](https://groq.com/)
- **Node Utilities**: `mysql2`, `bcrypt-ts`, `hashids`, `mammoth`

---

## 📂 Project Structure

```text
├── app/
│   ├── components/      # UI Components
│   ├── pages/           # Application Routing
│   │   ├── upload.vue   # Ingestion Portal Page
│   │   └── ...
│   ├── stores/          # Pinia State Management
│   └── layouts/         # Page Layouts
├── server/
│   ├── api/             # API Endpoints
│   │   ├── chats/
│   │   │   └── [org_id].get.ts  # Org-scoped chat history GET endpoint (org_id route param)
│   │   ├── documents/
│   │   │   ├── index.post.ts # Document Encryption & Routing POST handler
│   │   │   └── [document_id].get.ts
│   │   └── ...
│   ├── utils/           # AI Logic, Parsers, Hashids, and Chat storage helpers
│   │   ├── chatStorage.ts # Typed async MySQL persistence (IChatPayload → chats table)
│   │   ├── types/
│   │   │   └── chat.ts  # IChatPayload & IChatResponse interfaces (schema source of truth)
│   │   └── ...
│   └── plugins/         # Database, Encryption, and Socket.io Plugins
│       ├── socket.ts    # Org-isolated stateful Socket.io engine with multi-tenancy guardrails
│       └── ...
├── assets/              # Global Styles and Tailwind Config
└── public/              # Static Assets
```

---

## 🛠️ Setup & Development

### 1. Installation
```bash
npm install
```

### 2. Environment Variables (.env)
```env
MYSQL_HOST=your_host
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_db

NUXT_PUBLIC_SUPABASE_URL=your_url
NUXT_PUBLIC_SUPABASE_KEY=your_key
GROQ_API_KEY=your_groq_key
ENCRYPTION_KEY=your_32_byte_key
```

### 3. Run Development Server
```bash
npm run dev
```

---

## 📊 Database Schema Highlights
- **`documents`**: Encrypted data, tracking IDs, `office_id` foreign key for organizational ownership, and metadata.
- **`offices`**: Org-level routing, permissions, and the primary isolation boundary for multi-tenant access control (`org_id`).
- **`chats`**: `message_id` (PK), `document_id` (FK → documents), `sender_id` (FK → users), `receiver_id` (FK → users), `org_id` (FK → offices), `message_text` (TEXT), `created_at` (TIMESTAMP). Organization-scoped and verified against the parent document's `office_id`.
- **`stages`**: State-machine tracking for document progress.

---

## 📄 License
MIT License - Flow-vision Project 2026
