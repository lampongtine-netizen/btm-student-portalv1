"use client";

import { useState, type FormEvent } from "react";
import { usePortal } from "@/components/PortalShell";
import { PageHead, useToast } from "@/components/ui";
import { useDataSource } from "@/lib/data/provider";
import type { StudentPatch } from "@/lib/data/source";
import { initials, LEVEL_LABEL } from "@/lib/format";

type Field = { key: keyof StudentPatch; label: string; type?: string; required?: boolean; full?: boolean; placeholder?: string };
const PERSONAL: Field[] = [
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "preferredName", label: "Preferred name" },
  { key: "phone", label: "Phone number", type: "tel" },
];
const BUSINESS: Field[] = [
  { key: "businessName", label: "Business name", required: true },
  { key: "businessType", label: "Business type" },
  { key: "businessLocation", label: "Business location" },
  { key: "website", label: "Website", type: "url", placeholder: "https://" },
  { key: "instagram", label: "Instagram", placeholder: "@yourbusiness" },
  { key: "bookingLink", label: "Booking link", type: "url", placeholder: "https://" },
];

export default function SettingsPage() {
  const ds = useDataSource();
  const { student, membership } = usePortal();
  const toast = useToast();
  const [form, setForm] = useState<StudentPatch>(() => {
    const out: StudentPatch = {};
    [...PERSONAL, ...BUSINESS].forEach((f) => ((out as Record<string, unknown>)[f.key] = student[f.key] ?? ""));
    out.currentFocus = student.currentFocus ?? "";
    return out;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof StudentPatch) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const clean: StudentPatch = {};
      Object.entries(form).forEach(([k, v]) => ((clean as Record<string, unknown>)[k] = typeof v === "string" ? v.trim() || null : v));
      if (!clean.firstName || !clean.lastName || !clean.businessName) throw new Error("required");
      await ds.updateStudent(clean);
      toast.show("Your details are saved. The BTM team sees the update straight away.");
    } catch (err) {
      setError(err instanceof Error && err.message === "required" ? "Name and business name are required." : "Couldn't save your details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const renderField = (f: Field) => (
    <label key={f.key} className={`field${f.full ? " full" : ""}`}>
      <span>{f.label} {f.required && <em>*</em>}</span>
      <input className="input" type={f.type ?? "text"} placeholder={f.placeholder} value={(form[f.key] as string) ?? ""} onChange={set(f.key)} required={f.required} />
    </label>
  );

  return (
    <>
      <PageHead eyebrow="Your member profile" title="My Details" intro="Keep your details current so Bree and the BTM team can give focused, personalised guidance." />
      <div className="grid grid-main">
        <form className="card form" onSubmit={submit}>
          <section className="form-section">
            <div className="form-section__head">
              <span className="num">01</span>
              <div><span className="eyebrow">Personal details</span><h3 style={{ marginTop: 6 }}>How we can reach you</h3></div>
            </div>
            <div className="form-grid">
              {PERSONAL.map(renderField)}
              <label className="field full">
                <span>Portal email</span>
                <input className="input" value={student.email} disabled />
                <small>This is your login and the email connected to your Stripe membership. Message the team to change it.</small>
              </label>
            </div>
          </section>
          <section className="form-section">
            <div className="form-section__head">
              <span className="num">02</span>
              <div><span className="eyebrow">Business details</span><h3 style={{ marginTop: 6 }}>Tell us about your business</h3></div>
            </div>
            <div className="form-grid">{BUSINESS.map(renderField)}</div>
          </section>
          <section className="form-section" id="focus">
            <div className="form-section__head">
              <span className="num">03</span>
              <div><span className="eyebrow">Current focus</span><h3 style={{ marginTop: 6 }}>What matters most right now</h3></div>
            </div>
            <label className="field">
              <span>Your current business focus</span>
              <textarea className="textarea" value={(form.currentFocus as string) ?? ""} onChange={set("currentFocus")} maxLength={300} />
              <small>Shown on your dashboard, Priority List and Support Plan.</small>
            </label>
          </section>
          {error && <div className="form-error">{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save my details"}</button>
          </div>
        </form>

        <div className="stack">
          <div className="card card--dark" style={{ textAlign: "center" }}>
            <span className="avatar avatar--taupe" style={{ width: 64, height: 64, fontSize: 16, margin: "0 auto" }}>{initials(student.firstName, student.lastName)}</span>
            <h3 style={{ marginTop: 14, color: "var(--white)" }}>{student.preferredName || student.firstName} {student.lastName}</h3>
            <p className="small" style={{ color: "#a9a39a", marginTop: 4 }}>{student.businessName}</p>
          </div>
          <div className="card card--paper">
            <span className="eyebrow">Your BTM support</span>
            <ul className="list" style={{ marginTop: 12 }}>
              <li><span className="small muted" style={{ width: 120 }}>Membership</span><span className="small">{LEVEL_LABEL[membership.level].short} · {LEVEL_LABEL[membership.level].name}</span></li>
              <li><span className="small muted" style={{ width: 120 }}>Advisor</span><span className="small">{student.advisorName}</span></li>
            </ul>
          </div>
        </div>
      </div>
      {toast.node}
    </>
  );
}
