"use client";

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { DataSource } from "./source";
import type { Topic } from "./types";

/**
 * Supabase data source — the shared Staff Portal database.
 *
 * STATUS: skeleton. Login (email one-time code) and the realtime wiring are
 * written; the table reads/writes are NOT wired yet because the real schema
 * hasn't been audited. Every unwired method throws NOT_WIRED so nothing can
 * silently write to the wrong table.
 *
 * Wiring checklist (after the schema audit):
 *  1. Fill TABLES with the existing table names the Staff Portal already uses.
 *  2. Confirm each table has a student_id (or equivalent) column + RLS so a
 *     student can only read their own rows (auth.uid() -> student id).
 *  3. Add those tables to the `supabase_realtime` publication.
 *  4. Implement each method below by mapping rows -> lib/data/types.ts.
 *  5. Billing + upgrade links must come from server routes (Stripe secret key
 *     never reaches the browser).
 */

export const TABLES: Record<Topic, string | null> = {
  student: null, // e.g. "members"
  membership: null, // e.g. "memberships" (written only by the Stripe webhook)
  priorities: null,
  messages: null,
  support_plans: null,
  business_audit: null,
  check_ins: null,
  power_sessions: null,
  resources: null,
  notifications: null,
};

/** Column that scopes each table to one student. Confirm per table in the audit. */
const STUDENT_COLUMN = "student_id";

function notWired(name: string): never {
  throw new Error(`NOT_WIRED: ${name} — connect after the Supabase schema audit.`);
}

class SupabaseDataSource implements DataSource {
  readonly mode = "supabase" as const;
  private client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private connectionListeners = new Set<(c: boolean) => void>();

  constructor(url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }

  // ---------- auth: one student login (email one-time code) ----------
  async getSession() {
    const { data } = await this.client.auth.getSession();
    const u = data.session?.user;
    // studentId is resolved from the members table after the audit; the auth
    // user id is the stable link between login and student record.
    return u ? { studentId: u.id, email: u.email ?? "" } : null;
  }
  async requestLoginCode(email: string) {
    // shouldCreateUser:false — only students provisioned by the Stripe webhook
    // (or existing members) can sign in. No self-signup without payment.
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    return error ? { ok: false as const, reason: "We couldn't find an active membership for that email." } : { ok: true as const };
  }
  async verifyLoginCode(email: string, code: string) {
    const { error } = await this.client.auth.verifyOtp({ email, token: code, type: "email" });
    return error ? { ok: false as const, reason: "That code is invalid or has expired." } : { ok: true as const };
  }
  async signOut() {
    await this.client.auth.signOut();
  }

  // ---------- data (wire after audit) ----------
  getStudent = () => notWired("getStudent");
  updateStudent = () => notWired("updateStudent");
  completeOnboarding = () => notWired("completeOnboarding");
  getMembership = () => notWired("getMembership");
  getBillingPortalUrl = () => notWired("getBillingPortalUrl");
  getUpgradeUrl = () => notWired("getUpgradeUrl");
  listPriorities = () => notWired("listPriorities");
  createPriority = () => notWired("createPriority");
  updatePriority = () => notWired("updatePriority");
  deletePriority = () => notWired("deletePriority");
  listMessages = () => notWired("listMessages");
  sendMessage = () => notWired("sendMessage");
  markMessagesRead = () => notWired("markMessagesRead");
  listSupportPlans = () => notWired("listSupportPlans");
  getBusinessAudit = () => notWired("getBusinessAudit");
  saveBusinessAudit = () => notWired("saveBusinessAudit");
  listCheckIns = () => notWired("listCheckIns");
  saveCheckIn = () => notWired("saveCheckIn");
  listPowerSessions = () => notWired("listPowerSessions");
  requestPowerSession = () => notWired("requestPowerSession");
  listResources = () => notWired("listResources");
  listNotifications = () => notWired("listNotifications");
  markNotificationRead = () => notWired("markNotificationRead");

  // ---------- realtime: one channel per student, filtered server-side ----------
  subscribe(topics: Topic[], onChange: (topic: Topic) => void) {
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void this.getSession().then((session) => {
      if (cancelled || !session) return;
      channel = this.client.channel(`student:${session.studentId}:${topics.join(",")}`);
      for (const topic of topics) {
        const table = TABLES[topic];
        if (!table) continue;
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            // RLS still applies; the filter just avoids sending other rows.
            filter: topic === "resources" ? undefined : `${STUDENT_COLUMN}=eq.${session.studentId}`,
          },
          () => onChange(topic),
        );
      }
      channel.subscribe((status) => {
        const up = status === "SUBSCRIBED";
        this.connectionListeners.forEach((cb) => cb(up));
        // After a reconnect, refetch everything in case events were missed.
        if (up) topics.forEach((t) => onChange(t));
      });
      this.channel = channel;
    });

    return () => {
      cancelled = true;
      if (channel) void this.client.removeChannel(channel);
    };
  }
  onConnectionChange(cb: (connected: boolean) => void) {
    this.connectionListeners.add(cb);
    return () => {
      this.connectionListeners.delete(cb);
    };
  }
}

let instance: SupabaseDataSource | null = null;
export function getSupabaseDataSource() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_NOT_CONFIGURED");
  if (!instance) instance = new SupabaseDataSource(url, key);
  return instance;
}
