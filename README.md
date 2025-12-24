# app-survival-android (web game, TS + Vite)

A systems-thinking simulation game inspired by real Android production incidents.

## Run

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Controls

- **Select mode**: click a node to select it; drag to move.
- **Link mode**: click **source** node → click **destination** node.
- **Unlink mode**: click **source** node → click **destination** node.

## Gameplay

Keep **Budget** above $0 and **Rating** above 1.0★ while incidents and rising load try to melt your app.

Recommended starter graph:

- `UI → VM → Domain → Repo → Cache → DB`
- `Repo → Net`
- `Work → Repo`
- Add `Observability` + `Feature Flags` to reduce blast radius.

## Roadmap (next 3 “Android-real” upgrades)

1. **Frame budget + jank**: introduce a 60fps frame scheduler, jank meter, frame timeline.
2. **Main thread strictness**: serialize UI/VM/Domain and add “IO on main” -> ANR spikes.
3. **Memory/GC realism**: heap meter, GC pause events that increase jank, OOM crash storms.