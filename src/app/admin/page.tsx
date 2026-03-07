"use client";

import { useState, useEffect, useCallback } from "react";

/* ---------- types ---------- */
type Submission = {
  id: string; company_name: string; contact_email: string; contact_name: string;
  status: string; created_at: string;
  files?: FileRec[]; extraction?: Extraction; validations?: Validation[];
  follow_up_questions?: FollowUp[]; summary?: Summary;
};
type FileRec = { id: string; file_name: string; file_type: string; size_bytes: number };
type Extraction = {
  status: string; industry?: string; stage?: string; funding_ask_usd?: number;
  revenue_annual_usd?: number; burn_rate_monthly_usd?: number; team_size?: number;
  founded_year?: number; location?: string; problem_statement?: string;
  solution_description?: string; target_market?: string; business_model?: string;
  traction_summary?: string; competitive_landscape?: string; use_of_funds?: string;
  website_url?: string; is_pitch_deck?: boolean; pitch_deck_confidence?: number;
  sections_found?: string[];
};
type Validation = { field_name: string; rule_name: string; passed: boolean; message: string; severity: string };
type FollowUp = { id: string; question: string; field_name: string; status: string; answer?: string };
type Summary = {
  executive_summary: string; strengths: string[]; risks: string[];
  score: number; recommendation: string; key_metrics: Record<string, unknown>;
};

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  draft:              { label: "Draft",            bg: "#f3f4f6", fg: "#6b7280" },
  submitted:          { label: "Submitted",        bg: "#dbeafe", fg: "#2563eb" },
  extracting:         { label: "Extracting",       bg: "#fef3c7", fg: "#d97706" },
  extracted:          { label: "Extracted",         bg: "#ede9fe", fg: "#7c3aed" },
  validating:         { label: "Validating",       bg: "#fef3c7", fg: "#d97706" },
  validated:          { label: "Validated",         bg: "#ede9fe", fg: "#7c3aed" },
  follow_up_pending:  { label: "Awaiting Answers", bg: "#ffedd5", fg: "#ea580c" },
  follow_up_received: { label: "Answers In",       bg: "#ede9fe", fg: "#7c3aed" },
  summarizing:        { label: "Summarizing",      bg: "#fef3c7", fg: "#d97706" },
  completed:          { label: "Completed",        bg: "#d1fae5", fg: "#059669" },
  failed:             { label: "Failed",           bg: "#fee2e2", fg: "#dc2626" },
};

const STEPS = ["draft", "extracted", "validated", "follow_up_pending", "completed"];

const VC_EMAIL = "bayrakarifismail@gmail.com";

function buildMailto(to: string, subject: string, body: string) {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function AdminPage() {
  const [list, setList]     = useState<Submission[]>([]);
  const [sel, setSel]       = useState<Submission | null>(null);
  const [busy, setBusy]     = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const url = filter === "all"
      ? "/api/submissions?limit=50"
      : `/api/submissions?limit=50&status=${filter}`;
    const r = await fetch(url);
    const d = await r.json();
    setList(d.data ?? []);
  }, [filter]);

  const detail = useCallback(async (id: string) => {
    setBusy("load");
    const r = await fetch(`/api/submissions/${id}`);
    setSel(await r.json());
    setBusy("");
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, path: string, tag: string) {
    setBusy(tag);
    await fetch(`/api/submissions/${id}/${path}`, { method: "POST" });
    await detail(id);
    await load();
    setBusy("");
  }

  const s = sel;
  const completedCount = list.filter(x => x.status === "completed").length;
  const pendingCount   = list.filter(x => x.status === "follow_up_pending").length;

  return (
    <main style={{ minHeight: "calc(100vh - 56px)", background: "var(--bg)" }}>

      {/* ── header ── */}
      <section style={{ borderBottom: "1px solid var(--border)", padding: "24px 24px 20px" }}>
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
            <div>
              <p className="section-title" style={{ marginBottom: 4 }}>VC Dashboard</p>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em" }}>Submissions</h1>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <Stat label="Total"     value={list.length} />
              <Stat label="Completed" value={completedCount} color="var(--green)" />
              <Stat label="Pending"   value={pendingCount}   color="var(--orange)" />
            </div>
          </div>

          <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
            {["all", "draft", "follow_up_pending", "completed", "failed"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-ghost"}`}
                style={{ textTransform: "capitalize" }}>
                {f === "all" ? "All" : f === "follow_up_pending" ? "Pending" : f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── submission list (full width) ── */}
      <div className="container" style={{ padding: "20px 24px 80px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 10,
        }}>
          {list.map(sub => {
            const st = STATUS[sub.status] ?? STATUS.draft;
            return (
              <div key={sub.id} onClick={() => detail(sub.id)} className="card" style={{
                cursor: "pointer", padding: "14px 16px",
                transition: "box-shadow 0.12s, border-color 0.12s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                  <strong style={{ fontSize: 14 }}>{sub.company_name}</strong>
                  <span className="badge" style={{ background: st.bg, color: st.fg, flexShrink: 0 }}>{st.label}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {sub.contact_name} · {new Date(sub.created_at).toLocaleDateString()}
                </div>
                <Dots status={sub.status} />
              </div>
            );
          })}
          {list.length === 0 && (
            <p style={{ color: "var(--muted)", textAlign: "center", padding: 48, fontSize: 14, gridColumn: "1/-1" }}>
              No submissions
            </p>
          )}
        </div>
      </div>

      {/* ── detail modal ── */}
      {s && (
        <div
          onClick={() => setSel(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "flex-start", justifyContent: "center",
            padding: "40px 20px 40px",
            overflowY: "auto",
          }}
        >
          {/* modal panel — stop clicks from bubbling to backdrop */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--bg)", borderRadius: "var(--radius-lg)",
              width: "100%", maxWidth: 860,
              boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
              flexShrink: 0,
            }}
          >
            {/* modal top bar */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{s.company_name}</h2>
                {(() => { const st = STATUS[s.status] ?? STATUS.draft; return <span className="badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>; })()}
              </div>
              <button
                onClick={() => setSel(null)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 20, color: "var(--muted)", lineHeight: 1, padding: "4px 8px",
                  borderRadius: 6,
                }}
              >×</button>
            </div>

            {/* loading state */}
            {busy === "load" && (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading…</div>
            )}

            {busy !== "load" && (
              <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* contact + actions card */}
                <div className="card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{s.contact_name}</p>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{s.contact_email}</p>
                      {s.extraction?.website_url && (
                        <a href={s.extraction.website_url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: "var(--blue)", marginTop: 3, display: "block" }}>
                          {s.extraction.website_url}
                        </a>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {s.summary && <ScoreCircle value={s.summary.score} />}
                      {/* Email Founder */}
                      <a
                        href={buildMailto(
                          s.contact_email,
                          `Re: ${s.company_name} – VC Discovery Review`,
                          `Hi ${s.contact_name},\n\nThank you for submitting ${s.company_name} to VC Discovery. We have reviewed your pitch and would like to connect with you to discuss next steps.\n\nPlease feel free to reply to this email or reach us directly.\n\nBest regards,\nVC Discovery Team\n${VC_EMAIL}`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ textDecoration: "none" }}
                      >
                        ✉ Email Founder
                      </a>
                    </div>
                  </div>

                  {/* pipeline actions */}
                  <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
                    {(s.status === "draft" || s.status === "submitted") && (s.files?.length ?? 0) > 0 && (
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => act(s.id, "extract", "extract")}
                        disabled={busy === "extract"}>
                        {busy === "extract" ? "Extracting…" : "Extract"}
                      </button>
                    )}
                    {s.status === "extracted" && (
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => act(s.id, "validate", "validate")}
                        disabled={busy === "validate"}>
                        {busy === "validate" ? "Validating…" : "Validate"}
                      </button>
                    )}
                    {(s.status === "validated" || s.status === "follow_up_received") && (
                      <button className="btn btn-green btn-sm"
                        onClick={() => act(s.id, "summary", "summary")}
                        disabled={busy === "summary"}>
                        {busy === "summary" ? "Generating…" : "Generate Summary"}
                      </button>
                    )}
                  </div>
                </div>

                {/* files */}
                {s.files && s.files.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Files</h3>
                    {s.files.map(f => (
                      <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border-light)", fontSize: 13 }}>
                        <span>{f.file_name}</span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>{(f.size_bytes / 1024).toFixed(0)} KB</span>
                          <button
                            className="btn btn-sm"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                            onClick={async () => {
                              const r = await fetch(`/api/submissions/${s.id}/files/${f.id}`);
                              const d = await r.json();
                              if (d.url) window.open(d.url, "_blank");
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* pitch deck classification badge */}
                {s.extraction?.status === "completed" && s.extraction.is_pitch_deck != null && (
                  <div style={{
                    display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
                    padding: "10px 14px", borderRadius: 8,
                    background: s.extraction.is_pitch_deck ? "#f0fdf4" : "#fef2f2",
                    border: `1px solid ${s.extraction.is_pitch_deck ? "#bbf7d0" : "#fecaca"}`,
                    fontSize: 13,
                  }}>
                    <span>{s.extraction.is_pitch_deck ? "✓ Confirmed pitch deck" : "✗ Not a pitch deck"}</span>
                    {s.extraction.pitch_deck_confidence != null && (
                      <span style={{ color: "var(--muted)" }}>({Math.round(s.extraction.pitch_deck_confidence * 100)}% confidence)</span>
                    )}
                    {s.extraction.sections_found && s.extraction.sections_found.length > 0 && (
                      <span style={{ color: "var(--muted)" }}>
                        · Sections: {s.extraction.sections_found.join(", ")}
                      </span>
                    )}
                  </div>
                )}

                {/* extracted data */}
                {s.extraction?.status === "completed" && (
                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Extracted Data</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: 13 }}>
                      {([
                        ["Industry",  s.extraction.industry],
                        ["Stage",     s.extraction.stage],
                        ["Funding",   s.extraction.funding_ask_usd        ? `$${(s.extraction.funding_ask_usd / 1e6).toFixed(1)}M`        : null],
                        ["Revenue",   s.extraction.revenue_annual_usd     ? `$${(s.extraction.revenue_annual_usd / 1e6).toFixed(1)}M`     : null],
                        ["Burn",      s.extraction.burn_rate_monthly_usd  ? `$${(s.extraction.burn_rate_monthly_usd / 1e3).toFixed(0)}K/mo` : null],
                        ["Team",      s.extraction.team_size],
                        ["Founded",   s.extraction.founded_year],
                        ["Location",  s.extraction.location],
                      ] as [string, string | number | null | undefined][]).map(([lbl, val]) => (
                        <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border-light)" }}>
                          <span style={{ color: "var(--muted)" }}>{lbl}</span>
                          <span style={{ fontWeight: 500, color: val != null ? "var(--fg)" : "var(--border)" }}>{val ?? "—"}</span>
                        </div>
                      ))}
                    </div>
                    {s.extraction.problem_statement    && <TextBlock label="Problem"      text={s.extraction.problem_statement} />}
                    {s.extraction.solution_description && <TextBlock label="Solution"     text={s.extraction.solution_description} />}
                    {s.extraction.target_market        && <TextBlock label="Market"       text={s.extraction.target_market} />}
                    {s.extraction.business_model       && <TextBlock label="Model"        text={s.extraction.business_model} />}
                    {s.extraction.traction_summary     && <TextBlock label="Traction"     text={s.extraction.traction_summary} />}
                    {s.extraction.competitive_landscape && <TextBlock label="Competition" text={s.extraction.competitive_landscape} />}
                    {s.extraction.use_of_funds         && <TextBlock label="Use of Funds" text={s.extraction.use_of_funds} />}
                  </div>
                )}

                {/* validations */}
                {s.validations && s.validations.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                      Validation ({s.validations.filter(v => v.passed).length}/{s.validations.length})
                    </h3>
                    {s.validations.map((v, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, padding: "3px 0", color: v.passed ? "var(--muted)" : v.severity === "error" ? "var(--red)" : "var(--orange)" }}>
                        <span>{v.passed ? "✓" : v.severity === "error" ? "✗" : "⚠"}</span>
                        <span>{v.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* follow-up Q&A */}
                {s.follow_up_questions && s.follow_up_questions.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                      Follow-up Q&A ({s.follow_up_questions.filter(q => q.status === "pending").length} pending)
                    </h3>
                    {s.follow_up_questions.map(q => (
                      <div key={q.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{q.question}</p>
                        {q.status === "answered" && q.answer ? (
                          <p style={{ fontSize: 12, color: "var(--green)" }}>→ {q.answer}</p>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <p style={{ fontSize: 12, color: "var(--orange)", fontStyle: "italic" }}>Awaiting answer</p>
                            <a
                              href={buildMailto(
                                s.contact_email,
                                `Action Required: ${s.company_name} – Information Needed`,
                                `Hi ${s.contact_name},\n\nWe are reviewing your submission for ${s.company_name} on VC Discovery and need additional information to complete our evaluation.\n\nPlease provide an answer to the following question:\n\n"${q.question}"\n\nYou can reply directly to this email or log in to your submission portal to answer.\n\nThank you for your time,\nVC Discovery Team\n${VC_EMAIL}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm"
                              style={{
                                textDecoration: "none", fontSize: 11,
                                background: "#fff7ed", color: "#ea580c",
                                border: "1px solid #fed7aa",
                              }}
                            >
                              📧 Remind Founder
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* investor summary */}
                {s.summary && (
                  <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Investor Summary</h3>
                      <ScoreCircle value={s.summary.score} />
                    </div>

                    <div style={{
                      padding: "12px 16px", borderRadius: 8, marginBottom: 14,
                      background: s.summary.score >= 75 ? "#f0fdf4" : s.summary.score >= 55 ? "#fffbeb" : "#fef2f2",
                      border: `1px solid ${s.summary.score >= 75 ? "#bbf7d0" : s.summary.score >= 55 ? "#fef08a" : "#fecaca"}`,
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: s.summary.score >= 75 ? "#15803d" : s.summary.score >= 55 ? "#a16207" : "#dc2626" }}>
                        {s.summary.recommendation}
                      </p>
                    </div>

                    <p style={{ fontSize: 13, lineHeight: 1.65, color: "var(--fg)", marginBottom: 16 }}>
                      {s.summary.executive_summary}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      {s.summary.strengths.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", marginBottom: 4 }}>Strengths</h4>
                          {s.summary.strengths.map((t, i) => <p key={i} style={{ fontSize: 12, marginBottom: 2, color: "var(--fg)" }}>+ {t}</p>)}
                        </div>
                      )}
                      {s.summary.risks.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--red)", marginBottom: 4 }}>Risks</h4>
                          {s.summary.risks.map((t, i) => <p key={i} style={{ fontSize: 12, marginBottom: 2, color: "var(--fg)" }}>— {t}</p>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ---------- small components ---------- */
function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? "var(--fg)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function ScoreCircle({ value }: { value: number }) {
  const c = value >= 75 ? "var(--green)" : value >= 55 ? "var(--orange)" : "var(--red)";
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%", border: `2.5px solid ${c}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{value}</span>
    </div>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>{label}</span>
      <p style={{ fontSize: 13, color: "var(--fg)", lineHeight: 1.55, marginTop: 2 }}>{text}</p>
    </div>
  );
}

function Dots({ status }: { status: string }) {
  const cur = STEPS.findIndex(s => status.startsWith(s.replace("_pending", "")) || s === status);
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", marginTop: 6 }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: i <= cur ? "var(--fg)" : "var(--border)" }} />
          {i < STEPS.length - 1 && <div style={{ width: 14, height: 1.5, background: i < cur ? "var(--fg)" : "var(--border)" }} />}
        </div>
      ))}
    </div>
  );
}
