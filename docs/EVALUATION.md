# Evaluation

## Evaluation exercise

Goal
Maintain rating at or above 4.2 for 3 to 5 minutes under incident and policy pressure, while keeping coverage and compliance under control.

Reproducibility and sharing
- Use a fixed **Seed** (or the **Daily** seed) so reviewers can reproduce the same run.
- At the end of a run, use **Copy run JSON** and include it with your notes (or paste it in an issue) to make feedback concrete.

Suggested format
1 Briefing
2 Stabilization run
3 Incident wave run
4 Debrief
5 Optional code task in the simulation engine

Evaluation focuses on diagnosis quality, prioritization, trade off reasoning, and the ability to map interventions to real Android production practices.

Level differentiation lens

Mid-level pattern
Stabilizes after issues become visible
Uses basic metrics but misses second-order interactions
Optimizes one axis while neglecting privacy, accessibility, compliance, or test debt

Senior-level pattern
Stabilizes proactively through multiple incident waves
Chooses targeted upgrades with explicit reasoning
Balances reliability, performance, privacy, accessibility, battery, coverage, and compliance with minimal waste

Staff level pattern
Treats the system as an ecosystem with interacting constraints and multi-region policy outcomes
Establishes a resilient baseline early and prevents cascades
Uses observability, feature flags, and safeguards intentionally and explains why
Makes crisp trade-off calls and communicates impact to stakeholders
Proposes improvements to the simulation and maps them to an Android org operating model

Principal level pattern
Stabilizes early, then invests in preventative controls and guardrails to reduce whole classes of incidents
Keeps multi-region rollout outcomes in mind and avoids "local" optimizations that create global risk
Explains what automation, standards, and release process constraints would prevent the same failures at scale
