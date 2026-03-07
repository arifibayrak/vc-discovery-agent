"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        height: 56,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>VC Discovery</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px",
            background: "var(--fg)", color: "var(--bg)", borderRadius: 4,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>Agent</span>
        </Link>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <NavLink href="/" label="Home" active={path === "/"} />
          <NavLink href="/apply" label="Apply" active={path === "/apply"} />
          <NavLink href="/admin" label="Admin" active={path === "/admin"} />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={{
      padding: "6px 14px",
      borderRadius: 6,
      fontSize: 14,
      fontWeight: active ? 600 : 450,
      color: active ? "var(--fg)" : "var(--muted)",
      background: active ? "var(--accent-soft)" : "transparent",
      transition: "all 0.15s",
    }}>
      {label}
    </Link>
  );
}
