---
title: Versions and releases
description: npm tags, what alpha, beta and rc mean for v3, and the changelog.
---

| npm tag  | Version         | Install                            |
| -------- | --------------- | ---------------------------------- |
| `latest` | v2              | `npm install react-flow-app`       |
| `alpha`  | v3 pre-releases | `npm install react-flow-app@alpha` |

## Stages

v3 goes through pre-release stages before it replaces v2 on `latest`. Each stage has an exit criterion, not a date.

- **Alpha**: the API may still change. The goal is feedback from real apps.
- **Beta**: the API is frozen; only fixes and additions that break nothing.
- **Release candidate**: a candidate for 3.0.0; only blocking fixes.
- **Stable**: 3.0.0 on `latest`; v2 moves to a maintenance branch.

## Changelog

Every release lists its changes in [`CHANGELOG.md`](https://github.com/fabio7maia/react-flow-app/blob/v3/CHANGELOG.md), written per
change with Changesets.
