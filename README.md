# ResilientMind - Android (web game, TypeScript, Node.js, Vite)

[![CI](https://github.com/pzverkov/app-survival-android/actions/workflows/checks.yml/badge.svg)](https://github.com/pzverkov/app-survival-android/actions/workflows/checks.yml)
[![Deploy](https://github.com/pzverkov/app-survival-android/actions/workflows/deploy.yml/badge.svg)](https://github.com/pzverkov/app-survival-android/actions/workflows/deploy.yml)
[![CodeQL](https://github.com/pzverkov/app-survival-android/actions/workflows/codeql.yml/badge.svg)](https://github.com/pzverkov/app-survival-android/actions/workflows/codeql.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-129_passing-6e9f18?logo=vitest&logoColor=white)](./tests)
[![Zero Dependencies](https://img.shields.io/badge/Runtime_Deps-0-brightgreen)](./package.json)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue)](./LICENSE)
<!-- security-check:begin -->
<!-- security-check:end -->

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
Node.js 22 LTS or newer is recommended

Install
`npm install`

Run
`npm run dev`

Build
`npm run build`

Tests
`npm run test:unit` (unit) and `npm run test:e2e:ci` (E2E + DOM validation)

## How to play (short)

1) Pick a preset (Junior Mid/Senior/Staff/Principal), then press **Start**.
2) Place components, link dependencies, upgrade, and fix tickets to keep the app alive.
3) Expect incidents. Stabilize without tanking privacy, accessibility, security, coverage, and regional compliance.
4) Try a **Release Trains** scenario for a scripted, repeatable shift — each one ends with a postmortem grade (S → D).

More details: see docs/GAMEPLAY.md and docs/SCENARIOS.md

## Docs

- Gameplay (seeds, scoring, incidents, postmortems, profile & achievements): [GAMEPLAY.md](./docs/GAMEPLAY.md)
- Scenarios (Release Trains launch drills): [SCENARIOS.md](./docs/SCENARIOS.md)
- Systems (concepts + realism layers): [SYSTEMS.md](./docs/SYSTEMS.md)
- Architecture rules and refactor roadmap: [ARCHITECTURE_RULES.md](./docs/ARCHITECTURE_RULES.md)
- Evaluation exercise + level differentiation lens: [EVALUATION.md](./docs/EVALUATION.md)
- Testing and CI notes (Vitest + Playwright + E2E marker): [TESTING.md](./docs/TESTING.md)
- UI notes (Material 3, sparklines, accessibility): [UI.md](./docs/UI.md)
- Developer guide (adding components, incidents, achievements, translations): [DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)
- Learning resources (Android + KMP): [LEARNING.md](./docs/LEARNING.md)
- Optional code task ideas: [OPTIONAL_TASKS.md](./docs/OPTIONAL_TASKS.md)

## Security

See [SECURITY.md](./SECURITY.md) for reporting guidance. Do not include secrets in issues or pull requests.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and contribution expectations.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for community standards.

## License

Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE) files.

## Disclaimer

This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software.

This project is an educational simulation game. Nothing in this repository constitutes professional advice of any kind, including but not limited to engineering advice, security advice, legal advice, compliance advice, or architectural guidance. The simulation mechanics, incident scenarios, scoring systems, and game content are fictional abstractions designed for entertainment and learning purposes only. They do not represent real-world best practices, standards, or recommendations.

Users who download, fork, deploy, or otherwise use this software do so entirely at their own risk and assume full responsibility for any consequences arising from such use. The authors make no representations regarding the accuracy, completeness, or suitability of any information or functionality provided by this software.
