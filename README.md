# ResilientMind - Android (web game, TypeScript, Node.js, Vite)

## Project

App Survival ResilientMind - Android is a web-based simulation game inspired by real Android production incidents. It compresses production constraints into a playable loop: design an architecture graph, ship under pressure, and maintain user sentiment, reliability, security, and compliance simultaneously.

Inspired by Server Survival by pshenok at https://pshenok.github.io/server-survival/ This project is an original implementation and is not affiliated with the original author. No code or assets were copied from the original project.

Live demo
https://pzverkov.github.io/app-survival-android/

## Table of contents
- Purpose
- Quick start
- How to play (short)
- Docs
- Security/Contributing /License

## Purpose

This project is designed to be usable for Android developer skill evaluation, with emphasis on Senior, Staff, and Principal-level production thinking. It targets real-world trade-offs across performance, reliability, background execution, security and privacy, accessibility, observability, incident response, and multi-region policy pressure.

The simulation core is written in TypeScript and intentionally kept separate from UI rendering so it can be ported to Kotlin and Android implementation later.

## Quick start

Prerequisites
Node.js 20 or newer is recommended

Install
`npm install`

Run
`npm run dev`

Build
`npm run build`

Tests
`npm run test:unit`

## How to play (short)

1) Pick a preset (Junior Mid/Senior/Staff/Principal), then press **Start**.
2) Place components, link dependencies, upgrade, and fix tickets to keep the app alive.
3) Expect incidents. Stabilize without tanking privacy, accessibility, security, coverage, and regional compliance.

More details: see docs/GAMEPLAY.md

## Docs

- Gameplay (seeds, scoring, incidents, postmortems, profile & achievements): [GAMEPLAY.md](./docs/GAMEPLAY.md)
- Systems (concepts + realism layers): [SYSTEMS.md](./docs/SYSTEMS.md)
- Architecture rules and refactor roadmap: [ARCHITECTURE_RULES.md](./docs/ARCHITECTURE_RULES.md)
- Evaluation exercise + level differentiation lens: [EVALUATION.md](./docs/EVALUATION.md)
- Testing and CI notes (Vitest + Playwright + E2E marker): [TESTING.md](./docs/TESTING.md)
- UI notes (Material 3, LiquidGlass, responsive dashboard): [UI.md](./docs/UI.md)
- Learning resources (Android + KMP): [LEARNING.md](./docs/LEARNING.md)
- Optional code task ideas: [OPTIONAL_TASKS.md](./docs/OPTIONAL_TASKS.md)

## Security

See [SECURITY.md](./SECURITY.md) for reporting guidance. Do not include secrets in issues or pull requests.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and contribution expectations.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community standards.

## License

Apache License 2.0 See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files.
