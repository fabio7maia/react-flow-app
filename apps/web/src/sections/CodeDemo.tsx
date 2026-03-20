import { useState } from "react";

const BEFORE_CODE = (
  <pre>
    <span className="sc">{"// ❌ The router way — logic scattered everywhere\n"}</span>
    <span className="sk">{"import "}</span>
    <span className="sd">{"{ useState, useCallback } "}</span>
    <span className="sk">{"from "}</span>
    <span className="ss">{'"react"'}</span>
    <span className="sd">{";\n\n"}</span>
    <span className="sk">{"type "}</span>
    <span className="st">{"Step "}</span>
    <span className="sd">{"= "}</span>
    <span className="ss">{'"welcome"'}</span>
    <span className="sd">{" | "}</span>
    <span className="ss">{'"email"'}</span>
    <span className="sd">{" | "}</span>
    <span className="ss">{'"details"'}</span>
    <span className="sd">{" | "}</span>
    <span className="ss">{'"confirm"'}</span>
    <span className="sd">{";\n\n"}</span>
    <span className="sf">{"function "}</span>
    <span className="sf">{"OnboardingFlow"}</span>
    <span className="sd">{"() {\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"[step, setStep] = "}</span>
    <span className="sf">{"useState"}</span>
    <span className="sd">{"<"}</span>
    <span className="st">{"Step"}</span>
    <span className="sd">{">("}</span>
    <span className="ss">{'"welcome"'}</span>
    <span className="sd">{");\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"[history, setHistory] = "}</span>
    <span className="sf">{"useState"}</span>
    <span className="sd">{"<"}</span>
    <span className="st">{"Step"}</span>
    <span className="sd">{"[]>([]);\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"[data, setData] = "}</span>
    <span className="sf">{"useState"}</span>
    <span className="sd">{"({});\n\n"}</span>
    <span className="sc">{"  // Navigation logic baked into each handler\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sk">{"const "}</span>
    <span className="sf">{"handleEmailSubmit "}</span>
    <span className="sd">{"= "}</span>
    <span className="sf">{"useCallback"}</span>
    <span className="sd">{"((payload) => {\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sf">{"setHistory"}</span>
    <span className="sd">{"(h => [...h, step]);\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sf">{"setData"}</span>
    <span className="sd">{"(d => ({ ...d, ...payload }));\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sc">{"// Remember to track. Every. Single. Time.\n"}</span>
    <span className="sd">{"    analytics."}</span>
    <span className="sf">{"page"}</span>
    <span className="sd">{"({ screen: "}</span>
    <span className="ss">{'"email"'}</span>
    <span className="sd">{", ...payload });\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sf">{"setStep"}</span>
    <span className="sd">{"(payload.type === "}</span>
    <span className="ss">{'"biz"'}</span>
    <span className="sd">{" ? "}</span>
    <span className="ss">{'"details"'}</span>
    <span className="sd">{" : "}</span>
    <span className="ss">{'"confirm"'}</span>
    <span className="sd">{");\n"}</span>
    <span className="sd">{"  }, [step]);\n\n"}</span>
    <span className="sc">{"  // Back navigation reimplemented manually\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sk">{"const "}</span>
    <span className="sf">{"handleBack "}</span>
    <span className="sd">{"= () => {\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"prev = history[history.length - 1];\n"}</span>
    <span className="sd">{"    "}</span>
    <span className="sk">{"if "}</span>
    <span className="sd">{"(prev) { "}</span>
    <span className="sf">{"setStep"}</span>
    <span className="sd">{"(prev); "}</span>
    <span className="sf">{"setHistory"}</span>
    <span className="sd">{"(h => h.slice(0, -1)); }\n"}</span>
    <span className="sd">{"  };\n\n"}</span>
    <span className="sc">{"  // And 40 more lines for the other steps...\n"}</span>
    <span className="sd">{"}"}</span>
  </pre>
);

const AFTER_CODE = (
  <pre>
    <span className="sc">{"// ✅ The orchestration way — one place, full picture\n"}</span>
    <span className="sk">{"import "}</span>
    <span className="sd">{"{ createFlowApp, defineFlow, defineScreens } "}</span>
    <span className="sk">{"from "}</span>
    <span className="ss">{'"react-flow-app"'}</span>
    <span className="sd">{";\n\n"}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"{ FlowProvider, useFlowManager, useFlowListener } =\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sf">{"createFlowApp"}</span>
    <span className="sd">{"({\n"}</span>
    <span className="sd">{"  screens: "}</span>
    <span className="sf">{"defineScreens"}</span>
    <span className="sd">{"({\n"}</span>
    <span className="sd">{"    welcome:  { actions: ["}</span>
    <span className="ss">{'"start"'}</span>
    <span className="sd">{"],        loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./Welcome'"}</span>
    <span className="sd">{") },\n"}</span>
    <span className="sd">{"    email:    { actions: ["}</span>
    <span className="ss">{'"submit"'}</span>
    <span className="sd">{","}</span>
    <span className="ss">{'"back"'}</span>
    <span className="sd">{"], loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./Email'"}</span>
    <span className="sd">{"),\n"}</span>
    <span className="sd">{"                   meta: { title: "}</span>
    <span className="ss">{'"Email"'}</span>
    <span className="sd">{", url: "}</span>
    <span className="ss">{"'/onboarding/email'"}</span>
    <span className="sd">{" } },\n"}</span>
    <span className="sd">{"    confirm:  { actions: ["}</span>
    <span className="ss">{'"confirm"'}</span>
    <span className="sd">{","}</span>
    <span className="ss">{'"edit"'}</span>
    <span className="sd">{"],  loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./Confirm'"}</span>
    <span className="sd">{") },\n"}</span>
    <span className="sd">{"  }),\n\n"}</span>
    <span className="sd">{"  flows: {\n"}</span>
    <span className="sd">{"    onboarding: "}</span>
    <span className="sf">{"defineFlow"}</span>
    <span className="sd">{"({\n"}</span>
    <span className="sd">{"      name: "}</span>
    <span className="ss">{'"onboarding"'}</span>
    <span className="sd">{",\n"}</span>
    <span className="sd">{"      steps: { welcome: { initialStep: "}</span>
    <span className="sk">{"true"}</span>
    <span className="sd">{" } },\n"}</span>
    <span className="sd">{"      transitions: {\n"}</span>
    <span className="sd">{"        welcome: { start:   "}</span>
    <span className="ss">{'"email"'}</span>
    <span className="sd">{" },\n"}</span>
    <span className="sd">{"        email:   { submit:  (p) => p.type === "}</span>
    <span className="ss">{'"biz"'}</span>
    <span className="sd">{" ? "}</span>
    <span className="ss">{'"details"'}</span>
    <span className="sd">{" : "}</span>
    <span className="ss">{'"confirm"'}</span>
    <span className="sd">{",\n"}</span>
    <span className="sd">{"                   back:    "}</span>
    <span className="ss">{'"welcome"'}</span>
    <span className="sd">{" },\n"}</span>
    <span className="sd">{"        confirm: { confirm: "}</span>
    <span className="ss">{'"done"'}</span>
    <span className="sd">{",  edit: "}</span>
    <span className="ss">{'"email"'}</span>
    <span className="sd">{" },\n"}</span>
    <span className="sd">{"      },\n"}</span>
    <span className="sd">{"    }),\n"}</span>
    <span className="sd">{"  },\n"}</span>
    <span className="sd">{"});\n\n"}</span>
    <span className="sc">{"// Analytics wired once — zero scattered track() calls\n"}</span>
    <span className="sf">{"useFlowListener"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{'"dispatch"'}</span>
    <span className="sd">{", ({ action, meta }) => {\n"}</span>
    <span className="sd">{"  analytics."}</span>
    <span className="sf">{"page"}</span>
    <span className="sd">{"(meta);  "}</span>
    <span className="sc">{"// That's it. ✓\n"}</span>
    <span className="sd">{"});"}</span>
  </pre>
);

export default function CodeDemo() {
  const [tab, setTab] = useState<"before" | "after">("before");

  return (
    <section
      className="section"
      style={{ background: "var(--bg-surface)" }}
      id="code-demo"
    >
      <div className="container">
        <div className="eyebrow">See the difference</div>
        <h2 className="heading-xl" style={{ maxWidth: 600 }}>
          The same checkout flow,
          <br />
          <span className="gradient-text">two very different architectures.</span>
        </h2>
        <p className="body-lg text-secondary mt-24" style={{ maxWidth: 540 }}>
          Both compile. One scales. The router approach works until your flow
          has conditional branches, analytics requirements, or a back button
          that needs to behave differently on different screens.
        </p>

        <div style={{ marginTop: 48 }}>
          <div className="code-demo-tabs">
            <button
              className={`code-demo-tab${tab === "before" ? " active" : ""}`}
              onClick={() => setTab("before")}
              type="button"
            >
              <span className="badge badge-red">before</span>
              Router approach
            </button>
            <button
              className={`code-demo-tab${tab === "after" ? " active" : ""}`}
              onClick={() => setTab("after")}
              type="button"
            >
              <span className="badge badge-green">after</span>
              react-flow-app
            </button>
          </div>

          <div className="code-block code-demo-panel">
            <div className="code-body" style={{ minHeight: 420 }}>
              {tab === "before" ? BEFORE_CODE : AFTER_CODE}
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginTop: 32,
          }}
        >
          {[
            { label: "Transition logic", before: "In handler functions", after: "In flow config" },
            { label: "Analytics", before: "Scattered track() calls", after: "Single listener" },
            { label: "Back navigation", before: "Manual history array", after: "Built-in + configurable" },
            { label: "TypeScript safety", before: "Step names as strings", after: "Fully inferred" },
            { label: "Flow visualisation", before: "Draw it in Figma", after: "Generated automatically" },
            { label: "Conditional routing", before: "if/else in handlers", after: "Transition functions" },
          ].map((row) => (
            <div
              key={row.label}
              className="card"
              style={{ padding: "20px 24px", borderRadius: "var(--radius)" }}
            >
              <div
                className="body-sm"
                style={{
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  fontSize: 11,
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--red)",
                    opacity: 0.8,
                    flex: 1,
                    minWidth: 140,
                  }}
                >
                  ✗ {row.before}
                </div>
                <div style={{ fontSize: 13, color: "var(--green)", flex: 1, minWidth: 140 }}>
                  ✓ {row.after}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
