# Gameplay

## How to play
Start a run
1) Pick a preset (Junior Mid / Senior / Staff / Principal), then press **Start**.
2) Place components, link dependencies, upgrade, and fix tickets to keep the app alive.

Scoring
- You earn **Score** continuously while the run is alive.
- Score rewards stability (low failure rate / ANR risk / jank / latency) and “realism” metrics (privacy, security, accessibility, regional compliance).
- **Architecture debt** reduces scoring (because messy graphs are expensive in reality too).

Incidents, tickets, and postmortems
- Incidents are appended to the **Incidents** log.
- When a run ends, a **Postmortem** appears with a brief summary, key metrics,
  and a **grade letter** (S → D) that rolls up time-to-mitigate,
  root-cause alignment, and prevention signals from the run's event stream.
- Use **Copy run JSON** to export a structured run report (seed, duration, score, end reason, etc.).

Tickets and the cross-check gate
- Signal-driven tickets (crash spike, jank, heap, etc.) now run through a
  cross-check gate. A ticket fires when its primary signal is corroborated by
  an independent signal (coverage drift, OBS tier, region pressure, etc.)
  **or** when the primary signal has been sustained for a preset-specific
  debounce window (3 ticks on Junior/Mid, 2 on Senior/Staff, 1 on Principal).
- Severity-3 signals (crash spike, ANR risk, security exposure) keep a direct
  escape hatch — they fire immediately on the primary signal.
- OBS tier ≥ 2 lowers the corroboration bar by one signal, so observability
  investment keeps paying back into incident response.
- Every gated ticket carries a human-readable `reason` string the UI can
  surface on hover.

Deterministic seeds (reproducible runs)
- Set a **Seed** (number) and press **Reset** to start a deterministic run.
- Press **Daily** to use a deterministic UTC date seed so multiple people can compare the same challenge.
- The current seed is shown next to the controls.

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
- **Burnout**: if capacity is crushed to zero three or more times within 90 seconds, a **BURNOUT** ticket spawns and saps regen until it is fixed. Treat it like any other ticket — fixing clears the penalty and grants a short adrenaline burst. This creates a real triage decision in incident-heavy runs.

Unlockable shop items (achievement-gated)
Some shop items are unlocked via achievements and are tuned to avoid snowballing:
- Energy drink: temporary regen boost, **non-stacking**, with **increasing cost** per use.
- Incident shield: **single charge max**, expensive, mitigates the next incident spike rather than deleting risk entirely.

Scenarios (Release Trains)
- Release Trains are scripted shifts that pin seed + preset + an incident
  timeline. Two players running the same scenario see the same incidents at
  the same ticks.
- Three launch scenarios ship with v0.3.0 — see [SCENARIOS.md](./SCENARIOS.md).
- Completed scenario runs earn a bonus multiplier (1.35×–1.45×) and are saved
  to `localStorage` under `asr:scenarios:v1`.

Challenges (daily and weekly)
- **Daily challenges** rotate by UTC date. Each has a fixed seed, preset, and constraint (e.g. "no refills", "zero debt at end", "rating >= 4.5"). Completing the constraint earns a bonus multiplier (1.15x-1.30x).
- **Weekly challenges** rotate on Mondays with harder constraints and higher bonuses (1.35x-1.40x).
- Click "Start daily" or "Start weekly" in the Overview tab to begin. Results are persisted locally.

Combo multipliers
- Fix 3 tickets within 60 seconds to trigger a **combo**.
- While a combo is active (30 seconds), score per tick is boosted by +20%.
- A "COMBO" indicator appears next to the score display.

Asymmetric scoring
- **Failure penalties**: Budget depleted = 0.70x multiplier. Rating collapsed = 0.50x multiplier.
- **Preset-specific bonuses** (shift complete only): Junior/Mid +15% for surviving, Senior +20% for zero refills, Staff +25% for zero debt, Principal +30% for flawless (zero incidents + rating >= 4.8).
- **Universal bonuses**: Clean desk (zero tickets) +10%, High rating (>= 4.8) +10%.

Tamper protection
- Scoreboard and achievement data are signed with HMAC-SHA-256. Editing localStorage entries directly will trigger a "Tampered" badge next to the scoreboard.
- Modifying game state (budget, score, rating) via the console while paused is also detected.
- Score sanity checks verify the final score does not exceed the theoretical maximum.

Architecture rules, debt, and refactors
See [ARCHITECTURE_RULES.md](./ARCHITECTURE_RULES.md) for the layer rules, architecture debt, refactor quests, and the refactor roadmap.
