const PROBLEMS = [
  {
    num: "01",
    title: "Your logic lives in\nthree different places.",
    desc: "Step tracking in component state, transitions in handler functions, back navigation in a custom hook. Your flow is scattered, and nobody has the full picture.",
  },
  {
    num: "02",
    title: "Analytics is always\nan afterthought.",
    desc: "Sprinkling analytics.track() calls across every screen that fires an event. Miss one and you have a gap in your funnel data. Change a step name and everything breaks.",
  },
  {
    num: "03",
    title: "Your flows live only in\nsomeone's head.",
    desc: "Or in a Figma file that's already out of date. There's no way to see the full transition graph of your checkout, onboarding, or KYC flow without reading the code.",
  },
];

export default function Problems() {
  return (
    <section className="section" style={{ background: "var(--bg-surface)" }}>
      <div className="container">
        <div className="eyebrow">The problem</div>
        <h2 className="heading-xl" style={{ maxWidth: 600 }}>
          Your router was built for URLs,
          <br />
          <span className="gradient-text-warm">not user journeys.</span>
        </h2>
        <p
          className="body-lg text-secondary mt-24"
          style={{ maxWidth: 560 }}
        >
          React Router and TanStack Router are excellent tools — for routing.
          But multi-step product flows are an orchestration problem, and
          orchestration requires a different abstraction entirely.
        </p>

        <div className="problems-grid">
          {PROBLEMS.map((p) => (
            <div key={p.num} className="problem-card">
              <div className="problem-number">Problem {p.num}</div>
              <h3 className="problem-title" style={{ whiteSpace: "pre-line" }}>
                {p.title}
              </h3>
              <p className="problem-desc">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
