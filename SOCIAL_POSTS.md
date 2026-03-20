# Social Media Posts — react-flow-app

Ready-to-publish copy for Twitter/X, LinkedIn, and Dev.to.

---

## Twitter / X — Thread (6 tweets)

---

**Tweet 1 — Hook**

> If you're building multi-step flows in React using react-router, you're solving an orchestration problem with a routing tool.
>
> There's a better abstraction. Let me show you. 🧵

---

**Tweet 2 — The problem**

> React Router manages URLs → components beautifully.
>
> But your checkout, onboarding wizard, or KYC flow isn't a URL problem — it's an orchestration problem.
>
> - Every step has conditional transitions
> - Back navigation has business rules
> - Analytics needs to track every branch
>
> Routers weren't designed for this.

---

**Tweet 3 — The solution**

> react-flow-app separates navigation logic from URL structure.
>
> You define:
> • Which screens exist
> • What actions each screen can fire
> • Where each action leads (including conditional logic)
>
> TypeScript infers every valid action and every possible target. No magic strings.

---

**Tweet 4 — The analytics angle**

> The part that nobody wants to implement properly: analytics.
>
> With react-flow-app, every navigation is a typed event. Every screen has metadata. You wire it once:
>
> ```ts
> useFlowListener('dispatch', ({ action, meta }) => {
>   gtag('event', action, meta) // done ✓
> })
> ```
>
> Zero scattered analytics.track() calls across your components.

---

**Tweet 5 — The diagram feature**

> My favourite feature: `generateMermaid(myFlow)`.
>
> Your flow config auto-generates a diagram you can paste into any tool.
>
> Or render `<FlowDiagramView />` directly in your app — an interactive SVG diagram that's always in sync with your actual transitions.
>
> Documentation that can't go out of date.

---

**Tweet 6 — CTA**

> react-flow-app is:
> • MIT licensed
> • TypeScript-first (fully inferred API)
> • React 16–19 support
> • ~5KB gzip
> • Zero mandatory URL dependency
>
> ```bash
> npm install react-flow-app
> ```
>
> If you're building wizards, checkout flows, onboarding, or KYC — I'd love your feedback.
>
> → github.com/fabio7maia/react-flow-app ⭐

---

## LinkedIn — Long-form post

---

**Title:** The hidden complexity no one talks about in React checkout flows

Building a multi-step checkout, onboarding wizard, or KYC flow in React looks simple at first.

But at some point you end up with step tracking in component state, conditional transitions in handler functions, back navigation reimplemented in a custom hook, and analytics.track() calls scattered across every component that ever fires an event.

Sound familiar?

The root cause isn't a coding problem — it's an architectural one. React Router is excellent at what it does: mapping URLs to components. But multi-step product flows need a different abstraction. They need orchestration.

**I've been building react-flow-app to solve exactly this.**

It's an event-driven flow engine for React that separates user journey logic from URL structure. You define your flow once — which screens exist, what actions they can fire, and where each action leads — and TypeScript infers everything from there.

The three things I'm most proud of:

**1. Type-safe transitions**
Rename a screen and the compiler tells you everywhere that transition is used. No magic strings. No runtime surprises about a missing case.

**2. Analytics as architecture**
Instead of scattering track() calls across every component, you wire one listener and every navigation event carries full context — action name, screen metadata, payload. One place. Full coverage.

**3. Auto-generated diagrams**
Call `generateMermaid()` on any flow config and you get a Mermaid diagram. Or render `<FlowDiagramView />` in your app for an interactive SVG. Documentation that regenerates from your source of truth and can't go out of date.

It's open source (MIT), TypeScript-first, supports React 16 through 19, and weighs ~5KB gzipped.

If you're building product flows that go beyond simple page routing, I'd genuinely love your feedback.

→ github.com/fabio7maia/react-flow-app

#React #TypeScript #OpenSource #FrontendDevelopment #WebDevelopment

---

## Dev.to — Article intro

---

**Title:** Stop Using Your Router for Product Flows: An Event-Driven Alternative

**Tags:** react, typescript, architecture, opensource

---

Every React developer who has shipped a multi-step checkout, onboarding flow, or KYC wizard has encountered the same problem.

It starts simply. A `useState` for the current step. A few `if/else` blocks in handler functions. Maybe a custom hook to manage history. By the time the flow has five steps, two conditional branches, and an analytics requirement from the product team, the codebase looks like something you're embarrassed to show in a code review.

The problem isn't that the code is bad. The problem is that we're using the wrong tool.

React Router models URLs. But product flows model **state machines** — inputs trigger transitions, transitions produce outputs, and the system enforces what's possible at any given point. These are fundamentally different problems.

In this article, I want to show you `react-flow-app` — an event-driven flow engine for React that treats navigation as orchestration, not routing.

### What we'll cover

- Why routers fall short for product flows
- The core API: `defineScreens`, `defineFlow`, `createFlowApp`
- Type-safe transitions with full TypeScript inference
- Wiring analytics with a single listener
- Generating flow diagrams automatically
- A complete checkout flow example

Let's start with the problem.

---

*(Full article continues at github.com/fabio7maia/react-flow-app)*

---

## Short-form copy (for shares, quote posts, product hunts)

---

**Tagline A:**
> react-flow-app — because your checkout flow is not a routing problem.

**Tagline B:**
> Type-safe transitions. Built-in analytics hooks. Auto-generated flow diagrams.
> The React library that treats product flows as first-class citizens.

**Tagline C:**
> Your router knows about URLs. react-flow-app knows about your user journey.
> Open source. TypeScript-first. React 16–19.

**Product Hunt headline:**
> react-flow-app — Event-driven flow orchestration for React

**Product Hunt tagline:**
> Define transitions once, get type-safe navigation + analytics hooks + live diagrams. Built for checkout flows, onboarding, wizards, and every multi-step experience that your router can't handle cleanly.
