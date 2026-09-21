# TrackMed — Multi-Channel Medicine Stock & Reorder Forecasting System

> A personal, single-user web app and PWA to track prescription medicine inventory across multiple purchase channels with asymmetric delivery lead times, forecasting exact reorder deadlines to eliminate stockout risk.

---

## 1. Overview & Core Problem

- **Asymmetric Supplier Lead Times:** 
  - **Online Bulk Channel:** 7–10+ business days (deep discounts, long transit)
  - **Fast-Delivery Specialty Channel:** 3–5 business days (specialized stock)
  - **Local Walk-in Pharmacy:** 0–1 day (immediate emergency retail)
- **Variable Consumption Dynamics:** Daily demand varies per item (e.g., 6 units/day vs. 1 unit/day vs. weekly single-dose schedules).
- **The Stockout Risk:** Traditional task managers and note apps only remind you of tasks at static times—they do not compute forward inventory burn curves or account for vendor lead times. Without predictive forecasting, stock reaches zero before online shipments arrive.

---

## 2. Mathematical Inventory Engine

### 2.1 Time-Anchored Continuous Stock Depletion
Instead of fragile midnight cron jobs that mutate database counters, real-time on-hand stock is continuously derived from an immutable physical count anchor:

$$\text{Current Stock}(t) = \text{Baseline Count} - (\text{Daily Dose} \times \Delta\text{days}) + \sum \text{Received Restocks} + \sum \text{Manual Adjustments}$$

### 2.2 Depletion Horizon & Stockout Date
$$\text{Days Remaining} = \left\lfloor \frac{\text{Current Stock}}{\text{Daily Dose}} \right\rfloor$$
$$\text{Stockout Date} = \text{Today} + \text{Days Remaining}$$

### 2.3 Per-Channel "Order-By" Cutoff Deadlines
Calculates the latest safe calendar date to trigger a reorder for any vendor:

$$\text{Order-By Date}(\text{channel}) = \text{Stockout Date} - \text{Lead Time}_{\max}(\text{channel}) - \text{Safety Buffer Days}$$

### 2.4 30-Day Monthly Procurement & Whole-Pack Rounding
$$\text{Monthly Units Needed} = 30 \times \text{Daily Dose}$$
$$\text{Packs Required} = \left\lceil \frac{\text{Monthly Units Needed}}{\text{Units Per Pack}} \right\rceil$$

---

## 3. Urgency Cascade & In-Transit Shielding

1. **OK (Green):** Today $\le$ Slowest Online Order-By Date $\rightarrow$ All fulfillment channels viable.
2. **Order Soon (Yellow):** Slow online window passed; order via fast-delivery channel.
3. **Order Now (Orange):** All online delivery windows passed; purchase from local chemist.
4. **Critical (Red):** Stockout imminent ($\le 2$ days).
5. **In-Transit Shielding:** When an order is placed and en route, urgency alarms are automatically muted, displaying an *En Route* tag with estimated delivery arrival date.

---

## 4. Key Features

- **Natural Language AI Intent Assistant:**
  - Type or dictate plain English commands (e.g., *"Bought 4 strips from online pharmacy for 480"* or *"Recounted stock, 18 tablets remaining"*).
  - Integrates with **Groq LPU API** and **Ollama Cloud** with customizable model name inputs (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`, `ollamacloud/gemma4:31b`, etc.).
  - Includes a zero-dependency deterministic NLP fallback engine for 100% offline precision.
  - **Human-in-the-Loop Confirmation Drawer:** Review, edit, and verify extracted numbers before committing to database.
- **1-Click Procurement Cart Builder (`/planning`):**
  - Generates clean, formatted order sheets categorized by vendor.
  - 1-click **Copy to Clipboard** and direct **WhatsApp Share** for sending orders to local pharmacies.
  - 1-tap batch in-transit order logger.
- **Progressive Web App (PWA):**
  - Standalone mobile fullscreen experience with Apple touch icons and viewport safe-area padding.
- **High-Performance UI & Typography:**
  - Liquid Glass dark theme with Fraunces display serif and clean body sans typography.
  - Hardware-accelerated 120 FPS rendering.
- **Dual-Mode Storage Architecture:**
  - **Local Development:** Zero-config embedded SQLite via `@libsql/client` (`data/trackmed.db`).
  - **Production:** Supabase PostgreSQL with SSL connection pooling.
- **Automated Daily Reorder Digest:**
  - Serverless cron route (`/api/cron/daily-digest`) evaluating inventory daily at 08:00 AM.

---

## 5. Tech Stack

- **Framework:** Next.js 16 (App Router, Server Actions, TypeScript, Turbopack)
- **Styling:** Tailwind CSS v4 with custom Liquid Glass design tokens
- **Typography:** Fraunces (Variable Display Serif) + Airbnb Cereal / Circular Sans
- **Database:** Supabase PostgreSQL & `@libsql/client` SQLite
- **Icons:** Lucide React
- **Email:** Resend API

---

## 6. Getting Started (Local Development)

```bash
git clone https://github.com/sauravsz/trackmed.git
cd trackmed

# 2. Install dependencies
pnpm install

# 3. Start local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Cloud Deployment & Supabase Setup

1. Create a project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab and execute [`supabase/schema.sql`](./supabase/schema.sql).
3. Deploy to [Vercel](https://vercel.com) and configure environment variables:
   ```env
   POSTGRES_URL=postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   GROQ_API_KEY=gsk_...
   RESEND_API_KEY=re_...
   REMINDER_EMAIL=your.email@gmail.com
   ```

---

## 8. Application Routes

| Route | Function |
|---|---|
| `/` | Real-time Inventory Dashboard, AI voice/text bar, filter chips, Table & Grid view |
| `/planning` | 30-Day Procurement Planner, Vendor Cart Builder, WhatsApp / Clipboard exporter |
| `/medicines/new` | Add Medicine profile, dosage schedule builder, and channel lead-time overrides |
| `/medicines/[id]` | Medicine detail view, 30-day depletion curve, delivery logs, recount audit history |
| `/medicines/[id]/edit` | Edit prescription profiles and dosage intervals |
| `/settings` | Groq / Ollama AI configuration, channel turnaround settings, Supabase DDL exporter |
| `/api/ai/parse` | Natural language structured intent parsing endpoint |
| `/api/cron/daily-digest` | Automated daily morning reorder evaluation cron |
