import Link from "next/link";

const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

export default function HomePage() {
  const telegramUrl = TELEGRAM_BOT ? `https://t.me/${TELEGRAM_BOT}` : null;

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

        <div className="fade-up fade-up-d3" style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/apply" className="btn btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
            Apply as a Startup
          </Link>
          {telegramUrl ? (
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ padding: "12px 28px", fontSize: 15, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <TelegramIcon size={18} />
              Apply via Telegram
            </a>
          ) : (
            <Link href="#telegram" className="btn btn-secondary" style={{ padding: "12px 28px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
              <TelegramIcon size={18} />
              Apply via Telegram
            </Link>
          )}
          <Link href="/admin" className="btn btn-secondary" style={{ padding: "12px 28px", fontSize: 15 }}>
            VC Dashboard
          </Link>
        </div>
      </section>

      {/* ---- submission channels ---- */}
      <section id="telegram" style={{ padding: "80px 24px", borderTop: "1px solid var(--border)", background: "#fafafa" }}>
        <div className="container">
          <p className="section-title" style={{ textAlign: "center" }}>Two Ways to Apply</p>
          <h2 style={{
            fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em",
            textAlign: "center", marginBottom: 48,
          }}>
            Web form or Telegram — your choice
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, maxWidth: 820, margin: "0 auto" }}>

            {/* Web Form card */}
            <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 32 }}>🌐</div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Web Form</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                  Fill out a structured form, upload your pitch deck, and answer any follow-up
                  questions. Best for careful, step-by-step submissions.
                </p>
              </div>
              <ul style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 18, lineHeight: 2, margin: 0 }}>
                <li>Upload PDF / PPTX or paste Google Drive link</li>
                <li>Smart dropdowns for stage, industry, revenue</li>
                <li>Instant AI score and investor summary</li>
              </ul>
              <Link href="/apply" className="btn btn-primary" style={{ textAlign: "center", marginTop: "auto" }}>
                Open Web Form →
              </Link>
            </div>

            {/* Telegram Bot card */}
            <div className="card" style={{
              padding: 28, display: "flex", flexDirection: "column", gap: 16,
              border: telegramUrl ? "2px solid var(--fg)" : "1px solid var(--border)",
              position: "relative", overflow: "hidden",
            }}>
              {telegramUrl && (
                <span style={{
                  position: "absolute", top: 12, right: 12,
                  background: "var(--fg)", color: "var(--bg)",
                  padding: "2px 8px", borderRadius: 4, fontSize: 10,
                  fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                }}>New</span>
              )}
              <div style={{ fontSize: 32 }}>
                <TelegramIcon size={36} color="#229ED9" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Telegram Bot</h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                  Chat with our bot directly on Telegram. It guides you through the submission
                  conversationally — no browser needed, perfect for mobile.
                </p>
              </div>
              <ul style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 18, lineHeight: 2, margin: 0 }}>
                <li>Conversational flow — just answer the questions</li>
                <li>Send your pitch deck as a Telegram file or link</li>
                <li>Receive your score directly in the chat</li>
              </ul>

              {/* Bot username display */}
              {TELEGRAM_BOT && (
                <div style={{
                  fontFamily: "var(--font-mono)", fontSize: 13, padding: "8px 14px",
                  background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8,
                  color: "#0369a1",
                }}>
                  @{TELEGRAM_BOT}
                </div>
              )}

              {telegramUrl ? (
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    textAlign: "center", marginTop: "auto", textDecoration: "none",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    background: "#229ED9", border: "none",
                  }}>
                  <TelegramIcon size={16} color="white" />
                  Open in Telegram →
                </a>
              ) : (
                <div style={{
                  textAlign: "center", marginTop: "auto",
                  padding: "10px 20px", borderRadius: 8,
                  background: "#f3f4f6", color: "var(--muted)",
                  fontSize: 13, fontWeight: 500,
                }}>
                  🔧 Coming soon — bot being configured
                </div>
              )}
            </div>
          </div>
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
              { num: "01", title: "Submit", desc: "Create your submission via web form or Telegram bot. Founders or their AI agents can apply via REST API." },
              { num: "02", title: "Upload", desc: "Attach your pitch deck, financial model, or cap table. We accept PDF, PPTX, Google Drive links, and Dropbox." },
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
        VC Discovery Agent — Built with Next.js, Supabase &amp; Claude AI
        {telegramUrl && (
          <span> · <a href={telegramUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#229ED9", textDecoration: "none" }}>Telegram Bot</a></span>
        )}
      </footer>
    </main>
  );
}

/* Inline Telegram SVG icon — no extra dependency needed */
function TelegramIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <path d="M11.944 0A12 12 0 1 0 24 12 12 12 0 0 0 11.944 0Zm5.916 7.193-2.023 9.531c-.149.664-.543.826-1.1.514l-3.029-2.232-1.462 1.407c-.162.162-.297.297-.608.297l.216-3.077 5.594-5.051c.243-.216-.054-.336-.378-.12L7.28 13.6l-2.975-.928c-.648-.203-.66-.648.135-.959l11.609-4.479c.54-.196 1.011.12.81.959Z"/>
    </svg>
  );
}
