const YEAR = new Date().getFullYear();

const LINKS = {
  Library: [
    { label: "GitHub", href: "https://github.com/fabio7maia/react-flow-app" },
    { label: "npm", href: "https://www.npmjs.com/package/react-flow-app" },
    { label: "Changelog", href: "https://github.com/fabio7maia/react-flow-app/blob/main/CHANGELOG.md" },
    { label: "License (MIT)", href: "https://github.com/fabio7maia/react-flow-app/blob/main/LICENSE" },
  ],
  Documentation: [
    { label: "Getting Started", href: "https://github.com/fabio7maia/react-flow-app#readme" },
    { label: "API Reference", href: "https://github.com/fabio7maia/react-flow-app#api" },
    { label: "Examples", href: "https://github.com/fabio7maia/react-flow-app/blob/main/EXAMPLES.md" },
    { label: "Flow Diagrams", href: "https://github.com/fabio7maia/react-flow-app#diagrams" },
  ],
  Community: [
    { label: "Report an Issue", href: "https://github.com/fabio7maia/react-flow-app/issues" },
    { label: "Discussions", href: "https://github.com/fabio7maia/react-flow-app/discussions" },
    { label: "Contributing", href: "https://github.com/fabio7maia/react-flow-app/blob/main/CONTRIBUTING.md" },
  ],
};

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand column */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, var(--brand-dark), var(--brand-deep))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  boxShadow: "0 0 10px var(--brand-glow)",
                }}
              >
                ⬡
              </div>
              react-flow-app
            </div>
            <p className="footer-brand-desc">
              The event-driven flow engine for React. Ship product flows that
              are type-safe, analytics-ready, and visually documented — without
              fighting your router.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <span className="badge badge-brand">MIT License</span>
              <span className="badge badge-brand">TypeScript</span>
              <span className="badge badge-brand">React 16–19</span>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title}>
              <div className="footer-col-title">{title}</div>
              <div className="footer-links">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="footer-link"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {YEAR} react-flow-app. Built with care by{" "}
            <a
              href="https://github.com/fabio7maia"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--brand)" }}
            >
              Fábio Maia
            </a>
            .
          </p>
          <div className="footer-badges">
            <a
              href="https://github.com/fabio7maia/react-flow-app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ padding: "7px 14px", fontSize: 13 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
