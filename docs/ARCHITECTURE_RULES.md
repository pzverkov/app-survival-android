# Architecture rules and debt

Architecture rules and debt (Clean Architecture “gameified”)
- The linker enforces a layered model (UI → VM → DOMAIN → REPO → DATA). “Sidecars” (OBS/FLAGS/A11Y) can be depended on from anywhere.
- Breaking the rules creates **ARCHITECTURE_DEBT** tickets and increases an **Architecture debt (0..100)** meter.
- Debt increases fragility and drags down the score until you pay it down.

Refactor quests (for ARCHITECTURE_DEBT tickets)
Architecture debt tickets come with refactor actions (quests) that cost budget and reduce debt:
- **ADD_BOUNDARY**: dependency inversion/interfaces at boundaries
- **MOVE_MAPPING**: push DTO/mapping to the proper layer, kill shortcuts
- **SPLIT_REPO**: reduce blast radius by splitting “god repos.”
- **FEATURE_MODULE**: isolate transitive dependencies behind a module boundary

Targeted refactors
- For architecture debt tickets, you can select a specific illegal edge (upward dependency/layer skip) from a dropdown.
- If you don’t select an edge, the game auto-targets the “worst” violation.

Refactor Roadmap
- The **Refactor Roadmap** card suggests a high-signal sequence:
  1) Fix upward deps (ADD_BOUNDARY)
  2) Remove layer skips (MOVE_MAPPING)
  3) Reduce blast radius (SPLIT_REPO)
  4) Add module boundary (FEATURE_MODULE)
- **Apply next** applies the next step to the first open Architecture Debt ticket (when present).

Preset differentiation (Staff vs Principal)
- **Staff**: allows architecture violations but taxes you with debt + debt tickets; pragmatic cleanups are rewarded.
- **Principal**: blocks serious violations (upward deps / big skips) and rewards clean architecture more, but punishes debt harder (your multiplier shrinks with debt).
