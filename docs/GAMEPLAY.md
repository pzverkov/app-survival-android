# Gameplay

## How to play
Start a run
1) Pick a preset (Junior Mid / Senior / Staff / Principal), then press **Start**.
2) Place components, link dependencies, upgrade, and fix tickets to keep the app alive.

Deterministic seeds (reproducible runs)
- Set a **Seed** (number) and press **Reset** to start a deterministic run.
- Press **Daily** to use a deterministic UTC date seed so multiple people can compare the same challenge.
- The current seed is shown next to the controls.

Scoring
- You earn **Score** continuously while the run is alive.
- Score rewards stability (low failure rate / ANR risk / jank / latency) and “realism” metrics (privacy, security, accessibility, regional compliance).
- **Architecture debt** reduces scoring (because messy graphs are expensive in reality too).

Incidents, tickets, and postmortems
- Incidents are appended to the **Incidents** log.
- When a run ends, a **Postmortem** appears with a short summary and key metrics.
- Use **Copy run JSON** to export a structured run report (seed, duration, score, end reason, etc.).

Local scoreboard
- The game stores top runs in your browser (**localStorage**) under `asr:scoreboard:v1`.
- The **Scoreboard (local)** card shows your best runs (final score, preset, debt, rating, duration, seed).
- Use **Clear** to wipe it.

Profile and achievements
- Open **Profile** to view your achievement progress per preset.
- Achievements can be visible or **hidden** (shown as “Hidden achievement” until unlocked).
- Achievements use tiers: **Bronze / Silver / Gold**. Higher tiers require tighter constraints and cleaner stabilization.

Capacity and pacing
- Capacity recovers faster mid-run to avoid “stagnation valley” after the first incident waves.
- Under heavy backlog pressure, recovery improves slightly to prevent runaway death spirals while still punishing neglect.
- Tactical purchases exist to recover from spikes, but they are designed as utility (bounded, non-stacking, scaling cost) rather than permanent compounding power.

Unlockable shop items (achievement-gated)
Some shop items are unlocked via achievements and are tuned to avoid snowballing:
- Energy drink: temporary regen boost, **non-stacking**, with **increasing cost** per use.
- Incident shield: **single charge max**, expensive, mitigates the next incident spike rather than deleting risk entirely.

Architecture rules, debt, and refactors
See docs/ARCHITECTURE_RULES.md for the layer rules, architecture debt, refactor quests, and the refactor roadmap.
