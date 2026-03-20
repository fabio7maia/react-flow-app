import { useState } from "react";

const PACKAGE_MANAGERS = [
  { id: "npm",  cmd: "npm install react-flow-app" },
  { id: "pnpm", cmd: "pnpm add react-flow-app" },
  { id: "yarn", cmd: "yarn add react-flow-app" },
] as const;

const QUICK_START = (
  <pre>
    <span className="sk">{"import "}</span>
    <span className="sd">{"{ createFlowApp, defineFlow, defineScreens } "}</span>
    <span className="sk">{"from "}</span>
    <span className="ss">{'"react-flow-app"'}</span>
    <span className="sd">{";\n\n"}</span>
    <span className="sc">{"// 1. Define your screens\n"}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"screens = "}</span>
    <span className="sf">{"defineScreens"}</span>
    <span className="sd">{"({\n"}</span>
    <span className="sd">{"  stepA: { actions: ["}</span>
    <span className="ss">{'"next"'}</span>
    <span className="sd">{"], loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./StepA'"}</span>
    <span className="sd">{") },\n"}</span>
    <span className="sd">{"  stepB: { actions: ["}</span>
    <span className="ss">{'"next"'}</span>
    <span className="sd">{","}</span>
    <span className="ss">{'"back"'}</span>
    <span className="sd">{"], loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./StepB'"}</span>
    <span className="sd">{") },\n"}</span>
    <span className="sd">{"  done:  { actions: [],        loader: () => "}</span>
    <span className="sk">{"import"}</span>
    <span className="sd">{"("}</span>
    <span className="ss">{"'./Done'"}</span>
    <span className="sd">{") },\n"}</span>
    <span className="sd">{"});\n\n"}</span>
    <span className="sc">{"// 2. Define transitions\n"}</span>
    <span className="sk">{"const "}</span>
    <span className="sd">{"flow = "}</span>
    <span className="sf">{"defineFlow"}</span>
    <span className="sd">{"({\n"}</span>
    <span className="sd">{"  name: "}</span>
    <span className="ss">{'"myFlow"'}</span>
    <span className="sd">{",\n"}</span>
    <span className="sd">{"  steps: { stepA: { initialStep: "}</span>
    <span className="sk">{"true"}</span>
    <span className="sd">{" } },\n"}</span>
    <span className="sd">{"  transitions: {\n"}</span>
    <span className="sd">{"    stepA: { next: "}</span>
    <span className="ss">{'"stepB"'}</span>
    <span className="sd">{" },\n"}</span>
    <span className="sd">{"    stepB: { next: "}</span>
    <span className="ss">{'"done"'}</span>
    <span className="sd">{",  back: "}</span>
    <span className="ss">{'"stepA"'}</span>
    <span className="sd">{" },\n"}</span>
    <span className="sd">{"  },\n"}</span>
    <span className="sd">{"});\n\n"}</span>
    <span className="sc">{"// 3. Create the app — hooks + provider, fully typed\n"}</span>
    <span className="sk">{"export const "}</span>
    <span className="sd">{"{ FlowProvider, useFlowManager, useFlow } =\n"}</span>
    <span className="sd">{"  "}</span>
    <span className="sf">{"createFlowApp"}</span>
    <span className="sd">{"({ screens, flows: { myFlow: flow } });"}</span>
  </pre>
);

const STEPS = [
  {
    title: "Install the package",
    desc: "One command. Zero configuration. Works with React 16 through 19.",
  },
  {
    title: "Define screens and transitions",
    desc: "Map your screens, their actions, and where each action leads. TypeScript infers the rest.",
  },
  {
    title: "Wrap your app in FlowProvider",
    desc: "Mount the provider, call useFlowManager().start(), and your flow is running.",
  },
  {
    title: "Wire analytics once",
    desc: "Add a single useFlowListener() call. Every step, every action, every drop-off — captured.",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={handleCopy}
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

export default function GetStarted() {
  const [pm, setPm] = useState<(typeof PACKAGE_MANAGERS)[number]["id"]>("npm");

  const current = PACKAGE_MANAGERS.find((p) => p.id === pm)!;

  return (
    <section className="section nebula-bg" id="get-started">
      <div className="container">
        <div className="eyebrow">Get started</div>
        <h2 className="heading-xl" style={{ maxWidth: 560 }}>
          From zero to orchestrating
          <br />
          <span className="gradient-text">in under five minutes.</span>
        </h2>

        <div className="get-started-grid">
          {/* Left: install + quick start */}
          <div>
            <div className="mb-16">
              <div className="install-tabs">
                {PACKAGE_MANAGERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`install-tab${pm === p.id ? " active" : ""}`}
                    onClick={() => setPm(p.id)}
                  >
                    {p.id}
                  </button>
                ))}
              </div>
              <div className="install-block">
                <span className="install-pm">$</span>
                <span className="install-pkg">{current.cmd}</span>
                <CopyButton text={current.cmd} />
              </div>
            </div>

            <div className="code-block" style={{ marginTop: 24 }}>
              <div className="code-header">
                <div className="code-dot" style={{ background: "#F87171" }} />
                <div className="code-dot" style={{ background: "#FCD34D" }} />
                <div className="code-dot" style={{ background: "#4ADE80" }} />
                <span className="code-filename">flow.config.ts</span>
              </div>
              <div className="code-body">{QUICK_START}</div>
            </div>
          </div>

          {/* Right: step-by-step */}
          <div>
            <p className="body-lg text-secondary" style={{ marginBottom: 32 }}>
              No boilerplate files, no CLI setup, no code generation. Just
              install, define, and ship.
            </p>

            <div className="steps-list">
              {STEPS.map((step, i) => (
                <div key={step.title} className="step-item">
                  <div className="step-num">{i + 1}</div>
                  <div>
                    <div className="step-content-title">{step.title}</div>
                    <div className="step-content-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
              <a
                href="https://github.com/fabio7maia/react-flow-app"
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                View on GitHub →
              </a>
              <a
                href="https://github.com/fabio7maia/react-flow-app#readme"
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                Read the docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
