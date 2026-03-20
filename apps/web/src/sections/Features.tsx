const FEATURES = [
  {
    icon: "⚡",
    title: "Type-safe transitions",
    desc: "TypeScript infers every valid action and every possible target screen directly from your config. Rename a screen and the compiler tells you everywhere it's used.",
  },
  {
    icon: "📊",
    title: "Analytics as architecture",
    desc: "Every dispatch emits a typed event carrying screen metadata. Wire your analytics provider once in a single listener — and capture every step, every action, every drop-off.",
  },
  {
    icon: "🗺️",
    title: "Auto-generated flow diagrams",
    desc: "Call generateMermaid() or render FlowDiagramView to get an interactive SVG diagram of your entire flow. Documentation that regenerates itself from your source of truth.",
  },
  {
    icon: "🔄",
    title: "History you actually control",
    desc: "Define checkpoint screens, prevent cyclic history, clear history on specific steps, or skip adding a step to history entirely. Back navigation that behaves like your product expects.",
  },
  {
    icon: "🔗",
    title: "URL coupling is optional",
    desc: "Navigate between screens without touching the URL. Or opt into hash-based URL sync when you need deep linking. Your flow logic doesn't change either way.",
  },
  {
    icon: "📦",
    title: "Lazy screens, zero waste",
    desc: "Every screen is a dynamic import. Screens load on demand and users don't download code for steps they haven't reached. Ship a 2-step flow that performs like a single component.",
  },
];

export default function Features() {
  return (
    <section className="section nebula-bg" id="features">
      <div className="container">
        <div className="eyebrow">What you get</div>
        <h2 className="heading-xl" style={{ maxWidth: 560 }}>
          Everything a product flow
          <br />
          <span className="gradient-text">actually needs.</span>
        </h2>
        <p className="body-lg text-secondary mt-24" style={{ maxWidth: 520 }}>
          Not a router wrapper. Not a wizard library. An orchestration engine
          designed for the complexity of real product flows — with the
          developer experience you'd expect from a TypeScript-first library.
        </p>

        <div className="features-grid" id="how-it-works">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-card-icon">{f.icon}</div>
              <div className="feature-card-title">{f.title}</div>
              <div className="feature-card-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
