# Systems

## Key concepts

Components represent Android subsystems and capability layers such as UI, ViewModel, Domain, Repository, Cache, DB, Network, WorkManager, Observability, Feature Flags, plus security and accessibility controls.

Actions represent user and system behaviors such as scroll, read, write, search, upload, and sync. Some actions can be satisfied via cache while others must hit DB or network.

Incidents simulate production failure modes, including traffic spikes, backend failures, background restrictions, regression waves, zero day advisory pressure, accessibility regressions, policy enforcement, memory leaks, regional outages, and ANR escalations.

Review waves simulate user sentiment and category votes. A fast app can still lose rating if privacy trust, accessibility, or compliance drifts below baseline.

## Production realism layers

These systems intentionally interact. There are no free lunches.

- FrameGuard: Frame budget and jank pressure. UI work that looks cheap on paper becomes expensive under load.

- MainThreadGuard: Main thread strictness and ANR style pressure. IO on the main creates a cascading failure risk.

- HeapWatch: Memory pressure, GC pauses, and OOM risk. High churn and image realism punish sloppy allocation patterns.

- TicketFlow: Open bug tickets with severity, impact, effort, and aging. Fixing consumes engineering capacity. Deferral is allowed but has compounding cost through support load and rating pressure.

- ZeroDayPulse: Zero-day advisory pressure tied to dependency exposure and mitigations. Unpatched exposure drags security posture and privacy trust quickly.

- PlatformPulse: Android platform churn and compatibility pressure across time. The device mix shifts, deprecations bite, and regression risk increases if you under invest in resilience.

- RegMatrix: Regional compliance scoring across EU, US, UK, IN, BR. Compliance is driven by privacy trust, security posture, accessibility, platform pressure, and active advisories.

- PolicyGates: Regional rollout freezes when compliance is critical. Frozen regions reduce effective traffic and earnings until you stabilize.

- Cascading failures: OOM crashes now spike ANR points (process restart stalls the main thread). When 3+ incidents fire within 60 seconds, compound damage applies (extra rating penalty and support load per additional incident). Play Integrity (ABUSE + AUTH tier ≥ 2) dampens IAP_FRAUD and CRED_STUFFING by 40%.

- CoverageGate: A simplified Android test coverage proxy. Coverage drifts down as complexity and churn rise. Below threshold increases regression risk and opens coverage debt tickets. A flaky-test-rate layer can mask regressions into prod even when coverage % looks healthy.

- CrossCheck (v0.3.0): Pure-function gate between signal detection and ticket creation. Requires corroborating signals (or preset-specific debounce) before firing severity ≤ 2 tickets. OBS tier ≥ 2 lowers the corroboration bar. Every gated ticket carries a human-readable reason string.

- BaselineProfile / R8 / App Bundle split (v0.3.0): One-time purchases that represent Android build-system investments. Baseline Profile reduces jank by ~15%; R8 by another ~8%; App Bundle split delivery (unlocks later) mitigates apk-size pressure on device.

- OnCall burnout (v0.3.0): When capacity is crushed to zero three or more times within 90s, a BURNOUT ticket spawns and saps regen until fixed. Forces a real triage decision in incident-heavy shifts.

- Release Trains (v0.3.0): Scripted scenarios layered on top of everything above. See [SCENARIOS.md](./SCENARIOS.md).

Presets adjust expectations:
- **Junior & Mid preset** is forgiving
- **Senior preset** penalizes low coverage meaningfully
- **Staff preset** hold a higher threshold and punish sustained debt
- **Principal preset** expects the strictest bar (higher effective threshold and heavier enforcement) to reflect org scale release risk

## Component metrics (Android terms)

Internally, the simulator tracks a few generic signals per component:

- **Capacity** (how much work it can process per tick)
- **Latency** (time cost for work)
- **Failure/exception rate**
- **Backlog** (queued work)
