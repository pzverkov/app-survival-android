# Roadmap

Intentionally small. Phase 1 shipped in v0.4 (action log + client-side replay
verification on each run end). The next two phases take the same log format
and move the trust boundary server-side.

## Phase 2: Cloudflare Worker scoreboard

**Goal:** a public, per-preset leaderboard where every entry has been
replay-verified on infrastructure the client cannot tamper with.

**Why now:** the action log format is already stable in v0.4, and every run in
`asr:runs:v1` contains exactly what the Worker needs. We are not re-deriving
the wire format; we are shipping the storage format directly.

**Shape:**

```
POST /run
  body: { seed, preset, actionLog, claimedScore, claimedRating, clientVersion }
  server:
    - re-runs replayActionLog() against a fresh GameSim on the Worker runtime
    - compares simScore to claimedScore
    - rejects if mismatch > epsilon
    - writes to KV keyed by preset + score (sorted)

GET /leaderboard?preset=SENIOR&limit=50
  server: returns top N from KV
```

**Infra (all free tier):**

- Cloudflare Workers: 100k requests/day, 10ms CPU/request.
- Cloudflare KV: 1GB storage, 100k reads/day, 1k writes/day.
- Deploy via Wrangler CLI or a GitHub Actions workflow on push to `main`.

**Implementation notes:**

- The Worker imports `src/sim.ts`, `src/subsystems.ts`, `src/actionlog.ts`
  unchanged. No code duplication. One source of truth for simulation rules.
- No `localStorage` or DOM access in those modules (they're already pure).
  Minor: `applyReward` calls `sim.budget +=` which is safe in Workers.
- Keep the Worker stateless beyond KV. No sessions, no auth in Phase 2.
  Anonymous submissions with the score attached, Worker validates.
- Rate limit per IP on `POST /run`. Workers provides `cf.clientTcpRtt` and
  colo metadata natively; simple in-memory bucket per IP per Worker instance
  is enough for v1 (a determined attacker bypasses it, but the price of
  submitting a forged log is still running the real sim to produce valid
  rand sequences).

**Client changes:**

- Add a "Submit to leaderboard" button on the end-of-run modal, behind an
  opt-in (disabled by default, so offline-only players aren't surprised).
- New local setting `asr:submit-enabled:v1`.
- A `LeaderboardCard` next to the existing local scoreboard.

**Out of scope for Phase 2:**

- Accounts / auth. Anonymous-only leaderboard.
- Anti-duplicate-submission.
- Historical browsing beyond top-N.

## Phase 3: Hardening

Once Phase 2 is live, the attack surface shifts from "edit localStorage" to
"craft a valid action log that replays to a high score". That's genuinely
harder — the attacker has to produce a sequence of game-legal moves — but not
impossible. Phase 3 closes the remaining gaps.

### 3.1 Replay protection

- Generate a per-session client token on first run (HMAC of `seed + startTs`
  signed with a public constant). Embed it in every submission.
- Worker rejects duplicate `(seed, clientToken)` pairs. Forces a new session
  to replay a given scripted timeline.

### 3.2 Rate limiting and anomaly flags

- Per-IP hard cap on POST /run (e.g. 60 per hour).
- Per-seed soft cap (e.g. 10 unique clients, flag the 11th).
- Flag submissions where the replayed timeline contains impossibly fast
  action sequences (e.g. 30 actions in tick 0). Note: this is a signal, not
  a block — legit speed runs cluster actions at t=0.

### 3.3 Audit log

- Every accepted submission writes an audit row to a second KV namespace:
  `{ seed, claimedScore, ip_hash, userAgent_hash, acceptedAt }`.
- Public dashboard (read-only) for researchers.
- 90-day retention.

### 3.4 Known limitations (never closed)

- A sufficiently motivated attacker can still run the full sim offline to
  produce legal action logs optimized for score, then submit. The game is
  small; this will happen. The defense is client entertainment, not
  anti-cheat rigor. If leaderboard integrity ever matters more, the real
  fix is moving sim execution server-side (player submits *actions* to the
  Worker in real time and the Worker owns the only GameSim instance).

## Not planned

- Accounts, OAuth, Firebase.
- Realtime multiplayer.
- Server-side sim execution (too expensive; see "Known limitations" above).
- NFT / token anything.
