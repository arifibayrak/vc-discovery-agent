"use client";

import { useState, useCallback } from "react";

type Step = "choose" | "form" | "upload" | "processing" | "follow-ups" | "done";

type Submission = {
  id: string; company_name: string; status: string;
  files?: { id: string; file_name: string; size_bytes: number }[];
  extraction?: { status: string; industry?: string; stage?: string; funding_ask_usd?: number };
  follow_up_questions?: { id: string; question: string; context: string; field_name: string; status: string; answer?: string }[];
  summary?: { score: number; recommendation: string; executive_summary: string };
};

export default function ApplyPage() {
  const [mode, setMode] = useState<"manual" | "agent" | null>(null);
  const [step, setStep] = useState<Step>("choose");
  const [sub, setSub] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ company_name: "", contact_name: "", contact_email: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const refresh = useCallback(async (id: string) => {
    const r = await fetch(`/api/submissions/${id}`);
    setSub(await r.json());
  }, []);

  async function createSubmission() {
    setBusy(true);
    const r = await fetch("/api/submissions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await r.json();
    setSub(data);
    setStep("upload");
    setBusy(false);
  }

  function uploadFile() {
    if (!sub) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.pptx,.xlsx,.xls,.csv,.png,.jpg,.jpeg";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      const fd = new FormData();
      fd.append("file", f);
      fd.append("file_type",
        f.name.toLowerCase().includes("pitch") ? "pitch_deck" :
        f.name.toLowerCase().includes("financial") ? "financial_model" :
        f.name.toLowerCase().includes("cap") ? "cap_table" : "other"
      );
      await fetch(`/api/submissions/${sub.id}/files`, { method: "POST", body: fd });
      await refresh(sub.id);
      setBusy(false);
    };
    input.click();
  }

  async function runPipeline() {
    if (!sub) return;
    setBusy(true);
    setStep("processing");

    // Extract
    await fetch(`/api/submissions/${sub.id}/extract`, { method: "POST" });
    // Validate
    const valRes = await fetch(`/api/submissions/${sub.id}/validate`, { method: "POST" });
    const valData = await valRes.json();

    await refresh(sub.id);
    setBusy(false);

    if (valData.has_follow_ups) {
      await refresh(sub.id);
      setStep("follow-ups");
    } else {
      // No follow-ups, go straight to summary
      setBusy(true);
      await fetch(`/api/submissions/${sub.id}/summary`, { method: "POST" });
      await refresh(sub.id);
      setBusy(false);
      setStep("done");
    }
  }

  async function submitAnswers() {
    if (!sub) return;
    const pending = sub.follow_up_questions?.filter(q => q.status === "pending") ?? [];
    const batch = pending.filter(q => answers[q.id]?.trim()).map(q => ({ question_id: q.id, answer: answers[q.id] }));
    if (!batch.length) return;

    setBusy(true);
    await fetch(`/api/submissions/${sub.id}/follow-ups/batch`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: batch }),
    });

    // Generate summary
    await fetch(`/api/submissions/${sub.id}/summary`, { method: "POST" });
    await refresh(sub.id);
    setAnswers({});
    setBusy(false);
    setStep("done");
  }

  return (
    <main style={{ minHeight: "calc(100vh - 56px)", background: "var(--bg)" }}>

      {/* header */}
      <section style={{ padding: "48px 24px 0", textAlign: "center" }}>
        <div className="container-narrow">
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em" }}>Apply for Funding</h1>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 15, lineHeight: 1.6 }}>
            Submit your startup for AI-powered screening. Get instant validation and an investor-ready summary.
          </p>
        </div>
      </section>

      <div className="container-narrow" style={{ padding: "36px 24px 80px" }}>

        {/* ---- Step 0: Choose mode ---- */}
        {step === "choose" && (
          <div className="fade-up">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>

              <button onClick={() => { setMode("manual"); setStep("form"); }}
                className="card" style={{
                  cursor: "pointer", textAlign: "left", border: mode === "manual" ? "2px solid var(--fg)" : "1px solid var(--border)",
                  transition: "all 0.15s", padding: 24,
                }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>✍️</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Apply Manually</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  Fill out the form, upload your documents, and answer any follow-up questions yourself.
                </p>
              </button>

              <button onClick={() => { setMode("agent"); setStep("form"); }}
                className="card" style={{
                  cursor: "pointer", textAlign: "left", border: mode === "agent" ? "2px solid var(--fg)" : "1px solid var(--border)",
                  transition: "all 0.15s", padding: 24, position: "relative",
                }}>
                <span style={{
                  position: "absolute", top: 12, right: 12,
                  background: "var(--fg)", color: "var(--bg)",
                  padding: "2px 8px", borderRadius: 4, fontSize: 10,
                  fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}>Agent-Friendly</span>
                <div style={{ fontSize: 24, marginBottom: 12 }}>🤖</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Apply via Agent</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  Your AI agent can submit via our REST API. This form creates the same submission programmatically.
                </p>
              </button>
            </div>

            {/* Agent API reference */}
            <div className="card" style={{ background: "#fafafa" }}>
              <p className="section-title" style={{ marginBottom: 12 }}>Agent Integration</p>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                If you&apos;re an AI agent (or building one), you can automate the entire application via REST.
                No browser required — every step has an API endpoint.
              </p>
              <div style={{
                fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 2.2,
                background: "var(--bg)", padding: "14px 18px", borderRadius: 8, border: "1px solid var(--border)",
              }}>
                <div><C c="var(--green)">POST</C> /api/submissions <C c="var(--muted)">{"// create"}</C></div>
                <div><C c="var(--green)">POST</C> /api/submissions/:id/files <C c="var(--muted)">{"// upload"}</C></div>
                <div><C c="var(--green)">POST</C> /api/submissions/:id/extract <C c="var(--muted)">{"// extract data"}</C></div>
                <div><C c="var(--green)">POST</C> /api/submissions/:id/validate <C c="var(--muted)">{"// validate"}</C></div>
                <div><C c="var(--orange)">PATCH</C> /api/submissions/:id/follow-ups/:qid <C c="var(--muted)">{"// answer"}</C></div>
                <div><C c="var(--green)">POST</C> /api/submissions/:id/summary <C c="var(--muted)">{"// generate"}</C></div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 1: Form ---- */}
        {step === "form" && (
          <div className="fade-up">
            <StepIndicator current={1} />
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Company Information</h3>
              {mode === "agent" && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "#fafafa", border: "1px solid var(--border)",
                  marginBottom: 16, fontSize: 13, color: "var(--muted)",
                  display: "flex", gap: 8, alignItems: "center",
                }}>
                  <span>🤖</span>
                  <span>Agent mode — this form maps to <code style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>POST /api/submissions</code></span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="label">Company Name</label>
                  <input className="input" placeholder="e.g. Acme AI" value={form.company_name}
                    onChange={e => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Your Name</label>
                  <input className="input" placeholder="e.g. Jane Doe" value={form.contact_name}
                    onChange={e => setForm({ ...form, contact_name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="e.g. jane@acme.ai" value={form.contact_email}
                    onChange={e => setForm({ ...form, contact_email: e.target.value })} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setStep("choose"); setMode(null); }}>Back</button>
                  <button className="btn btn-primary" onClick={createSubmission}
                    disabled={!form.company_name || !form.contact_name || !form.contact_email || busy}>
                    {busy ? "Creating…" : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 2: Upload ---- */}
        {step === "upload" && sub && (
          <div className="fade-up">
            <StepIndicator current={2} />
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Upload Documents</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                Upload your pitch deck, financial model, or other relevant documents.
              </p>

              {/* upload zone */}
              <button onClick={uploadFile} disabled={busy} style={{
                width: "100%", padding: "40px 20px",
                border: "2px dashed var(--border)", borderRadius: 12,
                background: "#fafafa", cursor: "pointer", textAlign: "center",
                fontSize: 14, color: "var(--muted)",
                transition: "border-color 0.15s",
              }}>
                {busy ? "Uploading…" : "Click to select a file (PDF, PPTX, XLSX, CSV)"}
              </button>

              {/* file list */}
              {sub.files && sub.files.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {sub.files.map(f => (
                    <div key={f.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderRadius: 8, background: "#fafafa",
                      marginBottom: 6, fontSize: 13,
                    }}>
                      <span style={{ fontWeight: 500 }}>{f.file_name}</span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>{(f.size_bytes / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button className="btn btn-secondary btn-sm" onClick={uploadFile} disabled={busy}>
                  + Add Another File
                </button>
                <button className="btn btn-primary" onClick={runPipeline}
                  disabled={!sub.files?.length || busy}>
                  Submit &amp; Process
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 3: Processing ---- */}
        {step === "processing" && busy && (
          <div className="fade-up">
            <StepIndicator current={3} />
            <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Processing Your Submission</h3>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>
                Extracting data from your documents and running validation checks…
              </p>
            </div>
          </div>
        )}

        {/* ---- Step 4: Follow-ups ---- */}
        {step === "follow-ups" && sub && (
          <div className="fade-up">
            <StepIndicator current={4} />
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>A Few Questions</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
                We couldn&apos;t find some information in your documents. Please answer these to complete your application.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {sub.follow_up_questions?.filter(q => q.status === "pending").map(q => (
                  <div key={q.id}>
                    <label className="label">{q.question}</label>
                    {q.context && <p className="hint" style={{ marginBottom: 6 }}>{q.context}</p>}
                    <textarea className="textarea" placeholder="Your answer…"
                      value={answers[q.id] ?? ""}
                      onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  </div>
                ))}
              </div>

              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={submitAnswers}
                disabled={busy || Object.values(answers).every(a => !a?.trim())}>
                {busy ? "Processing…" : "Submit Answers"}
              </button>
            </div>
          </div>
        )}

        {/* ---- Step 5: Done ---- */}
        {step === "done" && sub && (
          <div className="fade-up">
            <StepIndicator current={5} />
            <div className="card" style={{ textAlign: "center", padding: "36px 24px" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Submission Complete</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>
                Your application for <strong>{sub.company_name}</strong> has been processed.
              </p>

              {sub.summary && (
                <div className="card" style={{ textAlign: "left", background: "#fafafa", maxWidth: 480, margin: "0 auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Your Score</span>
                    <span style={{
                      fontSize: 28, fontWeight: 800,
                      color: sub.summary.score >= 75 ? "var(--green)" : sub.summary.score >= 55 ? "var(--orange)" : "var(--red)",
                    }}>{sub.summary.score}<span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 400 }}>/100</span></span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                    {sub.summary.executive_summary.length > 300
                      ? sub.summary.executive_summary.substring(0, 300) + "…"
                      : sub.summary.executive_summary}
                  </p>
                </div>
              )}

              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20 }}>
                A VC partner will review your summary shortly.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* helpers */
function C({ c, children }: { c: string; children: React.ReactNode }) {
  return <span style={{ color: c }}>{children}</span>;
}

function StepIndicator({ current }: { current: number }) {
  const steps = ["Info", "Upload", "Process", "Clarify", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, justifyContent: "center" }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 600,
              background: done ? "var(--fg)" : active ? "var(--fg)" : "var(--accent-soft)",
              color: done || active ? "var(--bg)" : "var(--muted)",
              transition: "all 0.2s",
            }}>
              {done ? "✓" : idx}
            </div>
            <span style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? "var(--fg)" : "var(--muted)",
            }}>{label}</span>
            {i < steps.length - 1 && (
              <div style={{ width: 20, height: 1, background: done ? "var(--fg)" : "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
