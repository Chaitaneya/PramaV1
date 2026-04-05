# Prama Forensic Workspace

Prama is an enterprise-grade Legal Narrative Orchestrator designed to empower attorneys and advocates by synthetically transforming non-linear trauma deposits into rigorously structured, court-admissible chronologies and affidavits. Built upon an advanced trauma-informed architecture, Prama acts as a highly secure, cryptographic intermediary between volatile survivor testimonies and strict juridical paradigms.

## Comprehensive System Capabilities

### Cognitive AI & Narrative Orchestration
- **Cognitive Narrative Orchestrator (Multi-Model AI Stitching Engine):** An advanced, horizontally scalable AI Orchestrator integrating LLMs (Groq, Llama, Gemini) to autonomously translate multilingual memory deposits, execute high-fidelity temporal anchoring, and synthesize structurally fragmented data into a cohesive forensic timeline.
- **Deterministic Server-Side Pipeline & AI Orchestrator Layer:** Bypasses LLM hallucinations via a proprietary deterministic server-side pipeline. Ensures flawless verbatim translation, absolute temporal grounding, and logic-gated narrative assembly.
- **Heuristic Semantic Conflict Resolution & Algorithmic Discrepancy Detection:** Deploys a rigorous, multi-pass semantic evaluation engine to autonomously detect chronological paradoxes. Logically contradictory forensic events are strictly isolated and routed to an advanced "Forensic Alerts Dashboard" for manual attorney review.
- **Cross-Lingual AI Subsystem (Dynamically Orchestrated i18n):** Employs real-time natural language processing algorithms (seamlessly handling Hindi, Hinglish, & English) to optimize local user accessibility, while strictly enforcing formal English output across all downstream court-ready legal documentation.
- **Contextual Temporal Anchoring & Base-Layer Deduction Algorithms:** Leverages sophisticated inferential logic to algorithmically map conceptually vague time references (e.g., "during Diwali") to precise absolute dates utilizing a foundational case legal trajectory ("Base Layer").

### Trauma-Informed Session Ingestion Architecture
- **Asynchronous Cognitive Intake & Session Orchestration Flow:** A highly resilient session management framework that supports pause/end/resume states, granting users full sovereignty over the chronological cadence of memory deposit recording.
- **Biometric-Adjacent Pacing & Emotional Modulation Check-Ins:** Algorithmically introduces pacing modules and emotional check-points to proactively mitigate hyperarousal during the extraction of intense traumatic typologies.
- **Cryptographically Secure Granular Data Eradication:** Empowers survivors with absolute data sovereignty via the ability to instigate permanent, cryptographically-secure destruction algorithms for individual memory nodes directly within the workspace payload.
- **Immutable File Attachment & Image-First Source Tracing Taxonomy:** Seamlessly binds visual evidentiary media directly to individual memory nodes, ensuring perfect topological propagation and immutable source tracing throughout the synthesized legal chronology.

### UI / UX Topology & Dashboard Metrics
- **"Brave Stories" Cognitive Inspiration Hub:** An engineered dashboard quadrant mathematically optimized to display high-impact, justice-oriented paradigm successes, fostering user resiliency.
- **Dynamic & Tactile Chronology Matrix:** A haptically rewarding, drag-and-drop temporal visualization interface, empowering attorneys to heuristically adjust unanchored events dynamically.
- **Neuro-Aesthetic "Midnight Blue" Design System:** Sidesteps sterile clinical heuristics in favor of a specialized, psychologically restorative "Midnight Blue" standard, complemented by intelligent context-aware footer modules and dynamic sliding intake logic.
- **Global Command Search Architecture:** Implementing robust, command-line style omni-search telemetry to instantly access localized case registries across the entire topological ecosystem.
- **Algorithmic Watermark Imprinting:** Embedded proprietary cryptographic branding layers embedded intrinsically within exported artifacts.

### Cryptography, Federation & Interoperability
- **Military-Grade Payload Encryption System:** Provides uncompromising end-to-end cryptographic protection (AES-256) on both client and server axes, ensuring absolute confidentiality of all volatile trauma metadata.
- **Federated Evidence Exchange (Sovereign Multi-Institutional Access Control):** A highly secure schema providing dynamically expirable, role-based tokenized authentication. Facilitates zero-trust, auditable evidence brokering between discrete organizational silos (legal counsel, NGOs, therapeutic practitioners).
- **Automated Document Synthesis & Sovereign Evidence Export:** Executes one-click deterministic rendering of aggregated timeline events into beautifully formatted, court-admissible PDF legal affidavits ready for immediate litigation transmission.

## Features Built During 36Hr Hackathon

- **Verifiable Traceability:** Immutable source-tracing from raw trauma deposits directly to the final legal chronology. Every legal proposition is intrinsically linked back to its exact phenomenological origin.
- **Proactive Conflict Detection:** A ruthless heuristic engine continuously evaluates semantic meaning to automatically flag chronological paradoxes and logical inconsistencies before they manifest as case-breaking vulnerabilities.
- **Cryptographic Integrity:** Fortified with military-grade, unbreakable AES-256 payload encryption. The platform operates as a zero-knowledge high-security vault, enforcing absolute data sovereignty over volatile survivor metadata.
- **Absolute Temporal Grounding:** State-of-the-art base-layer deduction algorithms contextually anchor vague, fragmented memory shards (e.g., "during the winter of 2019") onto a concrete, mathematically precise timeline.
- **Trauma-Informed UI/UX:** A neuro-aesthetic interface engineered with biometric-adjacent pacing, emotional check-ins, and granular destructive controls. Sidesteps sterile clinical heuristics to act as a restorative digital sanctuary.
- **Asynchronous Session Capture:** Complete sovereignty over the tempo. Pause, end, and seamlessly resume memory deposits natively, granting users ultimate control over when and how sensitive testimony is materialized.
- **Autonomous AI Orchestration:** A multi-model AI stitching engine governing complex data assembly and cross-lingual translation via a flawless deterministic pipeline, effectively disintegrating LLM hallucinations.
- **Comprehensive AI Review Layer:** Instantly inject complex legal documents and visual evidentiary media. The underlying AI layer autonomously digests, scrutinizes, and seamlessly weaves these assets directly into distinct memory nodes.
- **Automated Voice-to-Text Ingestion:** True automation. Advanced ambient voice recognition synthesizes raw verbal testimony into rigorously structured text in real-time, removing kinetic friction from the intake process.
- **Hindi Friendly (Native Accessibility):** Deep cross-lingual i18n capabilities fluidly absorb trauma deposits in Hindi and Hinglish. The cognitive interface speaks the user's truth, maximizing psychological accessibility.
- **Automated Language Certification:** Every translated artifact is immutably logged, automatically generating native language validation certificates that affirm perfect, court-ready English translations.
- **Federated Multi-Institutional Sharing:** Zero-trust, dynamic-token evidence brokering. Auditably share specific, highly restricted case fragments across discrete organizational silos—seamlessly bridging attorneys, NGOs, and medical staff.
- **One-Click Affidavit Maker:** A sovereign export engine that instantly renders the synthesized timeline into beautifully structured, court-admissible PDF legal affidavits, primed for immediate litigation.

## Technology Stack & Infrastructure

- **Frontend Environment:** React (Vite ecosystem), TailwindCSS Utility-First Framework, React Router Dom.
- **Backend Architecture:** Node.js, Express RESTful Core, MongoDB (Mongoose Schema Validation), Cryptographic Middleware, Groq LLM SDK.
- **System Architecture:** Decoupled Client-Server Micro-Services model via modular RESTful endpoints.

## Project Structure

```text
/backend       - High-concurrency Express server, Mongoose object schemas, API routes
/frontend      - Optimized React/Vite progressive web application UI
/Docs-And-Plans- System architecture, cognitive topologies, and deployment schemas
```

## Getting Started

### Prerequisites

- Node.js (v18+ LTS)
- MongoDB Cluster (Local or Atlas Distributed)

### System Environment Configuration

You must configure secure `.env` variables across both the frontend orchestration and backend infrastructure.

**Backend (`backend/.env`):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/prama
ENCRYPTION_KEY=<your-32-byte-aes256-key>
GROQ_API_KEY=<your-groq-access-orchestration-key>
GEMINI_API_KEY=<your-gemini-cognitive-key>
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

### Installation & Orchestration

1. **Backend Subsystem Initialization**
   ```bash
   cd backend
   npm install
   npm run start
   ```

2. **Frontend Subsystem Initialization**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Design Philosophy & Trauma-Informed Approach
The Prama forensic workspace actively dismantles intimidating clinical paradigms. Relying on an immersive, restorative visual methodology, the system acts as a digital sanctuary capable of absorbing the fragmented nature of traumatic memory recall. Prama honors survivor sovereignty by preserving verbatim multi-lingual first-person depositions, autonomously translating and mapping them onto deterministic legal matrices, yielding unparalleled justice advocacy vectors.
