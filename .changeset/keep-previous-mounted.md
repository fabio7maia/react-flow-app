---
'react-flow-app': minor
---

`keepPreviousMounted` step option (parity with v2.20): while a step with the option is active, the previous step of the flow stays mounted (hidden) with its state, refs and DOM, and back shows it again without remounting. Kept screens read their own URL params. `FlowProvider` also accepts `initial.history` (v2: `initialHistory`).
