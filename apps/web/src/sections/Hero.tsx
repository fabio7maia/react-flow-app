import { useEffect, useState } from "react";

const FLOW_STEPS = [
  { id: "welcome",  label: "Welcome",  action: "start" },
  { id: "email",    label: "Email",    action: "submit" },
  { id: "details",  label: "Details",  action: "submit" },
  { id: "confirm",  label: "Confirm",  action: "confirm" },
  { id: "success",  label: "Done ✓",   action: null },
];

function FlowDiagram() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visitedSet, setVisitedSet] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % FLOW_STEPS.length;
        setVisitedSet((vs) => new Set([...vs, next]));
        return next;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const activeStep = FLOW_STEPS[activeIdx];

  return (
    <div className="flow-diagram">
      <div className="flow-diagram-header">
        <span className="flow-diagram-title">onboarding.flow.ts</span>
        <div className="flow-live-badge">
          <div className="flow-live-dot" />
          Live demo
        </div>
      </div>

      <div className="flow-nodes">
        {FLOW_STEPS.map((step, i) => (
          <div key={step.id} className="flow-node-wrap">
            <div
              className={`flow-node${activeIdx === i ? " active" : ""}${visitedSet.has(i) && activeIdx !== i ? " visited" : ""}`}
              onClick={() => {
                setActiveIdx(i);
                setVisitedSet((vs) => new Set([...vs, i]));
              }}
            >
              <div className="flow-node-box">
                <div className="flow-node-name">{step.label}</div>
              </div>
            </div>
            {i < FLOW_STEPS.length - 1 && (
              <div className="flow-arrow">
                <span className="flow-arrow-label">{step.action}</span>
                <div className="flow-arrow-line">
                  <div className={`flow-arrow-track${activeIdx === i ? " active" : ""}`} />
                  <div className="flow-arrow-head" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flow-step-indicator">
        <span>
          Step {activeIdx + 1} of {FLOW_STEPS.length}
        </span>
        {activeStep.action && (
          <div className="flow-step-action-hint">
            <span>dispatch</span>
            <span className="flow-step-action-code">
              ("{activeStep.action}")
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="hero nebula-bg dot-grid section" id="hero">
      <div className="container">
        <div className="hero-content">
          <div className="hero-kicker">
            <div className="hero-kicker-dot" />
            Event-driven flow orchestration for React
          </div>

          <h1 className="display hero-title">
            Stop routing.
            <br />
            <span className="gradient-text">Start orchestrating.</span>
          </h1>

          <p className="hero-subtitle">
            react-flow-app is the missing layer between your React components and
            your business logic. Define transitions once. Get type-safe
            navigation, built-in analytics hooks, and auto-generated flow
            diagrams — without touching your router.
          </p>

          <div className="hero-ctas">
            <a href="#get-started" className="btn btn-primary btn-lg">
              Get Started →
            </a>
            <a
              href="https://github.com/fabio7maia/react-flow-app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-lg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <FlowDiagram />
        </div>

        <div className="hero-stats">
          <div>
            <div className="hero-stat-value gradient-text">0</div>
            <div className="hero-stat-label">URL dependencies to start</div>
          </div>
          <div>
            <div className="hero-stat-value gradient-text">~5KB</div>
            <div className="hero-stat-label">gzipped footprint</div>
          </div>
          <div>
            <div className="hero-stat-value gradient-text">React 16–19</div>
            <div className="hero-stat-label">full version support</div>
          </div>
          <div>
            <div className="hero-stat-value gradient-text">100%</div>
            <div className="hero-stat-label">TypeScript-inferred API</div>
          </div>
        </div>
      </div>
    </section>
  );
}
