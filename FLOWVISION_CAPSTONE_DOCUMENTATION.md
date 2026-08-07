# FlowVision: AI-Powered Document Monitoring Framework

## Decentralized Intelligence. Unified Control.

---

## 1. Project Overview & Problem Statement

**FlowVision** is a high-performance architectural spine for Local Government Units (LGUs), designed to unify offices, couriers, and clients into a single operational tracking ecosystem. It provides a structured framework for monitoring the movement of physical documents across government office networks, ensuring that every routing event, handoff, checkpoint, and delivery stage is visible, auditable, and measurable.

Traditional LGU document processing often suffers from physical administrative bottlenecks, fragmented office coordination, manual courier handoffs, delayed status updates, and weak accountability across processing stages. These issues produce a zero-visibility tracking environment where clients and administrators cannot reliably determine where a document is, who handled it, how long it has been waiting, or whether it is approaching a compliance or Service Level Agreement (SLA) breach.

FlowVision resolves these challenges by introducing a unified routing mesh, QR-based physical checkpoint validation, real-time telemetry dashboards, and centralized AI-assisted ingestion and semantic search. The framework is built to reduce routing ambiguity, expose bottlenecks early, strengthen chain-of-custody accountability, and provide operational intelligence to both clerks and administrators.

> **Crucial Clarification:** FlowVision focuses on the **physical tracking and metadata registration of physical documents moving through physical office spaces**. It is not designed as a heavy OCR platform for full digital document text extraction. Instead, the framework captures operational metadata such as tracking numbers, office routes, courier identity, timestamps, QR checkpoint hashes, SLA status, and routing events.

---

## 2. Core Architecture & System Features

### 2.1 Unified Routing Mesh & Route Checks

The Unified Routing Mesh models the LGU document pipeline as a sequence of office checkpoints. Each office functions as a route-aware processing station.

| Component | Technical Description |
|---|---|
| Office Nodes | Represent physical offices, stations, or service counters participating in the document workflow. |
| Stage Steps Sequences | Define valid routing paths between offices to reduce ad hoc document movement and routing ambiguity. |
| Live Telemetry | Monitors document state, transit time, queue status, and checkpoint progress at every hop. |
| Route Validation | Enforces that all office ids in a stage steps sequence belong strictly to the caller's `org_id` to prevent cross-tenant leakages. |
| Bottleneck Detection | Flags offices or route segments that exceed expected processing thresholds. |

### 2.2 Smart QR Checkpoints & Ledger

Smart QR Checkpoints create physical-to-digital validation loops. Each scan binds a physical event to a digital custody record in the Supabase `document_tracking_events` ledger table.

| Checkpoint Status | Purpose | Captured Metadata |
|---|---|---|
| `CREATED` | Registers the physical document into the tracking pipeline. | Document ID, origin office, route sequence snapshot, metadata |
| `PICKED_UP` | Confirms courier pickup for transit. | Messenger ID, origin office, target office, timestamp |
| `ARRIVED_AT_OFFICE` | Validates courier delivery to the receiving office. | Handler ID, receiving office name, timestamp |
| `DISCREPANCY_REPORTED` | Flags any routing errors or missing packets. | Anomaly notes, reporter ID, location, timestamp |
| `COMPLETED` | Marks final drop-off and route closure. | Final office, completion timestamp, closing ledger entry |

### 2.3 Operations Console & Dual-Database Storage

The system leverages a **dual-database architecture** designed to combine real-time sync with high-performance blob storage:

1. **Supabase (PostgreSQL)**:
   - Manages user sessions, authentication, and Role-Based Access Control (RBAC: `client`, `employee`, `employee_sub_user`, `messenger`).
   - Stores tracking metadata: `documents`, `offices`, `document_tracking_events`, `document_categories`, and the `org` config table.
   - Powers Private Messaging/DMs via `conversations`, `conversation_participants`, and `direct_messages` tables.
2. **MySQL Database**:
   - Manages large file binaries/blobs securely in the `document_storage` table, preventing database bloat on the real-time Supabase cluster.
   - Stores document-linked team discussion logs in the `chats` table.

---

## 3. Advanced AI & Semantic Search Engine

### 3.1 AI-Driven Metadata Ingestion

During document upload, FlowVision uses **Groq AI (Llama-3.3-70b-versatile)** to automatically analyze the file buffer.
- Extracts key context to generate a concise, human-readable document **Title** and **Summary**.
- Speeds up registration workflows by eliminating manual form-filling, while storing the resulting metadata in the `documents` table.

### 3.2 Natural Language Query (NLQ) Semantic Search

The system hosts a Semantic Search Engine under the `/api/documents/semantic-search` endpoint. Instead of strict keyword matching, users search through natural language.
- User input is matched against available document metadata context (title, description, status, uploader, timestamp).
- Evaluated by the **Llama 3.3** engine to select matching records.
- Returns a structured JSON matches array including a brief, custom explanation of why each document matched the user's search intent.

---

## 4. Multi-Tenant Boundaries & Whitelisting

FlowVision implements rigid boundary guards to separate organizations and secure citizen data:

### 4.1 Cross-Tenant Isolation

- Every API endpoint resolves the caller's profile (`org_id`) directly from the server session rather than trusting frontend inputs.
- Document-linked MySQL chat history (`/api/chats/:org_id`) runs a strict ownership check, rejecting request mismatch with `403 Forbidden`.
- During upload, route checkpoint verification checks every step in the routing sequence to ensure it belongs to the caller's organization.

### 4.2 Employee Verification Whitelist

For organizations requiring tight control over staff registration:
- **Feature**: Toggleable whitelist enforcement (`enable_employee_validation` in the `org` table).
- **Control**: Validates registration requests against the `org_employee_whitelists` table, restricting employee sign-ups to pre-approved IDs, names, and email address pairings.

---

## 5. Technical Stack Matrix

| Architectural Layer | Technologies | Role in FlowVision |
|---|---|---|
| Frontend / Interface | Vue.js, Nuxt.js, Tailwind CSS, Pinia | Client/Employee responsive pages, state caching, glassmorphic UI styles, dark mode toggle. |
| Real-time messaging | Supabase Realtime Channels | Listens to postgres replication changes in `direct_messages` for instant user-to-office DMs. |
| Backend API | Nitro | Server-side routing, RBAC filters, tenant verification logic, document streaming. |
| Database & Services | Supabase, MySQL | Core tracking tables, relational mapping, and secure MySQL blob file storage. |
| Document Tools | `pdf-lib` | Stamps tracking QR payloads directly on PDF/Word documents upon ingestion. |
| AI Integration | Groq SDK (`llama-3.3-70b-versatile`) | Automatic metadata extraction and NLQ semantic search engine. |

---

## 6. Database Schema & Data Models

### 6.1 Core Tables (Supabase)

```sql
-- Document Categories (RLS enabled, org-isolated)
CREATE TABLE public.document_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.org(org_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Documents Metadata
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tracking_status VARCHAR(64) DEFAULT 'CREATED',
  current_step INT DEFAULT 1,
  stage_id UUID,
  qr_code_data TEXT,
  assigned_messenger_id UUID,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  mysql_storage_id INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tracking Timeline Ledger
CREATE TABLE public.document_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  status VARCHAR(64) NOT NULL,
  step_index INT,
  office_id UUID,
  office_name VARCHAR(255),
  actor_id UUID,
  actor_role VARCHAR(64),
  actor_name VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Whitelisting Rules
CREATE TABLE public.org_employee_whitelists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.org(org_id) ON DELETE CASCADE,
  employee_id_number VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT uk_org_employee_id UNIQUE (org_id, employee_id_number)
);
```

### 6.2 Core Tables (MySQL)

```sql
-- Document Binary Storage
CREATE TABLE document_storage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  file_blob LONGBLOB NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128),
  document_uuid VARCHAR(64)
);

-- Document Chat Logs
CREATE TABLE chats (
  message_id INT PRIMARY KEY AUTO_INCREMENT,
  document_id INT NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL,
  org_id VARCHAR(64) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Installation & Local Development Setup

### 7.1 Repository Setup

```bash
git clone <repository-url>
cd Flow-vision
npm install
```

### 7.2 Environment Configuration

Create a local environment file `.env`:

```env
# MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=flowvision
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password

# Supabase
NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq API
GROQ_API_KEY=your_groq_api_key
```

### 7.3 Local Development Server

Run the Nuxt development server:

```bash
npm run dev
```

The application is available at:
`http://localhost:3000/`
