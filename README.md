# MedTrack — Multi-Channel Medicine Stock & Reorder System

> Personal medicine inventory tracker and lead-time reorder forecasting system styled with the **Airbnb design system** (#ff385c Rausch, clean white canvas, pill search, and rounded card geometry).

---

## 1. Overview & Core Problem

- **Variable Dosage Schedules:** Medicines have unique dosage intervals (e.g. 1 morning + 1 night = 2/day, or weekly 1 sachet = 0.14/day).
- **Asymmetric Delivery Lead Times:**
  - **Apollo 24|7 (Online):** 7–10 days (bulk planned reorders)
  - **Mr. Med (Specialty Online):** 3–5 days (fast specialty refills)
  - **Offline Local Pharmacy:** 0–1 day (immediate emergency walk-in)
- **The Risk:** Without forward lead-time forecasting, stock reaches zero before an online order arrives. MedTrack computes exact order-by deadlines per channel with configurable safety buffers.

---

## 2. Core Mathematical Formulas

### 2.1 Time-Anchored Daily Stock Depletion
Rather than mutating stock in daily cron jobs, stock is continuously computed from an immutable physical count anchor:
$$\text{Current Stock}(t) = \text{Baseline Stock} - (\text{Daily Consumption} \times \Delta\text{days}) + \sum \text{Received Restocks} + \sum \text{Adjustments}$$

### 2.2 Days Remaining & Stock-Out Date
$$\text{Days Remaining} = \left\lfloor \frac{\text{Current Stock}}{\text{Daily Consumption}} \right\rfloor$$
$$\text{Stock-out Date} = \text{Today} + \text{Days Remaining}$$

### 2.3 Per-Channel "Order-By" Cutoff Deadlines
$$\text{Order-By Date}(\text{channel}) = \text{Stock-out Date} - \text{Lead Time}_{\max}(\text{channel}) - \text{Safety Buffer Days}$$

### 2.4 30-Day Monthly Procurement & Pack Math
$$\text{Monthly Units Needed} = 30 \times \text{Daily Consumption}$$
$$\text{Packs Required} = \left\lceil \frac{\text{Monthly Units Needed}}{\text{Units Per Pack}} \right\rceil$$

---

## 3. Urgency Cascade

1. **OK (Green):** Today $\le$ Apollo Order-By Date $\rightarrow$ All 3 channels viable.
2. **Order Soon (Yellow):** Past Apollo date, but $\le$ Mr. Med Order-By Date $\rightarrow$ Order via Mr. Med now.
3. **Order Now (Orange):** Past Mr. Med date, but $\le$ Offline Order-By Date $\rightarrow$ Walk into local pharmacy.
4. **Critical (Red):** Past all order deadlines, or $\le 0$ days remaining $\rightarrow$ Stockout imminent.
5. **In-Transit Shield:** If an order is in transit and arrives before the stock-out date, alerts are intelligently muted.

---

## 4. Tech Stack

- **Framework:** Next.js 15 (App Router, Server Actions, TypeScript)
- **Styling:** Tailwind CSS with Airbnb Design System Tokens (`#ff385c` Rausch, `#222222` Ink, `#ffffff` Canvas, `#ebebeb` Hairlines, 14–24px radius, single subtle shadow tier)
- **Icons:** Lucide React
- **Database:** Universal dual-mode storage:
  - **Local Development / Zero Setup:** Embedded SQLite via `@libsql/client` in `data/medtracker.db`
  - **Production:** Supabase Postgres (`DATABASE_URL`) with full SQL DDL in `supabase/schema.sql`
- **Email Notifications:** Resend API via `/api/cron/daily-digest`
- **Cron Automation:** Vercel Cron (`vercel.json`) triggered daily at 08:00 AM

---

## 5. Quick Start (Local)

```bash
# 1. Install dependencies
pnpm install

# 2. Run the development server
pnpm dev

# 3. Open http://localhost:3000 in your browser
```

Click **"Load Sample Meds"** in the top navigation bar to populate sample prescription data with real lead-time calculations (Thyronorm 50mcg, Telma 40mg, Glycomet-GP 2, Vitamin D3).

---

## 6. Supabase Cloud Setup

1. Create a project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](./supabase/schema.sql).
4. Add your Supabase Postgres connection string to your `.env` or Vercel environment variables:
   ```env
   DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   RESEND_API_KEY=re_123456789
   REMINDER_EMAIL=your.email@gmail.com
   ```

---

## 7. App Routes

- `/` — Inventory Dashboard (urgency badges, stock burn horizon, lead-time chips, quick restock & count modal)
- `/planning` — 30-Day Monthly Procurement Planner & Vendor Pack Rounding Calculator
- `/medicines/new` — Add Prescription Medicine (dosage builder, fractional doses, per-channel lead time overrides)
- `/medicines/[id]` — Medicine Detail View (30-day stock depletion curve, channel deadlines breakdown, in-transit tracker, restock history, audit logs)
- `/medicines/[id]/edit` — Edit Medicine Profile & Schedules
- `/settings` — Default Lead Times, Global Safety Buffer, Supabase SQL Migration Exporter, and Daily Reminder Digest Tester
- `/api/cron/daily-digest` — Automated daily reorder alert route
