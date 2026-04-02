# Prama Engine: The Forensic Architecture

Welcome to the Prama Codebase. This document explains the high-level architecture and the technical data flow of the Prama Forensic Engine.

## 1. High-Level Perspective
Prama sits at the intersection of **Neurobiology** (the snapshot nature of trauma) and **Jurisprudence** (the requirement for linear evidence). 

The application's core purpose is to take **"Fragmented Memory Deposits"** (non-linear notes) and "stitch" them into a **"Forensic Statement of Facts"** (a chronological timeline) for legal use.

---

## 2. Technical Stack
- **Frontend**: Vite + React + Tailwind CSS (High-fidelity Midnight Blue design system).
- **Backend**: Node.js + Express + MongoDB (Case/Session data models).
- **Security**: AES-256-CBC encryption for all memory content.
- **AI Engine**: xAI Grok-4.20-Reasoning (2M Context window).

---

## 3. The Forensic Data Flow

### Phase A: Anchoring (The Case)
When a new legal case is opened, we define the **Base Layer** (`backend/models/Case.js`). This layer contains "Temporal Anchors" that define the boundaries of the event:
- **Incident Period**: Start and end dates.
- **Environmental Context**: Weather, locations, and lunar anchors.
- **Anchor Days**: Birthdays or holidays that help the victim remember relative time (e.g., "Two days after my birthday").

### Phase B: Capturing (The Session)
Memories are rarely linear. Prama uses a **Session-based Capture System** (`backend/models/Session.js`):
- Each session contains multiple **Memory Deposits**.
- Each deposit is a "snapshot" of sensory data (Visual, Auditory, Somatosensory).
- **Encryption**: Before saving to MongoDB, every note is encrypted via `backend/utils/encryption.js` (AES-256-CBC).

### Phase C: Stitching (The AI Protocol)
This is the heart of the engine (`backend/routes/stitch.js`). When you click "Generate Narrative":
1. **Decryption**: The backend fetches all sessions and decrypts the notes using the `ENCRYPTION_KEY`.
2. **Protocol Injection**: We wrap the data in the **"Prama Narrative Architect"** system instruction.
3. **AI Reasoning**: Grok-4.20 analyzes the fragmented notes against the base layer anchors to calculate the most likely chronology.
4. **Zero-Hallucination Guard**: The protocol strictly forbids the AI from "inventing" bridge sentences. If a date is unknown, it remains a **"Floating Event."**

### Phase D: Chronology (The Statement of Facts)
The AI returns a structured JSON object to the **Chronology.jsx** page:
- **Structured Timeline**: Events placed with "Exact," "Approximate," or "Relative" precision.
- **Source Tracing**: Every entry on the timeline is linked to its original `depositId`.
- **Forensic Alerts**: The AI flags inconsistencies or patterns across different recording sessions.

---

## 4. Key Security Rules
> [!IMPORTANT]
> **ENCRYPTION_KEY Fidelity**: A change to the `ENCRYPTION_KEY` in the `.env` file will render all previous memory deposits unreadable. Never change this key for a live case.

> [!TIP]
> **Case ID Decoding**: Always use `decodeURIComponent(caseId)` in the backend routes to handle cases with special characters like spaces or parentheses.

---

## 5. Directory Guide
- `/backend/routes/stitch.js`: Core AI orchestration logic.
- `/backend/utils/encryption.js`: The AES-256-CBC vault logic.
- `/frontend/src/pages/Chronology.jsx`: The interactive Statement of Facts UI.
- `/frontend/src/pages/SessionCapture.jsx`: The recording and deposit system.
