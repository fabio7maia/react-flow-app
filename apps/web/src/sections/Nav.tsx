import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="container">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="nav-logo-icon">⬡</div>
            react-flow-app
          </a>

          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How it works</a>
            <a
              href="https://github.com/fabio7maia/react-flow-app"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
            >
              GitHub
            </a>
          </div>

          <a
            href="#get-started"
            className="btn btn-primary nav-cta"
            style={{ padding: "9px 20px", fontSize: "14px" }}
          >
            Get Started →
          </a>
        </div>
      </div>
    </nav>
  );
}
