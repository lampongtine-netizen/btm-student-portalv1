# BTM Student Portal (front end)

Standalone Next.js student portal for BTM Business Advisory & Support, rebuilt from the Shopify member-portal theme (same black / ivory / taupe design).

**Status:** front end complete, running on **sample data**. Not yet connected to the shared Supabase database or Stripe.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Sign in with any email and the code **123456**.

To see live updates, open **/dev/staff** (Staff Simulator) in a second tab. It plays the Staff Portal's role: replies, guidance notes, new Support Plans and membership changes appear in the student tab without a refresh.

## Screens

Dashboard · Priority List · My Support Plan · Business Audit · Monthly Check-In · Power Sessions · Communications · Resources · Notifications · Scale Society (Level 2 gated) · Membership & Billing · My Details · Login (email one-time code)

## How the backend plugs in

All pages read and write through one interface: `lib/data/source.ts`.

| File | What it is |
| --- | --- |
| `lib/data/types.ts` | The shapes the screens use (Student, Membership, Priority, Message, …) |
| `lib/data/sample-source.ts` | Sample data in the browser (current mode) |
| `lib/data/supabase-source.ts` | Shared Supabase database. Login + realtime are written; table reads are stubbed (`NOT_WIRED`) until the schema audit |
| `lib/data/provider.tsx` | `useLiveQuery`: loads data and refetches when a topic changes (realtime) |

To connect after the audit:
1. Fill `TABLES` in `supabase-source.ts` with the Staff Portal's existing table names.
2. Map each method to those tables (no new parallel tables).
3. Confirm RLS so a student only sees their own rows, and add the tables to the `supabase_realtime` publication.
4. Add server routes for the Stripe webhook, Billing Portal and upgrade Checkout (secret keys server-side only).
5. Set `NEXT_PUBLIC_DATA_SOURCE=supabase` and the publishable Supabase key (see `.env.example`).

## Before going live

- `/dev/staff` only works in sample mode; remove or protect it before production.
- The live site's heading font "Perfectly Nineties" isn't loaded anywhere (it falls back to Georgia there too). Add the font file if Bree has a licence.
- Power Session booking is a "request a time" flow; the live calendar (Easy Appointment Booking on Shopify) needs a replacement or a link.
