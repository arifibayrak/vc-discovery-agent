import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      {/* ---- hero ---- */}
      <section style={{
        minHeight: "calc(100vh - 56px)",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        textAlign: "center", padding: "80px 24px 60px",
      }}>
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <span style={{
            display: "inline-block", padding: "4px 12px", borderRadius: 20,
            border: "1px solid var(--border)", fontSize: 13, fontWeight: 500, color: "var(--muted)",
          }}>
            AI-Powered Deal Screening
          </span>
        </div>

        <h1 className="fade-up fade-up-d1" style={{
          fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800,
          letterSpacing: "-0.04em", lineHeight: 1.05, maxWidth: 800,
        }}>
          The smartest way to<br />discover startups
        </h1>

        <p className="fade-up fade-up-d2" style={{
          fontSize: 18, color: "var(--muted)", maxWidth: 520,
          marginTop: 20, lineHeight: 1.6,
        }}>
          Submit your pitch, get validated instantly, and receive a structured
          investor-ready summary — powered by an AI agent pipeline.
        </p>

        <div className="fade-up fade-up-d3" style={{ display: "flex", gap: 12, marginTop: 36 }}>
          <Link href="/apply" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
            Apply as a Startup
          </Link>
          <Link href="/admin" className="btn btn-secondary" style={{ padding: "12px 28px", fontSize: 15 }}>
            VC Dashboard
          </Link>
        </div>
      </section>

      {/* ---- how it works ---- */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
        <div className="container">
          <p className="section-title" style={{ textAlign: "center" }}>How It Works</p>
          <h2 style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em",
            textAlign: "center", marginBottom: 48,
          }}>
            Six steps from pitch to decision
          </h2>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}>
            {[
              { num: "01", title: "Submit", desc: "Create your submission with basic company info. Founders or their AI agents can apply." },
              { num: "02", title: "Upload", desc: "Attach your pitch deck, financial model, or cap table. We accept PDF, PPTX, XLSX formats." },
              { num: "03", title: "Extract", desc: "Our AI agent reads your documents and extracts 15+ structured data points automatically." },
              { num: "04", title: "Validate", desc: "Deterministic rules check funding ranges, burn rate, runway, team size, and data completeness." },
              { num: "05", title: "Clarify", desc: "If data is missing, targeted follow-up questions are generated. Answer them to strengthen your application." },
              { num: "06", title: "Summarize", desc: "An investor-ready summary with score (0-100), strengths, risks, and a recommendation is generated." },
            ].map((step) => (
              <div key={step.num} className="card" style={{ display: "flex", gap: 16, alignItems: "start" }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
                  color: "var(--muted)", flexShrink: 0, marginTop: 2,
                }}>{step.num}</span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{step.title}</h3>
                  <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- agent friendly callout ---- */}
      <section style={{ padding: "80px 24px", borderTop: "1px solid var(--border)" }}>
        <div className="container" style={{ textAlign: "center" }}>
          <div style={{
            display: "inline-block", padding: "6px 14px", borderRadius: 20,
            background: "var(--accent-soft)", fontSize: 13, fontWeight: 600,
            marginBottom: 20, fontFamily: "var(--font-mono)",
          }}>
            Agent-Friendly API
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Built for humans and AI agents
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
            Every step of the submission process is available as a REST API.
            Your AI agent can programmatically create submissions, upload files,
            answer follow-ups, and track status — no browser needed.
          </p>
          <div style={{
            background: "#fafafa", border: "1px solid var(--border)", borderRadius: 12,
            padding: "20px 28px", maxWidth: 480, margin: "0 auto", textAlign: "left",
            fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 2,
          }}>
            <div><span style={{ color: "var(--muted)" }}>POST</span> /api/submissions</div>
            <div><span style={{ color: "var(--muted)" }}>POST</span> /api/submissions/:id/files</div>
            <div><span style={{ color: "var(--muted)" }}>POST</span> /api/submissions/:id/extract</div>
            <div><span style={{ color: "var(--muted)" }}>POST</span> /api/submissions/:id/validate</div>
            <div><span style={{ color: "var(--muted)" }}>POST</span> /api/submissions/:id/summary</div>
          </div>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer style={{
        borderTop: "1px solid var(--border)", padding: "32px 24px",
        textAlign: "center", fontSize: 13, color: "var(--muted)",
      }}>
        VC Discovery Agent — Built with Next.js, Supabase &amp; Zod
      </footer>
    </main>
  );
}
