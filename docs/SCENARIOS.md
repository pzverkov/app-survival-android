# Scenarios (Release Trains)

Release Trains are scripted, repeatable shifts. Each one pins the seed, preset,
and incident timeline, so your decisions — not the RNG — decide the outcome.
Finish the shift, and the end-of-run modal shows a postmortem grade.

Three launch scenarios are shipped with v0.3.0.

## Android 16 Upgrade Week

- **Preset**: Senior
- **Brief**: A fresh API drops mid-shift. Compat pressure spikes, a cert rotation
  wobbles the network, and an a11y regression slips in. Keep rating ≥ 4.3 at end
  of shift.
- **Scripted incidents**: SDK scandal (1:00), cert rotation (3:00), a11y
  regression (5:00), memory leak (7:00).
- **Bonus on success**: ×1.35.

## EU DMA Audit

- **Preset**: Staff
- **Brief**: Regulators open a Digital Markets Act audit; pressure lands on EU
  first and drags UK behind it via the coupling gate. Keep EU compliance ≥ 80
  by the end of the shift.
- **Scripted incidents**: region outage (1:30), SDK scandal (3:30), push abuse
  (5:30).
- **Bonus on success**: ×1.40.

## SDK Cascade Night

- **Preset**: Principal
- **Brief**: Three 3rd-party SDKs tank privacy trust in quick succession, then a
  memory leak jams WorkManager. Close the shift with zero open crash tickets.
- **Scripted incidents**: SDK scandal (1:30), SDK scandal (3:00), memory leak
  (4:00), SDK scandal (5:00).
- **Bonus on success**: ×1.45.

## How scenarios work

- The scenario's seed + preset are applied at load. The scripted incident
  timeline is played back at exact ticks; `maybeIncident` skips its normal
  random roll on those ticks, so the same scenario always plays the same
  timeline regardless of which seed you started from.
- Player actions still differ across runs — fix different tickets, upgrade
  different components — so outcomes differ.
- Completion and score are stored in `localStorage` under `asr:scenarios:v1`.

See `src/scenarios.ts` for the current definitions and
[GAMEPLAY.md](./GAMEPLAY.md) for the broader end-of-run grading mechanics.
