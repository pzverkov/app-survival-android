/**
 * Action log + deterministic replay.
 *
 * Every public mutator on GameSim records an ActionLogEntry. Given the same
 * seed + preset + ordered log, a fresh sim re-runs identically and produces
 * the same sim-side score. This is the core of v0.4 replay verification and
 * the data format that future server-side validation (Phase 2) will consume.
 */

import { GameSim } from './sim';
import type { EvalPreset, ComponentType, RefactorAction } from './types';

export type ActionLogEntry = {
  /** Sim-side clock (seconds) when the action was recorded. */
  t: number;
  /** Monotonic sequence number within a single tick, for stable ordering. */
  seq: number;
  /** Discriminator. Matches the sim method name the action applies to. */
  kind: string;
  /** JSON-serializable args for the action. */
  args: unknown[];
};

export type ReplayInput = {
  seed: number;
  preset: EvalPreset;
  log: ActionLogEntry[];
  bounds: { width: number; height: number };
  /**
   * Optional: the tick count to stop replay at. When set, replay halts once
   * `sim.timeSec >= untilTimeSec`. Required for verifying a live run that
   * paused or otherwise stopped before endRun fired; otherwise replay runs
   * until endRun triggers at shift end, producing a different score than
   * the truncated live run.
   */
  untilTimeSec?: number;
};

export type ReplayResult = {
  simScore: number;
  rating: number;
  durationSec: number;
  timeSec: number;
};

/**
 * Re-runs a sim from scratch using the provided action log. Pure replay:
 * no network, no localStorage, no achievement rewards beyond what the log
 * records. Callers compare `simScore` to the live run's sim-side score.
 */
export function replayActionLog(input: ReplayInput): ReplayResult {
  const sim: any = new GameSim();
  sim.setPreset(input.preset);
  sim.reset(input.bounds, { seed: input.seed });
  // Suppress re-logging while we replay actions, otherwise the replayed
  // sim's actionLog would grow during verification.
  sim.suppressActionLog = true;

  // Stable ordering: by tick, then by seq within a tick.
  const ordered = input.log.slice().sort((a, b) => (a.t - b.t) || (a.seq - b.seq));

  let cursor = 0;
  const MAX_TICKS = 20000; // guard against pathological logs hanging CI
  let ticks = 0;
  while (ticks < MAX_TICKS) {
    // Apply every action scheduled for this exact tick (in seq order).
    while (cursor < ordered.length && ordered[cursor]!.t === sim.timeSec) {
      applyAction(sim, ordered[cursor]!);
      cursor++;
    }

    if (input.untilTimeSec !== undefined) {
      // When untilTimeSec is set, it's the sole stop signal: tick all the way
      // to that tick even if the sim has already ended mid-replay, since the
      // live run may have ticked past endRun too (the caller's for-loop
      // doesn't necessarily halt on running=false).
      if (sim.timeSec >= input.untilTimeSec) break;
    } else if (cursor >= ordered.length && (sim.lastRun || !sim.running)) {
      // No hard cap: stop when the log is exhausted and the sim has ended.
      break;
    }

    sim.tick();
    ticks++;
  }

  return {
    simScore: sim.score,
    rating: sim.rating,
    durationSec: Math.floor(sim.timeSec),
    timeSec: sim.timeSec,
  };
}

function applyAction(sim: any, entry: ActionLogEntry): void {
  switch (entry.kind) {
    case 'setPreset':               sim.setPreset(entry.args[0] as EvalPreset); break;
    case 'setRunning':              sim.setRunning(entry.args[0] as boolean); break;
    case 'setSelected':             sim.setSelected(entry.args[0] as number | null); break;
    case 'applyReward':             sim.applyReward(entry.args[0] as number, entry.args[1] as number); break;
    case 'addComponent':            sim.addComponent(entry.args[0] as ComponentType, entry.args[1] as number, entry.args[2] as number); break;
    case 'upgradeSelected':         sim.upgradeSelected(); break;
    case 'repairSelected':          sim.repairSelected(); break;
    case 'deleteSelected':          sim.deleteSelected(); break;
    case 'link':                    sim.link(entry.args[0] as number, entry.args[1] as number); break;
    case 'unlink':                  sim.unlink(entry.args[0] as number, entry.args[1] as number); break;
    case 'fixTicket':               sim.fixTicket(entry.args[0] as number); break;
    case 'deferTicket':             sim.deferTicket(entry.args[0] as number); break;
    case 'applyRefactor':           sim.applyRefactor(entry.args[0] as number, entry.args[1] as RefactorAction, entry.args[2] as string | undefined); break;
    case 'buyCapacityRefill':       sim.buyCapacityRefill(); break;
    case 'buyCapacityRegenUpgrade': sim.buyCapacityRegenUpgrade(); break;
    case 'hireMoreCapacity':        sim.hireMoreCapacity(); break;
    case 'buyRegenBooster':         sim.buyRegenBooster(); break;
    case 'buyIncidentShield':       sim.buyIncidentShield(); break;
    case 'buyBaselineProfile':      sim.buyBaselineProfile(); break;
    case 'buyR8':                   sim.buyR8(); break;
    case 'buyBundleSplit':          sim.buyBundleSplit(); break;
    case 'loadScenario':
      // Replay shouldn't re-reset the sim (that would wipe our in-progress
      // state). Just restore the scenario metadata and scripted incidents.
      sim.scenarioId = entry.args[0] as string;
      sim.scriptedIncidents = new Map(entry.args[3] as Array<[number, string]>);
      break;
    default:
      // Unknown kinds are silently ignored so the log format can evolve.
      break;
  }
}
