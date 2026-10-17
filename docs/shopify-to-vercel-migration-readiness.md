# Shopify → Vercel BTM Student Portal: migration readiness

Audit date: **2026-10-17**. Scope: **read-only preparation, no live cutover or student onboarding**.

## Systems verified

| System | Identifier | Role |
|---|---|---|
| Shopify | `beautytrainingmastery.com/pages/btm-member-portal` | Existing live member frontend; Shopify account login |
| Live Supabase | `ojrandorqgytvzcfiqjt` (BTM Staff Portal; BTM Org) | Current operational records synced from Shopify and Staff Portal |
| Isolated staging Supabase | `grsnbtlpkbswtoebuxel` (BTM Student Portal Staging; Primary) | Existing historic snapshot plus new portal test tables |
| New Vercel | `btm-student-portalv1`; repo `lampongtine-netizen/btm-student-portalv1` | Next.js frontend to be connected after migration validation |

**Do not use Shopify page HTML as a database backup.** Actual data sits across Shopify customer records, Supabase tables, Supabase Storage, and Stripe billing. Shopify-exclusive metafields / customer and subscription fields must still be independently verified via an authorized Shopify Admin export or API.

## Confirmed database inventory (read-only counts, 2026-10-17)

| Dataset | Live count | Snapshot count | Mapping |
|---|---:|---:|---|
| `btm_members` | 31 | 31 | Student profile + immutable Shopify customer ID |
| `btm_member_details` | 12 | 12 | Extended business profile and onboarding |
| `btm_tasks` | 225 | 225 | Priority List and completion |
| `btm_support_plans` | 22 | 22 | Only published, member-visible plans in student UI |
| `btm_business_audits` | 23 | 23 | Business Audit answers, statuses and review |
| `btm_check_ins` | 4 | 4 | Monthly check-ins |
| `btm_conversations` | 32 | 32 | Student conversation membership |
| `btm_messages` | 54 | 53 | Messages and attachment references; refresh delta |
| `btm_notifications` | 352 | 351 | Notifications and read state; refresh delta |
| `btm_member_state` | 332 | 332 | Student portal states and completion, namespaces |
| `btm_resources` | 47 | 47 | Resources, links and file references |
| `btm_power_sessions` | 2 | 2 | Session schedule and bookings |
| `btm_session_attendees` | 2 | 2 | Session attendance and member linking |
| `btm_payments` | 86 | 86 | Payment history (read-only, **not** authority for active access) |
| `btm_subscriptions` | 72 | 72 | Subscription history; reconcile with Stripe authoritative state |
| `btm_activity_log` | 2,033 | 2,027 | Operational audit log; refresh delta |
| `btm_staff_notifications` | 234 | 233 | Staff-only; **never show students** |

Staging `btm_staff_snapshot_rows` currently has **3,569** rows across **20 source tables**. It is a snapshot archive, **not** a normalized app-ready data model, and is restricted to staging reviewers. Only select live-shaped tables currently exist in staging (`btm_members`, `btm_member_details`, `btm_conversations`, `btm_messages`); other source datasets remain in the snapshot archive. The archive has internal/staff-only material; do not expose it wholesale via the public Data API.

Staging currently has just **1 auth user**, **1 portal profile**, and **1 portal membership**. This is not equivalent to the 31 live Shopify member records. The Vercel repo is in **sample mode**, the `lib/data/supabase-source.ts` reads/writes are `NOT_WIRED`, and Vercel project `btm-student-portalv1` currently has no project environment variables. Do **not** flip `NEXT_PUBLIC_DATA_SOURCE` yet or claim login works for existing Shopify students.

## Identity and security: critical

31 Shopify-linked member records have **19 distinct nonempty normalized email addresses** and **31 nonempty Shopify customer IDs**. Email is **not unique**, so **never join records by email alone** or merge Shopify customers based on email.

Create a *reviewed* identity-link table for portal access, e.g. `btm_portal_customer_links (auth_user_id, shopify_customer_id)`, with a unique constraint on `shopify_customer_id`; one verified Supabase auth user may legitimately have multiple approved Shopify customer IDs. Do not auto-create identity links from email equality: verify ownership and business account membership first. Use `auth.uid()` through RLS / authenticated server functions to resolve allowed Shopify IDs. Never pass an arbitrary Shopify customer ID from the browser as authority to read another member's data.

Keep staging reviewer access separate from production student policies. Grant each student access only to their own published content; exclude internal notes, staff-only notifications, unpublished plans and all other students' rows. Never send service-role keys or Stripe secrets to the browser. Do not change live permissions or billing to prepare the migration.

**Shopify authentication is not Supabase authentication.** Existing Shopify one-time codes do not automatically log students into Supabase. Use a controlled invite/identity verification process when new authentication is ready. No bulk invites during staging.

## Source → frontend adapter map

| `DataSource` method(s) | Verified live source tables | Rules |
|---|---|---|
| `getStudent`, `updateStudent`, `completeOnboarding` | `btm_members` + `btm_member_details` | Authenticated identity links; profile fields; preserve existing `shopify_customer_id` |
| `getMembership` | `btm_subscriptions` + authenticated Stripe reconciliation | Enforce membership access server-side; never infer active access from merely having a historical payment |
| `listPriorities`, mutations | `btm_tasks` + `btm_member_state` | Scope to verified customer IDs; preserve completed states and due dates |
| `listMessages`, `sendMessage` | `btm_conversations` + `btm_messages` | Conversation customer ownership; secure attachment access |
| `listSupportPlans` | `btm_support_plans` | Include only `visible_to_member=true` / published plans; exclude internal notes |
| `getBusinessAudit`, `saveBusinessAudit` | `btm_business_audits` | Preserve JSON answer keys, review statuses and audit scores |
| `listCheckIns`, `saveCheckIn` | `btm_check_ins` | Preserve JSON metrics, reflection and completion |
| `listPowerSessions` | `btm_power_sessions` + `btm_session_attendees` | Existing schedule and attendance; separately confirm live booking integration |
| `listResources` | `btm_resources` | Level-gate restricted resources; use signed URLs where private |
| `listNotifications`, read state | `btm_notifications` + `btm_member_state` | Customer ownership and exact read state |

Add remaining adapter methods only after the target tables, RLS and test-user identity mapping exist. Keep all Stripe writes and privileged sync in server endpoints/webhooks with secure secrets. A **copy of the production dataset should not be exposed as a universal student-readable table**.

## Storage inventory

Production and staging currently both report **57 objects across six corresponding buckets**: `btm-check-ins` (5), `btm-checkin-staging` (5), `btm-profile-photos` (2), `btm-resources` (27), `btm-student-resources` (2), `communication-attachments` (16). Staging also has empty private `btm-portal-attachments`. **Counts alone do not prove binary integrity**: verify paths, file hashes/download permissions, signed URLs and every plan PDF / message attachment. The profile-photo bucket is public on production but private on staging, so existing direct photo URLs may need signed URLs or proxy logic.

## Safe execution sequence

1. **Freeze a baseline, not the live service.** Take a dated source inventory and verified backup. Preserve all primary IDs, customer IDs, UUIDs, timestamps, historical statuses and JSON objects. No deletes or destructive merges.
2. **Reconcile staging.** Compare source IDs `(table,id)` and `updated_at`, not just counts. Copy only missing/newer records into an isolated staging import with idempotent upserts. First known gaps: messages (1), notifications (1), activity log (6), staff notifications (1). Keep source tables unchanged.
3. **Complete Shopify-native export.** Verify customer profiles, relevant metafields, memberships and any data not already in Staff Portal Supabase against Shopify Admin before marking extraction complete.
4. **Build normalized read model.** Move snapshot-derived student-owned records into approved target tables or filtered per-student secure functions, with immutable ownership links and row-level policies. Keep reviewer-only snapshot private. Never overwrite newer student edits with an older snapshot.
5. **Wire `lib/data/supabase-source.ts`.** Replace `NOT_WIRED` adapters with verified table mappings, real OTP auth/claims, server-gated billing, safe realtime subscriptions. Do this on a feature branch / preview only; do not enable the sample login in real-data mode.
6. **Validate identity.** Resolve the 31 Shopify IDs and 19 emails, handle duplicate emails explicitly, and test that each student sees *only* their own profile, plans, tasks, messages, files and billing.
7. **Test with named consenting accounts.** Check 3-step signup (landing page → Stripe test checkout → one login), existing-student login, read/write, mobile, notifications, stale-session recovery, Stripe webhook idempotency and staff-side sync. No live charges in tests.
8. **Final delta + go/no-go.** Re-run the two read-only audits immediately before launch, reconcile updates made since the baseline, back up again, then explicitly approve any switch of live URLs. **Shopify and its portal continue working until cutover is separately approved.**

## Gate to switch from sample data to real students

- [ ] Shopify-native customer and metafield source verified
- [ ] Backups and record-ID diff checks complete, zero unintended losses
- [ ] 31 Shopify IDs mapped to the correct verified accounts (duplicates handled)
- [ ] Complete normalised data adapter and safe access policies
- [ ] Student authentication and subscription gating verified
- [ ] Private file links, PDFs and attachments open for their owners only
- [ ] Staff-to-student realtime updates and no-refresh navigation tested
- [ ] No demo login / sample mode or exposed service keys in live deployment
- [ ] Test Stripe checkout + webhook tests pass, no live charges
- [ ] Explicit live cutover decision and tested rollback route

Run `scripts/audit-live-data.sql` on **live (read-only)** and `scripts/audit-staging-snapshot.sql` on **staging (read-only)**. They are intentionally separate because the schemas differ.
