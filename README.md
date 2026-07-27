# ClinicTrust AI Platform

> A production-grade, blockchain-powered healthcare platform architected for secure patient record sharing, AI-driven clinical analytics, regulatory compliance, and a token-based incentive economy — designed and built as a full-stack solution architecture reference implementation.

---

### Live Application : https://clinic-trust-ai.vercel.app/

- Doctor User Id: john.smith@clinictrustai.com
- Doctor Password: Demo1234!

- Admin User Id: admin@clinictrustai.com
- Admin Password: Demo1234!

## Table of Contents

- [Solution Overview](#solution-overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Advanced Features](#advanced-features)
  - [Information Blocking Compliance & FHIR R4 API](#information-blocking-compliance--fhir-r4-api)
  - [Prior Authorization Engine](#prior-authorization-engine)
  - [Patient Notification & Engagement](#patient-notification--engagement)
  - [AI Referral Matching](#ai-referral-matching)
  - [Ambient Clinical Intelligence](#ambient-clinical-intelligence)
  - [Patient Self-Scheduling](#patient-self-scheduling)
  - [Digital Therapeutics Marketplace](#digital-therapeutics-marketplace)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Running Locally](#running-locally)
- [Synthetic Data Mode](#synthetic-data-mode)
- [Demo Accounts](#demo-accounts)
- [Deploying to Azure](#deploying-to-azure)
- [Infrastructure & Go-Live Configuration](#infrastructure--go-live-configuration)
- [Data Models](#data-models)
- [Security Design](#security-design)

---

## Solution Overview

ClinicTrust AI is an enterprise healthcare platform that solves critical problems in modern healthcare systems:

| Problem                                                            | Solution                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Fragmented, insecure patient records                               | Polygon (EVM) blockchain + tamper-evident MongoDB ledger for immutable record sharing                     |
| Reactive, siloed clinical decision-making                          | TensorFlow.js-powered predictive analytics surfaced on real-time dashboards                               |
| Lack of incentive for data contribution                            | Smart-contract-driven token economy rewarding clinicians and patients                                     |
| Regulatory non-compliance (21st Century Cures Act)                 | Full FHIR R4 API with Information Blocking safeguards                                                     |
| Manual, error-prone prior authorization                            | Automated PA engine with payer rule evaluation and decision tracking                                      |
| Poor patient communication and follow-up                           | Multi-channel engagement platform (email, SMS, push, in-app)                                              |
| Inefficient specialist referral selection                          | AI-powered provider matching with weighted scoring across 5 dimensions                                    |
| Incomplete clinical documentation at point of care                 | Ambient speech recognition + Azure OpenAI clinical note generation                                        |
| Fragmented appointment booking across provider workflows           | Provider-initiated patient self-scheduling with waitlist, reminders, and token rewards                    |
| No structured pathway from referral to evidence-based digital care | DTx Marketplace linking specialist referrals to vetted digital therapeutic programs with outcome tracking |

This repository demonstrates a **cloud-native, microservices-aligned full-stack architecture** — from smart contract design through REST/GraphQL API layers to a React SPA — deployable on Azure App Service with a managed MongoDB Atlas backend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Azure App Service                            │
│                                                                     │
│   ┌───────────────────┐          ┌──────────────────────────────┐   │
│   │   React SPA       │          │     Node.js / Express        │   │
│   │   (Port 3000)     │◄────────►│     API Server (Port 5000)   │   │
│   │                   │  Proxy   │                              │   │
│   │  - Material UI    │          │  - REST API  /api/*          │   │
│   │  - Redux Toolkit  │          │  - GraphQL   /graphql        │   │
│   │  - TensorFlow.js  │          │  - FHIR R4   /api/fhir/*     │   │
│   │  - Recharts       │          │  - JWT Auth Middleware        │   │
│   │  - Web Speech API │          │  - Role-Based Access Control  │   │
│   └───────────────────┘          └──────────┬───────────────────┘   │
│                                             │                       │
└─────────────────────────────────────────────┼───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
          ┌─────────▼────────┐    ┌───────────▼───────┐  ┌──────────▼────────┐
          │   MongoDB Atlas  │    │  Polygon (EVM)    │  │  Azure AI Services │
          │   (Managed DB)   │    │  + local wallet   │  │                   │
          │                  │    │  service          │  │  - Azure OpenAI    │
          │  - Users         │    │                   │  │    (GPT-4 notes)   │
          │  - Patients      │    │  - ClinicToken    │  │  - Azure Speech    │
          │  - Referrals     │    │    ERC-20         │  │    (STT)           │
          │  - Tokens        │    │  - HD wallets      │  │                   │
          │  - PriorAuth     │    │  - Falls back to   │  └───────────────────┘
          │  - Engagement    │    │    MongoDB ledger   │
          │  - AmbientAI     │    │    when unconfigured│
          │  - MatchProfiles │    └────────────────────┘
          │  - Blockchain    │
          │    Ledger        │
          └──────────────────┘
```

### Architectural Decisions

- **Dual API Surface (REST + GraphQL)**: REST for CRUD operations and mobile-friendly consumption; GraphQL for complex, nested data queries from the analytics dashboard — reducing over-fetching on data-heavy views.
- **FHIR R4 Compliance Layer**: A dedicated `/api/fhir` router translates internal MongoDB documents into FHIR-standard JSON resources (Patient, Practitioner, ServiceRequest, Observation, AllergyIntolerance) to meet ONC 21st Century Cures Act requirements.
- **Proxy Pattern**: React dev server proxies to `localhost:5000`, eliminating CORS configuration complexity in development and mirroring the production single-origin model on Azure.
- **Blockchain as an Audit Layer**: Polygon is not used as the primary datastore — MongoDB handles operational data. Every referral, consent, and token event is written to a hash-chained `BlockchainTransaction` ledger (each record stores the previous record's hash, like a block). When `POLYGON_RPC_URL` + `CLINICTOKEN_ADDRESS` + `PRIVATE_KEY` are configured, token mint/burn operations also execute on real Polygon (Amoy testnet or mainnet) via the deployed `ClinicToken` ERC-20 contract; otherwise everything stays in the MongoDB ledger, which is fully verifiable (`GET /api/admin/blockchain/integrity`) without any crypto infrastructure.
- **Client-Side AI**: TensorFlow.js runs inference in the browser, removing a dedicated ML microservice and reducing latency for real-time prediction on the dashboard.
- **Azure AI Stubs**: Ambient Clinical Intelligence and AI Matching services integrate with Azure Speech and Azure OpenAI via environment-variable-gated stubs. When Azure credentials are absent, realistic mock data is returned — so the full feature workflow is demonstrable without incurring cloud costs.
- **Role-Based Access at the Middleware Layer**: Authorization is enforced via Express middleware (`protect` + `authorize`) rather than at the route level, keeping route files clean and authorization logic centralised.
- **Synthetic Data Mode**: Every advanced feature ships with a full in-memory implementation in `syntheticRouter.js`, enabling the complete application to run without any database or cloud service dependency.

---

## Technology Stack

### Backend

| Layer            | Technology                  | Version          | Purpose                                                                          |
| ---------------- | --------------------------- | ---------------- | -------------------------------------------------------------------------------- |
| Runtime          | Node.js                     | v18+             | Server-side JavaScript runtime                                                   |
| Framework        | Express.js                  | ^4.18.2          | REST API and middleware pipeline                                                 |
| Query Language   | GraphQL / express-graphql   | ^0.12.0          | Flexible data querying for analytics                                             |
| Database         | MongoDB + Mongoose          | ^7.0.3           | Document store for operational data                                              |
| Blockchain       | Polygon (EVM) via ethers.js | ^6.17.0          | On-chain ClinicToken (ERC-20) mint/burn + tamper-evident MongoDB ledger fallback |
| Contract Tooling | Hardhat + OpenZeppelin      | ^2.22.0 / ^5.0.0 | Solidity compilation, testnet/mainnet deployment, contract verification          |
| Authentication   | JWT + bcryptjs              | ^9.0.0 / ^2.4.3  | Stateless auth with secure password hashing                                      |
| AI Integration   | Azure OpenAI + Azure Speech | REST / SDK       | Clinical note generation and speech transcription                                |
| Email            | Nodemailer (Gmail SMTP)     | ^9.0.1           | Transactional email — password reset, KYC status, referral notifications         |
| Logging          | Winston + Morgan            | ^3.8.2 / ^1.10.0 | Structured logging and HTTP request tracing                                      |
| Config           | dotenv                      | ^16.3.1          | 12-factor app configuration                                                      |
| Dev Tooling      | nodemon + concurrently      | ^2.0.22 / ^8.2.0 | Hot reload and parallel process management                                       |

### Frontend

| Layer      | Technology                      | Version         | Purpose                                        |
| ---------- | ------------------------------- | --------------- | ---------------------------------------------- |
| Framework  | React                           | ^18.2.0         | Component-driven UI                            |
| UI Library | Material UI (MUI)               | ^5.12.1         | Enterprise-grade component system              |
| State      | Redux Toolkit                   | ^2.8.2          | Predictable global state management            |
| Routing    | React Router                    | ^6.10.0         | Client-side navigation                         |
| HTTP       | Axios                           | ^1.3.6          | API communication with interceptors            |
| Charts     | Recharts + Chart.js             | ^3.1.0 / ^4.2.1 | Data visualisation                             |
| AI / ML    | TensorFlow.js                   | ^4.4.0          | In-browser predictive analytics                |
| Speech     | Web Speech API (browser-native) | —               | Real-time ambient speech-to-text transcription |
| Reports    | jsPDF + jspdf-autotable         | ^3.0.1          | PDF report generation                          |

### Infrastructure

| Component      | Technology                                                               |
| -------------- | ------------------------------------------------------------------------ |
| Cloud Platform | Microsoft Azure App Service (Linux)                                      |
| Database Cloud | MongoDB Atlas                                                            |
| AI Services    | Azure OpenAI, Azure Cognitive Services (Speech)                          |
| Blockchain     | Polygon PoS (Amoy testnet or mainnet) — optional, ledger mode by default |
| Email          | Gmail SMTP (App Password)                                                |
| Node Target    | v20.x (Azure)                                                            |
| Deployment     | ZIP deploy via Azure Deployment Center                                   |

> See [Infrastructure & Go-Live Configuration](#infrastructure--go-live-configuration) for the full list of external services this platform integrates with, which are required vs. optional, and step-by-step setup instructions for each.

---

## Key Features

### Blockchain-Verified Referrals

Medical referrals are written to a hash-chained ledger as immutable transactions. Each referral carries a blockchain transaction ID, providing a cryptographically verifiable audit trail that cannot be altered retroactively. By default this ledger lives in MongoDB (`BlockchainTransaction` collection); when Polygon credentials are configured, token-related transactions additionally settle on-chain.

### AI-Powered Analytics Dashboard

TensorFlow.js models run client-side to surface predictive insights: patient outcome probabilities, referral success rates, and resource utilisation trends — all rendered in real-time without a round-trip to an ML server.

### Token Economy

A smart-contract-driven token system incentivises clinicians and patients to contribute anonymised data. Tokens are earned, tracked, and redeemable — with all transactions recorded on-chain. Token standing is also factored into the AI Referral Matching score, rewarding high-quality network participants with more referrals.

### Role-Based Access Control (RBAC)

Five distinct roles — `admin`, `superadmin`, `doctor`, `nurse`, `patient` — each with enforced route-level permissions. Admin operations are protected by a separate auth flow (`/api/admin/auth`).

### GraphQL Analytics API

Complex nested queries (e.g., patient + referral + token history in one request) are served via GraphQL, reducing the number of round-trips for data-heavy dashboard views.

### PDF Report Generation

Clinical reports are generated in-browser using jsPDF, allowing clinicians to export patient summaries, referral histories, and analytics snapshots without a server round-trip.

---

## Advanced Features

The following six features represent the platform's enterprise compliance, AI, and automation capabilities. Each is fully integrated — backend models, API routes, frontend pages, seed data, and synthetic mode handlers.

---

### Information Blocking Compliance & FHIR R4 API

**What it does**

ClinicTrust AI includes a full FHIR R4 API layer that exposes internal patient and clinical data as standards-compliant FHIR resources. This satisfies the **ONC 21st Century Cures Act Final Rule** and the **CMS-0057-F Information Blocking rule**, which require covered healthcare entities to provide patients and authorised third parties with access to Electronic Health Information (EHI) via standardised APIs.

**How it works in the application**

The `/api/fhir` router maps MongoDB documents to FHIR R4 JSON resources in real time — no separate FHIR datastore required. Resources include:

| FHIR Resource        | Maps to internal data   |
| -------------------- | ----------------------- |
| `Patient`            | Patient collection      |
| `Practitioner`       | User (provider roles)   |
| `ServiceRequest`     | Referral collection     |
| `Observation`        | Analytics / vitals      |
| `AllergyIntolerance` | Patient medical history |

The FHIR capability statement (`/api/fhir/metadata`) describes supported resources, interactions, and the server's conformance level — required by ONC for certified health IT.

**Value it adds**

- **Regulatory compliance**: Avoids up to $1M per violation in Information Blocking penalties by providing lawful, standards-based access to EHI.
- **Interoperability**: Third-party EHR systems, patient apps, and payer platforms can consume data using the universal FHIR standard without custom integrations.
- **Audit trail**: All FHIR data access requests are logged, satisfying HIPAA access log requirements.

**Admin access**: Admin Panel → FHIR R4 API

---

### Prior Authorization Engine

**What it does**

The Prior Authorization Engine automates the creation, submission, tracking, and decision management of insurance prior authorization requests — one of the most time-consuming administrative burdens in US healthcare, averaging 14 hours per physician per week (AMA, 2023).

**How it works in the application**

When a provider creates a referral or orders a procedure requiring insurance approval, they submit a prior auth request through the `/app/prior-auth` workflow. The engine:

1. **Evaluates eligibility** — checks the patient's insurance plan and the requested service against payer rules
2. **Submits for review** — creates a structured PA record with clinical justification, diagnosis codes, and urgency classification
3. **Tracks status** — moves through `pending → under_review → approved / denied / pending_info` states with full audit history
4. **Notifies stakeholders** — status changes trigger notifications to both the requesting provider and the patient

Each PA record stores the denial reason, approval code, approved service duration, peer review notes, and appeal history, giving providers everything needed to respond to denials without starting over.

**Value it adds**

- **Reduces administrative burden**: Structured workflows replace fax/phone-based PA submissions, cutting turnaround time from days to hours.
- **Fewer claim denials**: Complete documentation at submission reduces the #1 cause of claim denials — missing or incomplete prior auth.
- **Appeal support**: Built-in denial tracking and appeal history gives providers a clear record to challenge incorrect decisions.
- **Compliance**: PA records integrate with the FHIR layer, enabling automated submission to payer FHIR endpoints under the CMS Interoperability Rule.

**Admin access**: Admin Panel → Prior Authorizations  
**Provider access**: Main App → Prior Auth

---

### Patient Notification & Engagement

**What it does**

The Patient Engagement platform delivers proactive, personalised communications to patients across multiple channels — email, SMS, push notification, and in-app — with full campaign management, delivery tracking, and template libraries.

**How it works in the application**

Providers and admins compose notifications using reusable templates (appointment reminders, referral status updates, care gap alerts, wellness campaigns). The system:

1. **Template library** — pre-built and custom templates with variable substitution (patient name, appointment date, provider name)
2. **Multi-channel delivery** — each notification is sent via the channels configured for that patient (email via Azure Communication Services, SMS via configurable provider, push via device token)
3. **Campaign management** — bulk notifications can be grouped into campaigns with scheduling, target population filters, and delivery reports
4. **Delivery tracking** — each notification record tracks channel-level status (`sent`, `delivered`, `failed`) with timestamps and error details
5. **Patient portal** — patients see their notification history and can update communication preferences from the in-app notification centre

The delivery service (`patientEngagementService.js`) returns a unified `overall` status (`sent / partial / failed`) that aggregates across all channels, so the UI always reflects reality even when one channel fails.

**Value it adds**

- **Reduced no-shows**: Automated appointment reminders reduce no-show rates by 30–40% (MGMA benchmark data).
- **Better care adherence**: Proactive care gap alerts (e.g., overdue screenings) close gaps that drive value-based care quality scores.
- **Patient satisfaction**: Timely, relevant communication across preferred channels improves patient experience scores (HCAHPS).
- **Operational efficiency**: Campaign tools replace manual outreach, letting care coordinators manage thousands of patient touchpoints at once.

**Admin access**: Admin Panel → Patient Engagement

---

### AI Referral Matching

**What it does**

When a provider creates a referral, the AI Referral Matching engine analyses the clinical context and instantly suggests the most appropriate specialists — ranked by a transparent, 100-point composite score that accounts for specialty fit, insurance compatibility, historical performance, availability, and network standing.

**How it works in the application**

In the **Create Referral** flow (Step 1 — Provider Information), the provider types the needed specialty (e.g. "Cardiology"). After 800 ms the AI panel automatically surfaces up to 5 ranked specialist suggestions, each showing:

- **Overall match score** (0–100) with a colour-coded progress bar
- **Score breakdown chips** — how many points came from specialty, insurance, and acceptance rate
- **Provider details** — organisation, average response time, acceptance rate
- **Badges** — In-Network (green) and Telehealth (blue) where applicable

Clicking a suggestion auto-fills the provider field. The provider can still use the manual autocomplete below to override.

**Scoring model (100 points total)**

| Dimension                  | Max Points | How scored                                                                      |
| -------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Specialty match            | 30         | Exact = 30, synonym group = 22, sub-specialty = 18, no match = 0                |
| Insurance participation    | 25         | Exact plan = 25, plan family = 18, unknown = 12, out-of-network = 2             |
| Historical acceptance rate | 20         | `acceptanceRate × 20` (0.95 → 19 pts)                                           |
| Availability score         | 15         | `(availabilityScore / 100) × 15`                                                |
| Token economy standing     | 10         | Tiers: ≥1000 earned = 10, ≥500 = 8, ≥200 = 6, ≥50 = 4                           |
| **Bonus modifiers**        | +10 max    | In-network +3, board-certified +2, telehealth for urgent +2, fast response +1–3 |

Each match session is saved as a `MatchSession` document, recording which suggestions were shown, which was selected, and the linked referral — powering the admin analytics dashboard.

**Azure AI integration**

The scoring engine runs in Node.js (no Azure call required for matching). Azure AI is used for future enhancements such as NLP-based specialty extraction from referral reason text and outcome prediction from historical referral data.

**Value it adds**

- **Faster specialist selection**: Providers choose from ranked, pre-vetted suggestions in seconds rather than searching provider directories manually.
- **Better network utilisation**: Insurance-aware scoring steers referrals toward in-network providers, reducing patient out-of-pocket costs and payer friction.
- **Higher acceptance rates**: Matching on historical acceptance rate reduces referral bounce — a leading cause of delayed patient care.
- **Data-driven improvement**: Admin analytics (session count, selection rate, top specialties) reveal referral pattern trends and help identify network gaps.
- **Token economy alignment**: Providers with higher token standing (indicating reliable, completed referrals) naturally rank higher, reinforcing the incentive loop.

**Admin access**: Admin Panel → AI Referral Matching  
**Provider access**: Create Referral → Step 1 (AI suggestion panel)

---

### Ambient Clinical Intelligence

**What it does**

Ambient Clinical Intelligence removes the documentation burden from clinical encounters. A provider starts a recording session, speaks naturally with the patient, and the platform automatically generates a structured SOAP clinical note, a referral letter draft, ICD-10 code suggestions, and an urgency classification — all ready for provider review and one-click approval.

**How it works in the application**

Providers access the Ambient AI recorder at `/app/ambient` through a three-step workflow:

**Step 1 — Patient & Setup**
The provider enters the patient name, chief complaint, and selects the encounter type. This context is passed to the AI model to improve note relevance.

**Step 2 — Record & Transcribe**
The browser's **Web Speech API** (`window.SpeechRecognition`) captures real-time speech and displays a live rolling transcript — no audio file upload required. This eliminates latency and works without microphone permissions on the server.

When the provider stops recording, the transcript is sent to the backend where:

- **Azure Speech Services** (optional) can provide higher-accuracy server-side transcription for long or complex encounters
- **Azure OpenAI (GPT-4)** generates the structured clinical note from the transcript in SOAP format (Subjective, Objective, Assessment, Plan)

The response includes:

- SOAP clinical summary
- Referral note draft (ready to attach to a referral)
- Suggested ICD-10 codes with descriptions
- Urgency classification (`routine / urgent / emergent`) with clinical rationale
- Recommended specialist type

**Step 3 — Review & Approve**
The provider reviews the AI-generated content, edits inline if needed, then either **Approves** (note moves to `approved` status, ready to link to a referral) or **Rejects** (session closed with a reason). Every edit is tracked in an `editHistory` array for audit purposes.

After approval, the session's `linkedReferralId` can be set when the provider creates the associated referral, creating an end-to-end documentation chain.

**Session lifecycle**

```
draft → reviewing → approved → submitted
              └──────────────→ rejected
```

Each session stores: audio transcript, AI-generated clinical summary, referral note draft, ICD codes, urgency classification, recommended specialty, provider identity, edit history, and approval status.

**Azure AI integration**

| Azure Service        | Environment variable                                                            | Fallback behaviour                                     |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Azure OpenAI (GPT-4) | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT_NAME` | Returns a realistic mock SOAP note and referral letter |
| Azure Speech (STT)   | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`                                       | Uses Web Speech API transcript directly                |

The service is designed to degrade gracefully — the full UI workflow runs without any Azure credentials, using mock data that mirrors real GPT-4 output.

**Value it adds**

- **Saves 1–2 hours per clinician per day**: Clinical documentation is estimated to consume 35–55% of a physician's working hours (AMA / Medscape). Ambient AI reduces this to minutes.
- **Reduces documentation errors**: AI-structured SOAP notes are consistently formatted and always include the required ICD-10 codes, reducing coding denials.
- **Improves referral quality**: AI-drafted referral letters capture clinical context that is often omitted in manual referrals, leading to better specialist preparation and faster care.
- **Audit-ready**: Every note change is tracked in `editHistory` with timestamp and provider identity — satisfying HIPAA documentation requirements.
- **Token economy integration**: Completed, approved ambient sessions can trigger token rewards, incentivising consistent, high-quality documentation.

**Admin access**: Admin Panel → Ambient AI Sessions  
**Provider access**: Main App → Ambient AI

---

### Patient Self-Scheduling

**What it does**

Patient Self-Scheduling gives providers full control over appointment booking on behalf of their patients — from a dedicated schedule view showing their daily calendar, to real-time waitlist management, automated reminders, and token rewards on appointment completion. The feature closes the loop between a specialist referral being accepted and the actual appointment taking place.

**How it works in the application**

Providers access their daily schedule at `/app/schedule`. The page is built around the `ProviderSchedule` component and the `AppointmentCard` subcomponent, which together surface each appointment's status and drive every in-line action.

**Booking an appointment**

From any open referral (`/app/referrals/:id`), providers click **Schedule Appointment**. This opens the booking flow at `/app/appointments/book`, pre-populated with the referral ID and the receiving provider ID. The provider selects a date, time slot, appointment type, and duration, then confirms. The created appointment is linked to the referral so the full care episode is traceable in one record.

**Provider Schedule page**

The schedule renders as a filterable, searchable daily card list. Each `AppointmentCard` displays:

| Field                             | Detail                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| Patient name and appointment type | At a glance identification                                                                 |
| Status chip                       | `scheduled`, `confirmed`, `checked_in`, `in_progress`, `completed`, `no_show`, `cancelled` |
| Date, time, and duration          |                                                                                            |
| Referral link                     | Clickable badge when the appointment is linked to an open referral                         |
| Action buttons                    | Context-sensitive — see below                                                              |

**In-line actions on each card**

| Action   | Visible when                                   | What it does                                                             |
| -------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Check In | status = `scheduled` or `confirmed`            | Moves appointment to `checked_in`, marks `checkedInAt` timestamp         |
| Start    | status = `checked_in`                          | Moves to `in_progress`, marks `startedAt`                                |
| Complete | status = `checked_in` or `in_progress`         | Moves to `completed`, marks `completedAt`, awards tokens to the provider |
| Remind   | status = `scheduled` or `confirmed` (upcoming) | Sends a reminder notification to the patient, records `reminderSentAt`   |
| No-Show  | status = any upcoming                          | Marks the appointment as `no_show`                                       |

**Token rewards on completion**

When a provider clicks **Complete**, the backend calls `processTokenTransaction` and increments the provider's `tokenBalance` via `$inc` — the same pattern used across all other token-earning events in the platform. Token earnings are reflected on the Dashboard and the Token Management page within the same session.

**Waitlist management**

The `ProviderSchedule` page surfaces a **Waitlist** panel showing patients waiting for an open slot with the current provider. When a slot opens (cancellation or no-show), the provider can book directly from the waitlist entry, filling the gap without leaving the schedule view.

**Appointment reminders**

Clicking **Remind** on an upcoming appointment fires a `POST /api/appointments/:id/reminder` call. The backend records the reminder in the appointment document (`remindersSent[]` array with timestamps and channel). In a production environment with Azure Communication Services configured, this triggers an actual email or SMS to the patient.

**Admin oversight**

Administrators see a unified **Appointments** view at `/admin/appointments` with two tabs:

- **All Appointments** — full-platform table with status, date range, and provider filters, plus export.
- **Provider Utilization** — per-provider fill rate bars, peak appointment hours, and a detailed breakdown table covering booked vs. total slots, no-show rate, cancel rate, average duration, and tokens earned. The date range selector (7 days / 30 days / 90 days / YTD) dynamically re-fetches the aggregate from the backend.

**Value it adds**

- **Eliminates scheduling gaps**: Providers manage their own calendar inside the same application they use for referrals and documentation — no separate scheduling system, no tab-switching.
- **Reduces no-shows**: One-click reminders reach patients directly from the provider's daily schedule view, requiring seconds rather than a manual outreach workflow.
- **Closes the referral-to-appointment loop**: Appointment records are linked to referral records, giving admins and providers end-to-end visibility from referral creation through appointment completion.
- **Reinforces the token economy**: Appointment completions earn tokens, aligning financial incentives with care delivery outcomes and encouraging providers to close care episodes rather than leave referrals open.
- **Operational intelligence for admins**: The Provider Utilization report reveals which providers are underutilised, which slots go unfilled, and which providers have high no-show or cancellation rates — actionable data for network management without leaving the platform.

**Admin access**: Admin Panel → Appointments → Provider Utilization tab  
**Provider access**: Main App → Schedule (daily calendar); Referral Detail → Schedule Appointment

---

### Digital Therapeutics Marketplace

**What it does**

The Digital Therapeutics (DTx) Marketplace is a curated catalog of evidence-based digital health programs — apps, web platforms, and coaching interventions — that providers can prescribe directly to patients as part of a referral or care plan. It extends ClinicTrust AI's referral coordination model into the growing prescription digital therapeutics space, letting providers leverage software-based treatments (behavioural, metabolic, musculoskeletal, and more) without leaving the platform.

This is a **B2B-only feature**: the marketplace is for providers to browse, prescribe, and track outcomes. Patient program delivery occurs on the vendor's own platform. ClinicTrust AI manages the prescription lifecycle, outcome capture, and token incentives.

**Why it adds B2B value**

| Problem                                                                     | DTx Marketplace solution                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Providers are unaware of vetted digital programs relevant to their patients | Curated, admin-managed catalog with evidence level badges (FDA Cleared, FDA Authorized, Peer Reviewed)                    |
| No structured prescription workflow for digital programs                    | Provider-initiated prescriptions with patient demographics, clinical notes, and referral linkage                          |
| Outcomes of digital interventions are not tracked in the platform           | Prescription lifecycle (`prescribed → enrolled → active → completed / dropped`) with engagement scores and clinical notes |
| No incentive for providers to close digital care loops                      | Token reward on prescription completion — same economy as appointment and referral completion                             |
| Administrators have no visibility into DTx utilisation across the network   | Admin analytics: prescriptions by category, completion rate, top programs, tokens awarded                                 |

**How it works in the application**

**For providers — browsing the catalog**

Providers navigate to `/app/dtx/marketplace`. The page presents programs grouped by category tabs (Mental Health, Metabolic, Musculoskeletal, Cardiovascular, Behavioral, Respiratory, Neurology, General) with two additional filters:

- **Evidence level** dropdown — filter to FDA Cleared / FDA Authorized / Peer Reviewed / Evidence Based / Clinical Study
- **Search bar** — searches across program name, vendor name, and target conditions

Each program is displayed as a `DtxProgramCard` showing:

| Element               | Detail                                                         |
| --------------------- | -------------------------------------------------------------- |
| Evidence badge        | Color-coded chip (green = FDA, blue = peer reviewed, etc.)     |
| Category color border | Instant visual categorisation                                  |
| Conditions treated    | Chip list of target conditions                                 |
| Highlights            | Bulleted clinical benefits                                     |
| Delivery format       | App / Web / Both / Coaching / Hybrid                           |
| Duration              | Program length in weeks                                        |
| Token reward          | Tokens the provider earns when a patient completes the program |

**For providers — prescribing a program**

Clicking **Prescribe** on any card opens the `PrescribeDtxModal`. The provider enters:

- Patient Full Name (required)
- Patient ID / MRN (optional)
- Patient Email and Phone (optional — used for vendor enrollment)
- Clinical notes (reason for prescribing, patient goals, contraindication acknowledgement)

On submit, the backend creates a `DtxPrescription` document with status `prescribed` and increments the program's `prescriptionCount`. If the prescription was initiated from a referral detail page, the `linkedReferralId` is automatically captured and an info alert notifies the provider that the prescription will be linked to the open referral.

**For providers — tracking prescriptions**

The **DTx Prescriptions** page (`/app/dtx/prescriptions`) lists all prescriptions the provider has created. Status filter tabs let providers drill to a specific lifecycle stage. Each row shows:

- Patient name and program
- Category chip
- Status chip with lifecycle colour coding
- Prescribe date
- Engagement score (0–100, entered when completing)
- Token reward badge (appears once tokens are issued)

Clicking **Update** opens the `UpdateStatusDialog`. Valid transitions are enforced:

```
prescribed → enrolled → active → completed
                                └──────────→ dropped
```

When transitioning to `completed`, the provider enters:

- Engagement score (0–100 slider)
- Outcome notes (required)

On save, the backend awards tokens via `processTokenTransaction` and sets `tokenRewardIssued: true` on the prescription document.

**Referral → DTx linkage**

On any active referral's detail page, a **Prescribe DTx** button appears alongside **Schedule Appointment**. This opens the prescription modal pre-linked to the referral — the provider selects a program from the catalog and the resulting prescription is associated with the referral record, creating a documented referral-to-digital-treatment chain.

**For admins — catalog management**

Administrators manage the DTx catalog at `/admin/dtx` (Admin Panel → DTx Marketplace). The page has three tabs:

**Tab 0 — Program Catalog**

A full table of all programs (active and deactivated) with:

- Add Program button — opens `ProgramFormDialog` with fields for name, vendor, category, evidence level, delivery format, duration, token reward, conditions list, highlights list, and contraindications
- Edit button per row — pre-fills the same form
- Deactivate button — soft-deactivates the program (sets `isActive: false`) so it no longer appears in provider search but historical prescriptions are preserved

**Tab 1 — All Prescriptions**

Cross-provider prescription table with status and category filters, giving admins visibility into which programs are being used, by whom, and for which patient populations.

**Tab 2 — Analytics**

Aggregate statistics including:

- Active programs, total prescriptions, completion rate, total tokens awarded
- Prescriptions by category (bar chart breakdown)
- Top programs by prescription count
- Status distribution (prescribed / enrolled / active / completed / dropped)

**Dashboard integration**

The provider Dashboard (`/app/dashboard`) surfaces a **Recent DTx Prescriptions** widget showing the five most recent prescriptions with status chips. A **Browse Marketplace** quick-action button provides one-click access to the catalog. If no prescriptions exist, an empty state with a "Browse Marketplace" call-to-action encourages adoption.

**Evidence levels and clinical trustworthiness**

The catalog distinguishes five evidence tiers:

| Level            | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| `fda_cleared`    | FDA 510(k) clearance — clinically validated device |
| `fda_authorized` | FDA De Novo or Breakthrough authorization          |
| `peer_reviewed`  | Published in peer-reviewed literature              |
| `evidence_based` | Validated by clinical studies                      |
| `clinical_study` | Active or completed clinical study                 |

Providers see these as colour-coded chips on every card, enabling quick filtering to the level of evidence appropriate for each patient's situation.

**Value it adds**

- **Expands the care toolkit without expanding overhead**: Providers access a vetted, categorised catalog of digital interventions from within the same workflow they use for referrals and documentation — no separate portal, no separate login.
- **Structured prescription creates accountability**: Every DTx prescription is a traceable record with patient, provider, program, and outcome data — unlike verbal recommendations that disappear after the appointment.
- **Referral-to-digital-treatment chain**: Linking a DTx prescription to a referral extends the care episode record beyond the specialist visit, which is particularly valuable for value-based care contracts that reward complete care episodes.
- **Token economy alignment**: Completion tokens reward providers for closing digital care loops, not just opening them — the incentive is on outcomes, not volume.
- **Admin network intelligence**: The analytics tab shows which program categories are driving adoption, which vendors are most trusted by providers, and where completion rates are low — actionable data for catalog curation and network management.
- **Supports value-based care models**: Digital therapeutics are increasingly billable (CPT codes for DTx exist for select FDA-cleared programs). The prescription record and outcome data generated in ClinicTrust AI provides the documentation trail needed for reimbursement and quality reporting.

**Admin access**: Admin Panel → DTx Marketplace (Program Catalog, All Prescriptions, Analytics)  
**Provider access**: Main App → DTx Marketplace (browse catalog), DTx Prescriptions (track outcomes), Referral Detail → Prescribe DTx, Dashboard → Recent DTx Prescriptions widget

---

## Project Structure

```
VibeCoding/
├── client/                          # React SPA
│   ├── public/
│   └── src/
│       ├── components/              # Reusable UI components
│       │   ├── admin/               # Admin-specific components
│       │   ├── analytics/           # Chart and analytics components
│       │   ├── appointments/        # AppointmentCard (schedule actions + reminders)
│       │   ├── blockchain/          # Blockchain status and history views
│       │   ├── dtx/                 # DTx Marketplace components
│       │   │   ├── DtxProgramCard.js      # Evidence-badged program catalog card
│       │   │   └── PrescribeDtxModal.js   # Prescription form modal
│       │   └── referral/            # AIProviderSuggestions (AI matching panel)
│       ├── pages/                   # Route-level page components (40+)
│       │   ├── auth/                # Login, register, password reset
│       │   ├── dashboard/           # Main dashboard (with DTx widget + quick action)
│       │   ├── dtx/                 # Digital Therapeutics Marketplace
│       │   │   ├── DtxMarketplace.js      # Catalog browse + prescribe
│       │   │   └── DtxPrescriptions.js    # Provider prescription tracker + outcomes
│       │   ├── patients/            # Patient management
│       │   ├── referrals/           # Referral creation (with AI matching + DTx prescribe button)
│       │   ├── tokens/              # Token economy views
│       │   ├── prior-auth/          # Prior authorization workflow
│       │   ├── ambient/             # Ambient Clinical Intelligence recorder
│       │   └── admin/               # Admin panel
│       │       ├── AdminPriorAuth.js
│       │       ├── AdminPatientEngagement.js
│       │       ├── AdminAmbientSessions.js
│       │       ├── AdminReferralMatching.js
│       │       ├── AdminAppointments.js   # All Appointments + Provider Utilization tabs
│       │       └── AdminDtxManagement.js  # DTx Catalog, All Prescriptions, Analytics tabs
│       ├── services/                # Axios API service wrappers
│       │   ├── referralMatchingService.js
│       │   ├── ambientSessionService.js
│       │   ├── adminEngagementService.js
│       │   └── dtxService.js              # DTx catalog, prescriptions, admin ops
│       ├── layouts/                 # Admin, Auth, Landing, Main layouts
│       ├── utils/                   # Shared utilities
│       ├── theme.js                 # MUI theme configuration
│       └── App.js
│
├── server/
│   ├── middleware/
│   │   ├── auth.js                  # JWT protect + authorize middleware
│   │   └── async.js                 # Async error wrapper
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── Patient.js
│   │   ├── Referral.js
│   │   ├── PriorAuth.js
│   │   ├── PatientNotification.js
│   │   ├── NotificationTemplate.js
│   │   ├── NotificationCampaign.js
│   │   ├── AmbientSession.js
│   │   ├── ProviderMatchProfile.js
│   │   ├── MatchSession.js
│   │   ├── DtxProgram.js            # DTx catalog program schema
│   │   └── DtxPrescription.js       # DTx prescription lifecycle schema
│   ├── routes/                      # Express route handlers
│   │   ├── auth.js
│   │   ├── patients.js
│   │   ├── referrals.js
│   │   ├── fhir.js                  # FHIR R4 API
│   │   ├── priorAuth.js
│   │   ├── patientEngagement.js
│   │   ├── ambientSessions.js
│   │   ├── referralMatching.js
│   │   ├── dtx.js                   # Provider DTx routes (catalog browse, prescriptions)
│   │   ├── adminDtx.js              # Admin DTx routes (catalog mgmt, analytics)
│   │   ├── syntheticRouter.js       # In-memory fallback for all routes
│   │   └── admin/
│   │       ├── referrals.js
│   │       ├── patientEngagement.js
│   │       ├── ambientSessions.js
│   │       └── aiManagement.js
│   ├── services/
│   │   ├── patientEngagementService.js
│   │   ├── ambientIntelligenceService.js  # Azure Speech + OpenAI
│   │   └── referralMatchingService.js     # 100-point scoring engine
│   ├── seeds/
│   │   ├── priorAuthSeed.js
│   │   ├── patientEngagementSeed.js
│   │   ├── ambientSessionSeed.js
│   │   └── referralMatchingSeed.js
│   ├── schema.js                    # GraphQL type definitions
│   ├── resolvers.js                 # GraphQL resolvers
│   └── index.js                     # Express app entry point
│
├── start-dev.js                     # Concurrent dev server launcher
├── populate_db.js                   # MongoDB seed script
├── build-for-azure.bat              # Azure deployment build script (Windows)
└── package.json
```

---

## API Reference

### Authentication

| Method | Endpoint                | Auth   | Description              |
| ------ | ----------------------- | ------ | ------------------------ |
| POST   | `/api/auth/register`    | Public | Register a new user      |
| POST   | `/api/auth/login`       | Public | Login and receive JWT    |
| GET    | `/api/auth/me`          | JWT    | Get current user profile |
| POST   | `/api/admin/auth/login` | Public | Admin login              |

### Patients

| Method | Endpoint            | Auth | Description             |
| ------ | ------------------- | ---- | ----------------------- |
| GET    | `/api/patients`     | JWT  | List all patients       |
| POST   | `/api/patients`     | JWT  | Create a patient record |
| GET    | `/api/patients/:id` | JWT  | Get patient by ID       |
| PUT    | `/api/patients/:id` | JWT  | Update patient record   |

### Referrals

| Method | Endpoint               | Auth  | Description                            |
| ------ | ---------------------- | ----- | -------------------------------------- |
| GET    | `/api/referrals`       | JWT   | List referrals                         |
| POST   | `/api/referrals`       | JWT   | Create referral (writes to blockchain) |
| GET    | `/api/referrals/:id`   | JWT   | Get referral + blockchain receipt      |
| PUT    | `/api/referrals/:id`   | JWT   | Update referral status                 |
| GET    | `/api/admin/referrals` | Admin | All referrals (admin view)             |

### FHIR R4 API

| Method | Endpoint                       | Auth   | Description                                     |
| ------ | ------------------------------ | ------ | ----------------------------------------------- |
| GET    | `/api/fhir/metadata`           | Public | FHIR capability statement                       |
| GET    | `/api/fhir/Patient`            | JWT    | List patients as FHIR Patient resources         |
| GET    | `/api/fhir/Patient/:id`        | JWT    | Single FHIR Patient resource                    |
| GET    | `/api/fhir/Practitioner`       | JWT    | List providers as FHIR Practitioner resources   |
| GET    | `/api/fhir/ServiceRequest`     | JWT    | List referrals as FHIR ServiceRequest resources |
| GET    | `/api/fhir/Observation`        | JWT    | Clinical observations as FHIR resources         |
| GET    | `/api/fhir/AllergyIntolerance` | JWT    | Allergies as FHIR resources                     |

### Prior Authorization

| Method | Endpoint                    | Auth  | Description                   |
| ------ | --------------------------- | ----- | ----------------------------- |
| GET    | `/api/prior-auth`           | JWT   | List prior auth requests      |
| POST   | `/api/prior-auth`           | JWT   | Submit a new PA request       |
| GET    | `/api/prior-auth/:id`       | JWT   | Get PA request details        |
| PUT    | `/api/prior-auth/:id`       | JWT   | Update PA status              |
| GET    | `/api/admin/prior-auth`     | Admin | All PA requests (admin view)  |
| PUT    | `/api/admin/prior-auth/:id` | Admin | Admin decision (approve/deny) |

### Patient Engagement

| Method | Endpoint                                  | Auth  | Description                    |
| ------ | ----------------------------------------- | ----- | ------------------------------ |
| GET    | `/api/patient-engagement`                 | JWT   | List notifications             |
| POST   | `/api/patient-engagement/send`            | JWT   | Send a notification            |
| GET    | `/api/admin/patient-engagement`           | Admin | All notifications (admin view) |
| GET    | `/api/admin/patient-engagement/templates` | Admin | Notification templates         |
| POST   | `/api/admin/patient-engagement/templates` | Admin | Create a template              |
| GET    | `/api/admin/patient-engagement/campaigns` | Admin | Campaigns list                 |
| POST   | `/api/admin/patient-engagement/campaigns` | Admin | Create a campaign              |

### AI Referral Matching

| Method | Endpoint                                     | Auth  | Description                                |
| ------ | -------------------------------------------- | ----- | ------------------------------------------ |
| POST   | `/api/referral-matching/match`               | JWT   | Run AI matching — returns ranked providers |
| GET    | `/api/referral-matching/providers`           | JWT   | List all provider match profiles           |
| GET    | `/api/referral-matching/providers/:id`       | JWT   | Single provider profile                    |
| PUT    | `/api/referral-matching/providers/:id`       | Admin | Update provider profile                    |
| GET    | `/api/referral-matching/stats`               | JWT   | Aggregate matching analytics               |
| GET    | `/api/referral-matching/sessions`            | JWT   | Match session history                      |
| POST   | `/api/referral-matching/sessions/:id/select` | JWT   | Record provider selection                  |

### Ambient Clinical Intelligence

| Method | Endpoint                              | Auth  | Description                            |
| ------ | ------------------------------------- | ----- | -------------------------------------- |
| GET    | `/api/ambient-sessions`               | JWT   | List provider's sessions               |
| POST   | `/api/ambient-sessions`               | JWT   | Create session + trigger AI processing |
| GET    | `/api/ambient-sessions/stats`         | JWT   | Provider session stats                 |
| GET    | `/api/ambient-sessions/:id`           | JWT   | Session details                        |
| PUT    | `/api/ambient-sessions/:id/review`    | JWT   | Approve or reject a session            |
| PUT    | `/api/ambient-sessions/:id`           | JWT   | Update session                         |
| POST   | `/api/ambient-sessions/:id/reprocess` | JWT   | Re-run AI on existing transcript       |
| DELETE | `/api/ambient-sessions/:id`           | JWT   | Delete a draft session                 |
| GET    | `/api/admin/ambient-sessions`         | Admin | All sessions (admin view)              |
| GET    | `/api/admin/ambient-sessions/stats`   | Admin | Platform-wide session analytics        |
| PUT    | `/api/admin/ambient-sessions/:id`     | Admin | Admin update                           |

### Appointments & Scheduling

| Method | Endpoint                                       | Auth  | Description                                |
| ------ | ---------------------------------------------- | ----- | ------------------------------------------ |
| GET    | `/api/appointments`                            | JWT   | List provider's appointments               |
| POST   | `/api/appointments`                            | JWT   | Book an appointment                        |
| GET    | `/api/appointments/:id`                        | JWT   | Get appointment details                    |
| PUT    | `/api/appointments/:id`                        | JWT   | Update appointment (status, notes)         |
| POST   | `/api/appointments/:id/reminder`               | JWT   | Send patient reminder                      |
| GET    | `/api/schedules/:providerId/waitlist`          | JWT   | Get provider waitlist                      |
| GET    | `/api/admin/appointments`                      | Admin | All appointments (admin view)              |
| GET    | `/api/admin/appointments/provider-utilization` | Admin | Provider fill rate and utilization metrics |

### Digital Therapeutics (DTx)

| Method | Endpoint                            | Auth  | Description                                                                 |
| ------ | ----------------------------------- | ----- | --------------------------------------------------------------------------- |
| GET    | `/api/dtx/programs`                 | JWT   | Browse active DTx catalog (category / evidence / search filters)            |
| GET    | `/api/dtx/programs/:id`             | JWT   | Get program details                                                         |
| POST   | `/api/dtx/prescriptions`            | JWT   | Create a DTx prescription                                                   |
| GET    | `/api/dtx/prescriptions`            | JWT   | List provider's prescriptions                                               |
| PUT    | `/api/dtx/prescriptions/:id/status` | JWT   | Update prescription status + capture outcomes (awards tokens on completion) |
| GET    | `/api/admin/dtx/stats`              | Admin | Platform-wide DTx aggregate statistics                                      |
| GET    | `/api/admin/dtx/programs`           | Admin | Full catalog (active + deactivated)                                         |
| POST   | `/api/admin/dtx/programs`           | Admin | Add a program to the catalog                                                |
| PUT    | `/api/admin/dtx/programs/:id`       | Admin | Edit a program                                                              |
| DELETE | `/api/admin/dtx/programs/:id`       | Admin | Deactivate a program (soft delete)                                          |
| GET    | `/api/admin/dtx/prescriptions`      | Admin | All prescriptions across providers                                          |

### Tokens

| Method | Endpoint             | Auth | Description                       |
| ------ | -------------------- | ---- | --------------------------------- |
| GET    | `/api/tokens`        | JWT  | Get token balance and history     |
| POST   | `/api/tokens/earn`   | JWT  | Earn tokens for data contribution |
| POST   | `/api/tokens/redeem` | JWT  | Redeem tokens                     |

### Analytics

| Method | Endpoint         | Auth | Description               |
| ------ | ---------------- | ---- | ------------------------- |
| GET    | `/api/analytics` | JWT  | Aggregated analytics data |
| GET    | `/api/dashboard` | JWT  | Dashboard summary metrics |

### GraphQL

| Endpoint        | Description                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------- |
| `POST /graphql` | GraphQL query endpoint — supports complex nested data queries across patients, referrals, tokens, and analytics |

---

## Running Locally

### Prerequisites

| Tool    | Minimum Version | Check Command    |
| ------- | --------------- | ---------------- |
| Node.js | v16.x           | `node --version` |
| npm     | v8.x            | `npm --version`  |
| Git     | Any             | `git --version`  |

> **MongoDB**: The application connects to a MongoDB Atlas cluster by default. No local MongoDB installation is required. If unreachable, the server automatically falls back to [Synthetic Data Mode](#synthetic-data-mode).

---

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd VibeCoding
```

---

### Step 2 — Install all dependencies

```bash
npm run install-all
```

This executes:

1. `npm install` — installs backend packages
2. `cd client && npm install` — installs frontend packages (React, MUI, Redux, TensorFlow.js, etc.)

> The client has 50+ dependencies including TensorFlow.js. Expect 2–4 minutes on first install.

---

### Step 3 — Configure environment variables

```bash
cp .env.example .env
```

```dotenv
# .env
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
MONGO_URI=your_mongodb_connection_string_here

# JWT secrets — generate with: node -e "require('crypto').randomBytes(64).toString('hex')"
JWT_SECRET=your_strong_random_secret
JWT_REFRESH_SECRET=your_strong_random_refresh_secret
JWT_RESET_SECRET=your_strong_random_reset_secret

# Allowed CORS origin
CORS_ORIGIN=http://localhost:3000

# Azure AI — Ambient Clinical Intelligence (optional, falls back to mock data)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure Speech Services — optional, falls back to Web Speech API transcript
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus

# Gmail SMTP — optional, falls back to console-logging emails instead of sending
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
```

> **No database? No problem.** If `MONGO_URI` is unreachable, the server automatically falls back to [Synthetic Data Mode](#synthetic-data-mode). Azure, blockchain, wallet, and email credentials are all optional for local development — every feature degrades gracefully to mock data / console logging / MongoDB-ledger mode. See **[Infrastructure & Go-Live Configuration](#infrastructure--go-live-configuration)** for the complete list of every external service this app can integrate with and how to configure each one for a real deployment.

---

### Step 4 — (Optional) Seed the database

```bash
node populate_db.js
```

Alternatively, use [Synthetic Data Mode](#synthetic-data-mode) — no seeding required.

---

### Step 5 — Start both servers

```bash
npm run start-dev
```

- **Backend** → `http://localhost:5000`
- **Frontend** → `http://localhost:3000`

**Or run separately:**

```bash
# Terminal 1 — Backend
npm run server

# Terminal 2 — Frontend
npm run client
```

---

### Step 6 — Open the application

| Service            | URL                                     |
| ------------------ | --------------------------------------- |
| React Frontend     | http://localhost:3000                   |
| REST API           | http://localhost:5000/api               |
| FHIR R4 API        | http://localhost:5000/api/fhir/metadata |
| GraphQL Playground | http://localhost:5000/graphql           |
| Admin Portal       | http://localhost:3000/admin/login       |

---

### npm Scripts Reference

| Script                          | Command                                                         | Description                                            |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| `npm run start-dev`             | `node start-dev.js`                                             | Start both servers (recommended)                       |
| `npm run dev`                   | `concurrently ...`                                              | Start both via concurrently directly                   |
| `npm run server`                | `nodemon server/index.js`                                       | Backend only with hot reload                           |
| `npm run client`                | `cd client && npm start`                                        | Frontend only                                          |
| `npm run install-all`           | `npm install && cd client && npm install`                       | Install all dependencies                               |
| `npm run build`                 | `cd client && npm run build`                                    | Build React for production                             |
| `npm run populate_db`           | `node populate_db.js`                                           | Drop and reseed all MongoDB collections with demo data |
| `npm run contract:compile`      | `npx hardhat compile`                                           | Compile the `ClinicToken` Solidity contract            |
| `npm run contract:deploy:local` | `npx hardhat run contracts/scripts/deploy.js --network hardhat` | Deploy to an in-memory Hardhat network (testing only)  |
| `npm run contract:deploy:amoy`  | `npx hardhat run contracts/scripts/deploy.js --network amoy`    | Deploy `ClinicToken` to the Polygon Amoy testnet       |

> **Note:** `blockchain:start` / `blockchain:stop` scripts referencing Hyperledger Fabric (`./startFabric.sh`) appear in some older package.json snapshots but the `blockchain/` directory and Fabric scripts do not exist in this codebase — the platform's actual blockchain layer is Polygon + the MongoDB ledger described below. If you see these scripts in `package.json`, they're dead references and can be ignored/removed.

---

## Synthetic Data Mode

When the server starts, it attempts to connect to MongoDB Atlas within **8 seconds**.  
If the connection fails, the server automatically switches to **Synthetic Data Mode** and continues running with pre-seeded in-memory data — including all advanced features.

### How it works

```
Server starts
    │
    ├── Attempt MongoDB connection (8 s timeout)
    │       │
    │       ├── SUCCESS → Live Database Mode  ✅
    │       │
    │       └── TIMEOUT / ERROR → Synthetic Data Mode  🔄
    │                            All data served from in-memory store.
    │                            No database or cloud services required.
    │
    └── Server listens on PORT (default 5000)
```

### What synthetic mode provides

- Full JWT authentication (same secrets, identical token format)
- All REST API endpoints with realistic pre-seeded data
- In-memory CRUD — creates, updates, and deletes persist for the running process
- FHIR R4 resources generated from in-memory patient data
- Prior authorization submissions and decisions
- Patient engagement notifications, templates, and campaigns
- AI Referral Matching with 15 pre-built provider profiles and scoring engine
- Ambient Clinical Intelligence sessions with mock AI-generated notes
- Appointment scheduling, status transitions, reminders, waitlist, and provider utilization report
- DTx catalog (10 programs across 5 categories), prescriptions (7 across all lifecycle statuses), and admin analytics
- Token transfers and referral status changes work end-to-end

### Console output

**Live database:**

```
✅  MongoDB connected — running in live database mode
🚀  Server running on port 5000 [LIVE DB]
```

**Synthetic mode:**

```
⚠️  MongoDB unavailable (Connection timeout after 8 s)
🔄  Starting in SYNTHETIC DATA mode — all data is in-memory.
    Demo accounts: admin@clinictrustai.com / john.smith@clinictrustai.com / etc.
    Demo password for all accounts: Demo1234!
🚀  Server running on port 5000 [SYNTHETIC DATA]
```

### Limitations

| Feature                          | Synthetic mode                           |
| -------------------------------- | ---------------------------------------- |
| Data persistence across restarts | Not supported — resets on server restart |
| GraphQL endpoint                 | Returns a 503 with a helpful message     |
| Blockchain file writes           | Skipped                                  |
| Real Azure AI calls              | Not made — mock responses returned       |

> **Synthetic mode is intended for local development and demos only.**

---

## Demo Accounts

All accounts share the password: **`Demo1234!`**

### Provider accounts

| Name                | Email                               | Role     | Organization                | Token Balance |
| ------------------- | ----------------------------------- | -------- | --------------------------- | ------------- |
| Dr. John Smith      | `john.smith@clinictrustai.com`      | doctor   | Metro Heart Institute       | 350           |
| Dr. Michael Chen    | `michael.chen@clinictrustai.com`    | doctor   | Neuroscience Medical Center | 420           |
| Dr. Robert Williams | `robert.williams@clinictrustai.com` | doctor   | Westside Family Medicine    | 290           |
| Nurse Sarah Johnson | `sarah.johnson@clinictrustai.com`   | provider | Community Care Hospital     | 175           |

### Admin account

| Name       | Email                     | Role  |
| ---------- | ------------------------- | ----- |
| Admin User | `admin@clinictrustai.com` | admin |

> Admin logs in at `/admin/login`. Providers log in at the standard login page.

### Pre-seeded data (synthetic mode)

| Collection              | Records                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| Users                   | 5 (1 admin, 4 providers)                                                          |
| Patients                | 5                                                                                 |
| Referrals               | 3                                                                                 |
| Prior Auth requests     | 10 (covering all statuses)                                                        |
| Patient notifications   | 12                                                                                |
| Notification templates  | 6                                                                                 |
| Campaigns               | 3                                                                                 |
| Ambient sessions        | 10 (all statuses and urgencies)                                                   |
| Provider match profiles | 15 (across 14 specialties)                                                        |
| Match sessions          | 5                                                                                 |
| DTx programs            | 10 (across mental health, metabolic, musculoskeletal, cardiovascular, behavioral) |
| DTx prescriptions       | 7 (spanning all lifecycle statuses)                                               |

---

## Deploying to Azure

### Prerequisites

- Azure App Service resource (Node.js 20 LTS, Linux)
- MongoDB Atlas connection string
- Azure CLI (optional)

---

### Step 1 — Build the React frontend

```bash
cd client
set CI=false
set DISABLE_ESLINT_PLUGIN=true
npm run build
cd ..
```

---

### Step 2 — Create the deployment package

```bat
build-for-azure.bat
```

Produces `clinictrust-ai-azure.zip`.

---

### Step 3 — Configure Azure App Service settings

| Application Setting                                       | Value                                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `WEBSITE_NODE_DEFAULT_VERSION`                            | `20.x`                                                                                             |
| `NODE_ENV`                                                | `production`                                                                                       |
| `PORT`                                                    | `8080`                                                                                             |
| `MONGO_URI`                                               | MongoDB Atlas connection string                                                                    |
| `JWT_SECRET`                                              | Strong random secret                                                                               |
| `JWT_EXPIRE`                                              | `30d`                                                                                              |
| `AZURE_OPENAI_ENDPOINT`                                   | Azure OpenAI resource endpoint                                                                     |
| `AZURE_OPENAI_API_KEY`                                    | Azure OpenAI key                                                                                   |
| `AZURE_OPENAI_DEPLOYMENT_NAME`                            | GPT-4 deployment name                                                                              |
| `AZURE_SPEECH_KEY`                                        | Azure Speech key                                                                                   |
| `AZURE_SPEECH_REGION`                                     | Azure region (e.g. `eastus`)                                                                       |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD`                       | Only if you want real transactional email sent (otherwise emails are logged, not sent)             |
| `POLYGON_RPC_URL` / `CLINICTOKEN_ADDRESS` / `PRIVATE_KEY` | Only if you want token mint/burn to settle on real Polygon (otherwise MongoDB-ledger mode is used) |
| `WALLET_MASTER_MNEMONIC` / `WALLET_ENCRYPTION_KEY`        | Only if you want deterministic, recoverable provider wallets                                       |
| `SCM_DO_BUILD_DURING_DEPLOYMENT`                          | `true`                                                                                             |

> Full explanation of every setting — including what happens if you omit it — is in **[Infrastructure & Go-Live Configuration](#infrastructure--go-live-configuration)**.

---

### Step 4 — Deploy

**Via Portal:** App Service → Deployment Center → Manual → ZIP Deploy → upload `clinictrust-ai-azure.zip`

**Via CLI:**

```bash
az webapp deploy \
  --resource-group <your-resource-group> \
  --name <your-app-service-name> \
  --src-path clinictrust-ai-azure.zip \
  --type zip
```

---

### Step 5 — Verify

```bash
az webapp log tail --resource-group <rg> --name <app-name>
```

Expected:

```
✅  MongoDB connected — running in live database mode
🚀  Server running on port 8080 [LIVE DB]
```

---

## Infrastructure & Go-Live Configuration

Every environment variable in this app is read via `process.env` with a graceful fallback — the platform is fully runnable with **zero external infrastructure** (see [Synthetic Data Mode](#synthetic-data-mode)). This section documents every real infrastructure dependency, whether it's required, and exactly how to configure it for a production go-live.

### Quick reference — what's required vs optional

| #   | Service                                                                                                                  | Required for go-live? | Fallback if not configured                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------- |
| 1   | [MongoDB](#1-mongodb-primary-database-required)                                                                          | **Yes**               | Synthetic in-memory data (dev/demo only — resets on restart)                       |
| 2   | [JWT secrets](#2-jwt-secrets-required)                                                                                   | **Yes**               | Server refuses to start                                                            |
| 3   | [Azure OpenAI](#3-azure-openai-clinical-ai-and-llm-optional)                                                             | No                    | Heuristic rule-based analysis + canned templates                                   |
| 4   | [Azure Speech](#4-azure-speech-services-speech-to-text-optional)                                                         | No                    | Browser Web Speech API transcript only (no error, no code change either way)       |
| 5   | [Gmail SMTP](#5-email-gmail-smtp-recommended)                                                                            | Recommended           | Emails are logged to console, never sent                                           |
| 6   | [Polygon blockchain](#6-polygon-blockchain-token-ledger-optional)                                                        | No                    | MongoDB-backed hash-chained ledger (fully verifiable, no crypto needed)            |
| 7   | [HD wallet / encryption key](#7-hd-wallet-generation-optional)                                                           | No                    | Random, non-deterministic wallet address per user                                  |
| 8   | [File storage](#8-file-storage-local-disk-s3-or-azure-blob-optional)                                                     | No                    | Local disk (`server/uploads/`) — works, but not safe for multi-instance production |
| 9   | [SMS / Email / Push notifications](#9-sms-email-and-push-notifications-twilio-sendgrid-azure-notification-hubs-optional) | No                    | Console-log stub — real SDKs installed and wired, no code change needed either way |

---

### 1. MongoDB primary database (Required)

Every piece of operational data (users, patients, referrals, tokens, KYC, prior auth, ambient sessions, blockchain ledger, etc.) lives in MongoDB.

| Variable    | Required | Description                                                                                                                       |
| ----------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI` | **Yes**  | Full MongoDB connection string, e.g. `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority` |

**How to configure:**

1. Create a free/paid cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and copy the connection string.
3. Whitelist your server's outbound IP (or `0.0.0.0/0` for quick testing — restrict this before go-live).
4. Set `MONGO_URI` in `.env` (local) or your hosting platform's app settings (Azure App Service, etc.).
5. Seed demo data with `npm run populate_db` (optional — drops and recreates all collections).

**What happens if you skip it:** the server waits 8 seconds for a connection, then automatically starts in **Synthetic Data Mode** — a full in-memory implementation of every API route (`server/routes/syntheticRouter.js`). This is great for demos but **data does not persist across restarts** and is not suitable for production.

---

### 2. JWT secrets (Required)

| Variable             | Required           | Description                 |
| -------------------- | ------------------ | --------------------------- |
| `JWT_SECRET`         | **Yes**            | Signs access tokens         |
| `JWT_REFRESH_SECRET` | **Yes**            | Signs refresh tokens        |
| `JWT_RESET_SECRET`   | **Yes**            | Signs password-reset tokens |
| `JWT_EXPIRE`         | No (default `30d`) | Access token lifetime       |

**How to configure:** generate three distinct random secrets — never reuse one across the three variables:

```bash
node -e "require('crypto').randomBytes(64).toString('hex')"
```

**What happens if you skip it:** the server checks `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_RESET_SECRET` at startup (`server/index.js`) and **exits immediately with a fatal error** if any are missing — this is the one category with no fallback.

---

### 3. Azure OpenAI clinical AI and LLM (Optional)

Powers AI-generated content across three features: **Prior Authorization** (recommendation + appeal letter drafting), **Ambient Clinical Intelligence** (SOAP note generation from transcripts), and referral summaries.

| Variable                                                      | Required                          | Description                                                                          |
| ------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `AZURE_OPENAI_ENDPOINT`                                       | No                                | Your Azure OpenAI resource endpoint, e.g. `https://<resource-name>.openai.azure.com` |
| `AZURE_OPENAI_KEY` (or `AZURE_OPENAI_API_KEY`)                | No                                | API key from the Azure OpenAI resource — both names are accepted                     |
| `AZURE_OPENAI_DEPLOYMENT` (or `AZURE_OPENAI_DEPLOYMENT_NAME`) | No (default `gpt-4o`)             | Name of the model deployment you created in Azure OpenAI Studio                      |
| `AZURE_OPENAI_API_VERSION`                                    | No (default `2024-05-01-preview`) | API version string                                                                   |

**How to configure:**

1. Create an **Azure OpenAI** resource in the Azure Portal (requires an approved Azure OpenAI access request on new subscriptions).
2. In **Azure OpenAI Studio**, deploy a chat model (e.g. `gpt-4o`) and note the **deployment name**.
3. Copy the resource **Endpoint** and **Key** from the resource's "Keys and Endpoint" blade.
4. Set the four variables above.

**What happens if you skip it:** `server/services/azureAIService.js` falls back to deterministic heuristic scoring (documentation length, diagnosis count, urgency) with lower confidence scores, and returns canned appeal-letter/clinical-insight templates. The full UI workflow still works end to end — output quality is just template-based instead of generative.

---

### 4. Azure Speech Services speech to text (Optional)

Used by **Ambient Clinical Intelligence** for a higher-accuracy, server-side final transcript of the recorded encounter — layered on top of the browser's live Web Speech API captions, not a replacement for them.

| Variable              | Required | Description                                             |
| --------------------- | -------- | ------------------------------------------------------- |
| `AZURE_SPEECH_KEY`    | No       | Key from your Azure Speech resource                     |
| `AZURE_SPEECH_REGION` | No       | Azure region the resource is deployed in, e.g. `eastus` |

**How to configure:** create an **Azure AI Services (Speech)** resource in the Azure Portal, copy the key + region from "Keys and Endpoint", set both variables. No npm install and no code change required — the server calls the Azure Speech-to-Text REST API directly over HTTPS (not the native Speech SDK), so there's no GStreamer/native-codec dependency to install either.

**How it works:** while recording, the browser captures both a live Web Speech API transcript (shown in real time) _and_ a raw audio clip via `MediaRecorder`. When the provider stops recording, the client uploads that clip to `POST /api/ambient-sessions/transcribe`, which calls `ambientIntelligenceService.transcribeAudio()`. If Azure Speech is configured, the clip is sent to Azure's REST recognition endpoint and the resulting transcript **replaces** the Web Speech draft (usually more accurate, especially for medical terminology) before the provider submits for AI analysis.

**What happens if you skip it:** `transcribeAudio()` immediately returns `{ stub: true, transcript: null }` without ever calling Azure, and the client keeps the Web Speech API transcript unchanged. No error, no extra latency beyond one fast round-trip, no different behavior visible to the user — the feature is fully functional either way.

---

### 5. Email Gmail SMTP (Recommended)

Used for password reset links, KYC status emails, referral notifications, and appointment reminders (`server/services/emailService.js`).

| Variable                    | Required                             | Description                                                        |
| --------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `GMAIL_USER`                | Recommended                          | The Gmail address to send from                                     |
| `GMAIL_APP_PASSWORD`        | Recommended                          | A 16-character **App Password**, not your normal Gmail password    |
| `EMAIL_VERIFICATION_SECRET` | Recommended                          | Separate JWT secret used specifically for email-verification links |
| `CLIENT_URL`                | No (default `http://localhost:3000`) | Base URL used to build links inside emails                         |
| `EMAIL_DOMAIN`              | No (default `clinictrustai.com`)     | Domain used to build the `noreply@` sender address                 |
| `COMPANY_ADDRESS`           | No                                   | Physical address included in email footers for CAN-SPAM compliance |
| `ADMIN_NOTIFICATION_EMAIL`  | No                                   | Address that receives internal admin alert emails                  |

**How to configure:**

1. Enable 2-Step Verification on the sending Gmail account.
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
3. Set `GMAIL_USER` to the full Gmail address and `GMAIL_APP_PASSWORD` to the generated 16-character password (no spaces).

**What happens if you skip it:** emails are logged to the console instead of being sent (`{ messageId: 'disabled-by-settings', skipped: true }`) — no error, but users never receive password resets, KYC updates, or referral emails. For a real go-live this should be configured, or swapped for a transactional email provider (SendGrid, Amazon SES, Azure Communication Services) by extending `emailService.js`.

---

### 6. Polygon blockchain token ledger (Optional)

Backs the token economy (earn/transfer/redeem) and referral audit trail. By default, everything runs in **MongoDB ledger mode** — a hash-chained, tamper-evident `BlockchainTransaction` collection (each record embeds the previous record's hash, mirroring how a real blockchain links blocks). Setting the three variables below switches token mint/burn operations to real on-chain transactions on Polygon.

| Variable              | Required             | Description                                                                |
| --------------------- | -------------------- | -------------------------------------------------------------------------- |
| `POLYGON_RPC_URL`     | No                   | JSON-RPC endpoint, e.g. Amoy testnet `https://rpc-amoy.polygon.technology` |
| `CLINICTOKEN_ADDRESS` | No                   | Deployed `ClinicToken` ERC-20 contract address                             |
| `PRIVATE_KEY`         | No — **keep secret** | Private key of the platform's minting wallet (needs MATIC/POL for gas)     |
| `POLYGON_NETWORK`     | No (default `amoy`)  | Human-readable network name shown in the admin UI                          |
| `POLYGONSCAN_API_KEY` | No                   | Used only at contract-deploy time, for PolygonScan source verification     |

**How to configure (testnet):**

1. Get a free Amoy testnet RPC URL (the default public one works for light use, or use Alchemy/Infura for reliability).
2. Get testnet MATIC from a Polygon Amoy faucet for your deployer wallet.
3. Deploy the contract: `npm run contract:deploy:amoy` (uses `hardhat.config.js`, which reads a separate `DEPLOYER_PRIVATE_KEY` env var — not the same as the runtime `PRIVATE_KEY` above).
4. Copy the deployed contract address into `CLINICTOKEN_ADDRESS`.
5. Fund the _runtime_ minting wallet (the address for `PRIVATE_KEY`) with a small amount of MATIC for gas.
6. Set `POLYGON_RPC_URL`, `CLINICTOKEN_ADDRESS`, `PRIVATE_KEY`, `POLYGON_NETWORK=amoy`.

**For mainnet go-live:** repeat with `npm run contract:deploy:local`/a mainnet Hardhat network config, real MATIC/POL for gas, and set `POLYGON_NETWORK=polygon`. Treat `PRIVATE_KEY` as a production secret (Azure Key Vault, not plain app settings, is recommended).

**What happens if you skip it:** `server/blockchain/polygon.js`'s `isConfigured()` check returns false unless all three of `POLYGON_RPC_URL`, `CLINICTOKEN_ADDRESS`, and `PRIVATE_KEY` are set — every token operation then silently uses the MongoDB ledger instead. Nothing breaks; the admin ledger browser and integrity-check endpoints work identically in both modes.

> **Note:** `package.json` may reference `npm run blockchain:start` / `blockchain:stop`, which call `startFabric.sh` / `stopFabric.sh` for a Hyperledger Fabric network. That directory and those scripts do not exist in this codebase (leftover from an earlier prototype) — ignore them. The `fabric-network` npm package is also an unused leftover dependency. The actual blockchain layer is Polygon + the MongoDB ledger described above.

---

### 7. HD wallet generation (Optional)

Each provider gets a blockchain wallet address (shown on their Profile page and used for on-chain token transfers).

| Variable                 | Required | Description                                                                               |
| ------------------------ | -------- | ----------------------------------------------------------------------------------------- |
| `WALLET_MASTER_MNEMONIC` | No       | A BIP-39 mnemonic phrase; each user's wallet is deterministically derived from it         |
| `WALLET_ENCRYPTION_KEY`  | No       | A 32-character key used to AES-256-GCM encrypt derived private keys before they're stored |

**How to configure:**

```bash
# Generate a mnemonic
node -e "const { ethers } = require('ethers'); console.log(ethers.Wallet.createRandom().mnemonic.phrase)"
# Generate an encryption key
node -e "require('crypto').randomBytes(32).toString('hex')"
```

Store both as long-lived secrets — losing `WALLET_MASTER_MNEMONIC` means existing derived wallets can no longer be recomputed; losing `WALLET_ENCRYPTION_KEY` means stored private keys can no longer be decrypted.

**What happens if you skip it:** each user gets a random (non-deterministic, non-recoverable) wallet address instead — fine for demos, not appropriate for a real token economy holding any value.

---

### 8. File storage local disk S3 or Azure Blob (Optional)

KYC verification documents and profile avatars are handled by a storage abstraction (`server/utils/fileStorage.js`) that automatically picks **AWS S3**, **Azure Blob Storage**, or **local disk** based on which environment variables are present at process start — no code change needed to switch between them.

**Precedence when more than one is configured:** S3 > Azure Blob > local disk.

| Variable                          | Provider   | Description                                                                                     |
| --------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`               | AWS S3     | IAM access key with `s3:PutObject`/`GetObject`/`DeleteObject`/`HeadObject` on the target bucket |
| `AWS_SECRET_ACCESS_KEY`           | AWS S3     | Secret for the above key                                                                        |
| `AWS_S3_BUCKET`                   | AWS S3     | Bucket name (KYC docs and avatars both go here, under `kyc/` and `avatars/` prefixes)           |
| `AWS_REGION`                      | AWS S3     | No (default `us-east-1`) — bucket's region                                                      |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob | Full connection string from the Storage Account's "Access keys" blade                           |
| `AZURE_STORAGE_CONTAINER`         | Azure Blob | Blob container name                                                                             |

**How to configure (S3):**

1. Create an S3 bucket. For avatars to render as `<img>` tags, either enable public read on the `avatars/` prefix or put a CloudFront distribution in front of the bucket. KYC docs under `kyc/` should stay private — they're only ever served through the authenticated `GET /api/admin/kyc/:id/document` route, which streams the object server-side rather than exposing a public URL.
2. Create an IAM user/role scoped to that bucket with `PutObject`, `GetObject`, `DeleteObject`, `HeadObject`.
3. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION`.

**How to configure (Azure Blob):**

1. Create a Storage Account and a container (private access level is fine — same reasoning as above).
2. Copy a connection string from the account's "Access keys" blade.
3. Set `AZURE_STORAGE_CONNECTION_STRING` and `AZURE_STORAGE_CONTAINER`.

**What happens if you skip it:** `getStorageMode()` returns `'local'` and every upload behaves exactly as it always has — files are written to `server/uploads/kyc/` and `server/uploads/avatars/` and served via `express.static`. No error, no different code path taken by the caller — `onboarding.js`, `users.js`, and `admin/kyc.js` all call the same `fileStorage.*` functions regardless of mode.

**Known limitation:** avatar replacement only auto-deletes the previous file in local-disk mode (cleaning up a cloud-stored old avatar would require parsing a public URL back into a bucket/key, which isn't implemented). This is a minor storage-cost issue, not a functional one — old avatars are simply left in place when S3/Azure Blob is active.

---

### 9. SMS email and push notifications Twilio SendGrid Azure Notification Hubs (Optional)

`server/services/patientEngagementService.js` is a unified multi-channel notification interface (email / SMS / push) backed by real provider SDK calls: **Twilio** (SMS), **SendGrid** (email — an alternative to the Gmail SMTP option in section 5, useful for higher volume), and **Azure Notification Hubs** (push). The `twilio`, `@sendgrid/mail`, and `@azure/notification-hubs` packages are already installed and required by the code — no npm install or code change needed.

| Variable                                   | Provider                       | Description                                      |
| ------------------------------------------ | ------------------------------ | ------------------------------------------------ |
| `TWILIO_ACCOUNT_SID`                       | Twilio (SMS)                   | Account SID (starts with `AC…`)                  |
| `TWILIO_AUTH_TOKEN`                        | Twilio (SMS)                   | Auth token                                       |
| `TWILIO_PHONE_NUMBER`                      | Twilio (SMS)                   | Sending number, E.164 format e.g. `+15551234567` |
| `SENDGRID_API_KEY`                         | SendGrid (email)               | API key (starts with `SG.`)                      |
| `SENDGRID_FROM_EMAIL`                      | SendGrid (email)               | Verified sender address                          |
| `AZURE_NOTIFICATION_HUB_CONNECTION_STRING` | Azure Notification Hubs (push) | Full connection string from the Azure Portal     |
| `AZURE_NOTIFICATION_HUB_NAME`              | Azure Notification Hubs (push) | Notification Hub resource name                   |

**What happens if you skip it:** each function (`sendEmail`, `sendSMS`, `sendPushNotification`) checks its provider's key env var first; if it's absent, it logs a `[...STUB]` message and returns `{ success: true, stub: true }` immediately — the provider SDK is never even `require()`'d. No error, no partial state, no fake-success-while-configured trap. Set the variables above and it starts sending for real on the very next call; unset them and it's back to a harmless stub — no code change either way.

**One caveat on push notifications specifically:** Azure Notification Hubs delivers to _registered device installations_ (a mobile app that has registered itself with the hub and a matching notification template). This web app has no mobile client doing that registration today, so `sendPushNotification()` is correctly implemented and will call Azure for real, but there's nothing on the receiving end to actually display a push notification to yet — it's ready for when a mobile client exists.

---

## Data Models

### Core Models

**User** — `name`, `email`, `password` (bcrypt), `role`, `specialty`, `organization`, `tokenBalance`, `isActive`, `kycVerified`

**Patient** — `patientId`, `name`, `dateOfBirth`, `gender`, `medicalHistory`, `assignedDoctor`

**Referral** — `patient`, `referringProvider`, `receivingProvider`, `reason`, `urgency`, `status`, `billing`, `blockchainTxId`

**Token** — `user`, `balance`, `transactions[]` (type, amount, blockchainTxId, timestamp)

**Analytics** — `date`, `referralCount`, `successRate`, `avgProcessingTime`, `tokenActivity`, `patientOutcomes`

### Advanced Feature Models

**PriorAuth** — `patient`, `provider`, `requestedService`, `diagnosisCodes`, `urgency`, `status`, `submittedAt`, `decisionAt`, `denialReason`, `approvalCode`, `editHistory[]`

**PatientNotification** — `patientId`, `title`, `message`, `channels[]`, `status` (sent/failed/partial), `channelResults[]`, `sentAt`

**NotificationTemplate** — `name`, `type`, `subject`, `body`, `channels`, `variables[]`

**NotificationCampaign** — `name`, `templateId`, `targetAudience`, `scheduledAt`, `status`, `deliveryStats`

**AmbientSession** — `sessionId`, `providerId`, `patientId`, `chiefComplaint`, `audioTranscript`, `clinicalSummary` (SOAP), `referralNoteDraft`, `urgencyClassification`, `icdCodes[]`, `recommendedSpecialty`, `status`, `approvedNote`, `editHistory[]`, `linkedReferralId`

**ProviderMatchProfile** — `providerId`, `specialty`, `subSpecialties[]`, `acceptedInsurance[]`, `city`, `state`, `acceptanceRate`, `avgResponseTimeDays`, `tokenBalance`, `tokenEarned`, `availabilityScore`, `networkParticipation`, `isAcceptingReferrals`, `boardCertified`, `telehealth`

**MatchSession** — `requestedBy`, `specialty`, `patientInsurance`, `urgency`, `resultsCount`, `topMatchScore`, `selectedProviderId`, `suggestions[]`, `linkedReferralId`

**DtxProgram** — `name`, `vendor`, `category` (mental_health / metabolic / musculoskeletal / cardiovascular / behavioral / respiratory / neurology / general), `description`, `conditions[]`, `evidenceLevel` (fda_cleared / fda_authorized / peer_reviewed / evidence_based / clinical_study), `durationWeeks`, `deliveryFormat` (app / web / both / coaching / hybrid), `contentTypes[]`, `highlights[]`, `contraindications[]`, `tokenReward`, `isActive`, `integrationUrl`, `prescriptionCount`, `avgEngagementScore`

**DtxPrescription** — `programId` (ref: DtxProgram), `programName`, `programVendor`, `programCategory`, `providerId` (ref: User), `providerName`, `patientName`, `patientId`, `patientEmail`, `patientPhone`, `status` (prescribed / enrolled / active / completed / dropped), `linkedReferralId` (ref: Referral), `prescribedAt`, `enrolledAt`, `completedAt`, `droppedAt`, `engagementScore` (0–100), `outcomeNotes`, `clinicalNotes`, `tokenRewardIssued`, `tokenRewardAmount`, `statusHistory[]`

---

## Security Design

| Layer                | Mechanism                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication       | JWT (stateless Bearer tokens) — no server-side session state                                                                                                                                |
| Password storage     | bcrypt with salt rounds — no plaintext or reversible hashing                                                                                                                                |
| Authorization        | `protect` validates JWT; `authorize(...roles)` enforces RBAC per route                                                                                                                      |
| Admin separation     | Dedicated `/api/admin/auth` route and `Admin` model — isolated from standard user auth                                                                                                      |
| Transport            | HTTPS enforced by Azure App Service TLS termination                                                                                                                                         |
| Secrets management   | Environment variables only — never committed to source control                                                                                                                              |
| Blockchain integrity | Hash-chained MongoDB ledger (`BlockchainTransaction`) provides cryptographic tamper-evidence for referral/token records; Polygon settlement adds public-chain verifiability when configured |
| Wallet key storage   | Private keys derived from `WALLET_MASTER_MNEMONIC` are AES-256-GCM encrypted at rest with `WALLET_ENCRYPTION_KEY` before being written to disk/DB                                           |
| FHIR access control  | All FHIR endpoints require JWT; audit logs capture every EHI access event                                                                                                                   |
| AI data handling     | Ambient session transcripts and clinical notes are stored per-patient with provider-scoped access — providers can only access their own sessions                                            |
| Error handling       | Centralised Express error middleware — stack traces never exposed to clients                                                                                                                |
| Input trust boundary | Validation at route layer; unhandled async errors caught by `async.js` wrapper                                                                                                              |
| Rate limiting        | Auth endpoints are rate-limited (20 req / 15 min window) to prevent credential stuffing                                                                                                     |

---

## License

MIT
