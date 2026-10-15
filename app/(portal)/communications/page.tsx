"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePortal } from "@/components/PortalShell";
import { Icon } from "@/components/Icon";
import { ErrorBox, Loading, PageHead } from "@/components/ui";
import { useDataSource, useLiveQuery } from "@/lib/data/provider";
import type { Message } from "@/lib/data/types";
import { formatDate, formatTime, initials } from "@/lib/format";

const MAX_FILE_MB = 10;

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

export default function CommunicationsPage() {
  const ds = useDataSource();
  const { student } = usePortal();
  const q = useLiveQuery((d) => d.listMessages(), ["messages"]);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const messages = q.data ?? [];
  const unreadFromStaff = messages.some((m) => m.sender === "staff" && !m.readAt);

  // Mark staff messages read while this page is open and visible.
  useEffect(() => {
    if (unreadFromStaff && document.visibilityState === "visible") void ds.markMessagesRead().catch(() => {});
  }, [ds, unreadFromStaff]);

  // Keep the newest message in view.
  const last = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [last]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!body.trim() && !file) return;
    setSending(true);
    setError(null);
    try {
      await ds.sendMessage(body.trim() || (file ? `Shared a file: ${file.name}` : ""), file);
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Your message didn't send. Please try again.");
    } finally {
      setSending(false);
    }
  }
  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }
  function pickFile(f: File | null) {
    if (f && f.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Files must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setError(null);
    setFile(f);
  }

  const lastMine = [...messages].reverse().find((m) => m.sender === "student");

  return (
    <>
      <PageHead
        eyebrow="Ongoing support"
        title="Communications"
        intro="Ask questions, share updates and get guidance between Power Sessions. Messages are answered Monday to Friday, within one business day."
      />
      {q.error ? (
        <ErrorBox error={q.error} onRetry={q.refresh} />
      ) : q.loading ? (
        <Loading rows={2} />
      ) : (
        <div className="chat">
          <div className="chat__head">
            <span className="avatar avatar--taupe">BW</span>
            <div>
              <strong style={{ display: "block" }}>{student.advisorName} &amp; the BTM team</strong>
              <span className="small muted">Your business advisor</span>
            </div>
          </div>

          <div className="chat__list" ref={listRef} aria-live="polite" aria-label="Conversation">
            {messages.length === 0 && <div className="empty">No messages yet. Say hello and tell us what you&apos;re working on.</div>}
            {messages.map((m, i) => {
              const showDay = i === 0 || dayKey(messages[i - 1]!.createdAt) !== dayKey(m.createdAt);
              return (
                <div key={m.id}>
                  {showDay && <div className="chat__day">{formatDate(m.createdAt, { weekday: "long", day: "numeric", month: "long" })}</div>}
                  <Bubble m={m} mine={m.sender === "student"} studentInitials={initials(student.firstName, student.lastName)} seen={m.id === lastMine?.id && !!m.readAt} />
                </div>
              );
            })}
          </div>

          <form className="chat__composer" onSubmit={send}>
            <input ref={fileRef} type="file" hidden onChange={(e) => pickFile(e.target.files?.[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic,.mp4,.mov" />
            <button type="button" className="icon-btn" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
              <Icon name="clip" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              {file && (
                <div className="pill" style={{ marginBottom: 8 }}>
                  {file.name}
                  <button type="button" aria-label="Remove file" onClick={() => pickFile(null)} style={{ border: 0, background: "none", padding: 0 }}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              )}
              <textarea
                className="textarea"
                rows={1}
                placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                aria-label="Message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={onKey}
                maxLength={4000}
              />
              {error && <div className="form-error" style={{ marginTop: 8 }}>{error}</div>}
            </div>
            <button className="btn" disabled={sending || (!body.trim() && !file)} aria-label="Send message">
              <Icon name="send" size={15} /> {sending ? "Sending" : "Send"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ m, mine, studentInitials, seen }: { m: Message; mine: boolean; studentInitials: string; seen: boolean }) {
  return (
    <div className={`msg${mine ? " msg--mine" : ""}`}>
      <span className={`avatar${mine ? "" : " avatar--taupe"}`} style={{ width: 32, height: 32, fontSize: 9 }}>
        {mine ? studentInitials : "BW"}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="msg__bubble">
          {m.body}
          {m.attachmentName && (
            <div>
              {m.attachmentUrl ? (
                <a className="msg__file" href={m.attachmentUrl} target="_blank" rel="noreferrer"><Icon name="clip" size={12} /> {m.attachmentName}</a>
              ) : (
                <span className="msg__file"><Icon name="clip" size={12} /> {m.attachmentName}</span>
              )}
            </div>
          )}
        </div>
        <div className="msg__meta">
          {mine ? "You" : m.senderName} · {formatTime(m.createdAt)}
          {seen && " · Seen"}
        </div>
      </div>
    </div>
  );
}
