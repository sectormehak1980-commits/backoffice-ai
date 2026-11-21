# BackOffice AI

**AI-Powered Cashflow, Billing & Operations Workspace for Independent Tutors and Small Tuition Centres**

BackOffice AI replaces fragmented WhatsApp chats, paper attendance registers, and manual fee spreadsheets with a single intelligent back-office workspace built specifically for independent educators and coaching operators in India.

---

## Live Demo & Quick Access

* **Demo Tutor Account:** `priya@mehtatuition.in` / `demo1234` (or click **Explore Demo Workspace** on the welcome screen)
* **Custom Workspace:** Sign up with any tuition centre name and email to initialize a clean local workspace

---

## 1. Problem & User Clarity (20% Evaluation Pillar)

### Target User
Independent home tutors, solo coaching educators, and neighborhood tuition centre owners managing **10 to 150+ students** across multiple batches without dedicated accounting staff.

### Core Pain Points Solved
* **Scattered Operations:** Attendance, extra-class adjustments, fee due dates, and parent follow-ups live across separate notebooks and chat threads.
* **Delayed Collections & Revenue Leakage:** Tutors lose track of overdue monthly fees and unbilled extra sessions, hurting monthly cash consistency.
* **Zero Cashflow Visibility:** Without consolidated receivables and recurring expense tracking, educators cannot forecast upcoming 30/60/90-day liquidity.

---

## 2. Working Product & Core Capabilities (30% Evaluation Pillar)

* **Authentication & Workspace Onboarding (`AuthScreen.jsx`):** Split-screen welcome experience supporting instant one-click demo access, returning sign-in, and new tuition centre onboarding.
* **Executive Dashboard (`Dashboard.jsx`):** Real-time snapshot of collected revenue, pending/overdue receivables, student activity, and quick-action workflows.
* **Student Directory (`Students.jsx`):** Centralized student records with batch details, monthly fee structures, contact info, and instant search filtering.
* **Attendance & Extra-Class Billing (`Attendance.jsx`):** Daily session tracking that converts extra classes directly into billable fee items.
* **Smart Invoicing & Payment Reminders (`Invoices.jsx`):** Automated invoice status tracking (`Paid`, `Pending`, `Overdue`) with one-click parent payment reminder generation.
* **30/60/90-Day Cashflow Forecast (`Forecast.jsx`):** Forward-looking cash projection engine (`forecastEngine.js`) combining expected fee inflows with scheduled expenses.
* **Expense & Bills Tracker (`Bills.jsx`):** Tracks rent, utilities, study material printing, and recurring operational overhead.
* **AI Cashflow Copilot (`AiCopilot.jsx`):** Context-aware assistant that surfaces overdue fee priorities, collection summaries, and actionable financial insights from live workspace state.

---

## 3. Business Viability & Monetization Model (25% Evaluation Pillar)

* **Large Underserved Market:** Millions of independent tutors and micro-coaching institutes across Tier-1, Tier-2, and Tier-3 Indian cities rely on manual workflows because enterprise ERP tools are too complex and expensive.
* **Freemium SaaS Revenue Model:**
  * **Starter (Free):** Up to 25 students, basic attendance, manual invoicing, and dashboard summary.
  * **Pro Tutor (₹299/month):** Unlimited students, automated WhatsApp/SMS reminder templates, extra-class auto-billing, and 30/60/90-day cashflow forecasting.
  * **Multi-Batch Institute (₹799/month):** Multi-teacher access, batch profitability analytics, and exportable tax/accounting reports.
* **High Retention:** Once student rosters, fee cycles, and attendance histories live inside BackOffice AI, switching costs remain naturally high.

---

## 4. Build Quality & Use of Codebenders (15% Evaluation Pillar)

* **Built & Orchestrated in Codebenders IDE:** Developed, debugged, and structured end-to-end inside Codebenders IDE with preserved `.codebenders` project metadata.
* **Clean Modular Architecture:**
  * `src/components/` — Decoupled UI modules (`AuthScreen`, `Dashboard`, `Students`, `Attendance`, `Invoices`, `Forecast`, `Bills`, `Settings`, `AiCopilot`, `Sidebar`, `Header`)
  * `src/store/` — Persistent client-side state & session management (`useAppState.js`, `useAuth.js`)
  * `src/utils/` — Deterministic financial calculation and forecasting utilities (`forecastEngine.js`)
* **Tech Stack:** React 18, Vite, Tailwind CSS, Lucide Icons.

---

## 5. Local Setup & Running Instructions

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Build for production
npm run build