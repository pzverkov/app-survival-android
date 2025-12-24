# app-survival-android (web game, TS + Vite)

PROJECT

App Survival Android Release Night is a web based simulation game inspired by real Android production incidents. It compresses common production concerns into a playable system where you place components, link data paths, upgrade defenses, and respond to incidents while user sentiment changes in real time.

Inspired by Server Survival by pshenok at https://pshenok.github.io/server-survival/ This project is an original implementation and is not affiliated with the original author. No code or assets were copied from the original project.

PURPOSE

This project is intended to be usable as an Android developer skill evaluation exercise. It targets production stage expertise across performance, reliability, architecture, background work, security and privacy, accessibility, observability, and incident response trade offs under constraints.

The simulation core is written in TypeScript and kept separate from rendering and UI so it can be ported to a Kotlin and Android implementation later.

KEY CONCEPTS

Nodes represent Android subsystems and architecture layers such as UI, ViewModel, Domain, Repository, Cache, DB, Network, WorkManager, Observability, Feature Flags, and security and accessibility controls.

Actions represent user and system behavior such as scroll, read, write, search, upload, and sync. Some actions can be satisfied via cache while others must hit DB or network.

Incidents simulate real production pain such as traffic spikes, backend failures, background restrictions, MITM attempts, credential stuffing, token theft, accessibility regressions, and supply chain scandals.

Review waves simulate user sentiment and voting. Even a fast and stable app can lose rating if privacy trust or accessibility drops.

HOW TO RUN LOCALLY

Prerequisites
Node.js 20 or newer is recommended.

Install
npm install

Run
npm run dev

Build
npm run build

Preview
npm run preview

GITHUB PAGES DEPLOYMENT

This repository includes a GitHub Actions workflow that builds and publishes the dist folder to GitHub Pages.

Setup
1. Push the repository to GitHub on the main branch.
2. In GitHub repository settings, open Pages.
3. Set Source to GitHub Actions.

Notes
If you use a custom domain, place a CNAME file in the public directory. The build pipeline should use base path slash for custom domains and slash repo name slash for standard GitHub Pages project URLs.

HOW TO PLAY

Start the run.
Place parts for your pipeline and capabilities.
Use Link mode to connect nodes from source to destination.
Watch metrics such as rating, crashes, ANR risk, p95 latency, battery, accessibility score, privacy trust, security posture, and support load.
Upgrade bottlenecks and add mitigations before incidents cascade.
Repair parts when they degrade or go down.
Observe review waves and category votes across performance, reliability, privacy, accessibility, and battery.

RECOMMENDED STARTER GRAPH

UI to ViewModel to Domain to Repository
Repository to Cache to DB
Repository to Network
WorkManager to Repository
Add Observability and Feature Flags early
Add security and accessibility nodes as baseline rather than waiting for incidents

EVALUATION EXERCISE

Goal
Maintain rating at or above 4.2 for 3 to 5 minutes under incident pressure.

Suggested format
Briefing
Stabilization run
Debrief
Optional code task in the simulation engine

Evaluation is based on diagnosis quality, prioritization, trade off reasoning, and the ability to connect decisions back to real Android production practices.

LEVEL DIFFERENTIATION

Mid level
Stabilizes after issues become visible.
Uses basic metrics but may miss second order effects.
Often prioritizes performance or reliability while neglecting privacy or accessibility until later.

Senior level
Stabilizes proactively and maintains control through multiple incident waves.
Chooses targeted upgrades with clear reasoning.
Balances reliability, performance, privacy, accessibility, and battery with minimal waste.

Staff level
Treats the system as an ecosystem with interacting constraints.
Establishes a resilient baseline early and prevents cascades.
Uses observability, safeguards, and mitigation nodes intentionally.
Explains trade offs clearly and proposes improvements to the simulation or architecture.
Translates game interventions into real world Android engineering and organizational practices.

OPTIONAL CODE TASK IDEAS

Add a new incident type and mitigation.
Add a new node with tier effects and costs.
Improve review wave logic and explain the impact.
Introduce deterministic seeded randomness and add a replay mode.

SECURITY

See SECURITY.md for the reporting process and guidance. Do not include secrets in issues or pull requests.

CONTRIBUTING

See CONTRIBUTING.md for setup instructions and contribution expectations.

CODE OF CONDUCT

See CODE_OF_CONDUCT.md for community standards.

LICENSE

Apache License 2.0 See LICENSE and NOTICE files.
