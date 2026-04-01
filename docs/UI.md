# UI

## Design system

- Material 3 theming: System, Light, Dark theme modes with persisted preference. Native controls follow color scheme. Browser theme color follows the active theme.

- Design tokens: Centralized typography scale (6 levels from 11px labels to 24px hero), severity colors (low/medium/critical with background and border variants), feedback colors (success/warning/error/info/combo), and spacing scale (4px to 32px). Tokens adapt between dark and light themes.

## Dashboard layout

- Hierarchical metrics: Primary metrics (Budget, Rating, Shift, Score) always visible in a 2-column grid with left border accent. System Health panel (Failures, ANR, Latency, Coverage, Debt, Battery) is collapsible, open by default. Android Internals panel (Time, Jank, Heap, GC/OOM) is collapsed by default. Uses native `<details>` elements for accessibility.

- Sparklines: Inline SVG sparklines on key metric cards (rating, failures, jank, heap) show a rolling 60-second trend history. Sparklines only sample while the simulation is running and reset on game reset.

- Ticket cards: Left border accent colored by severity (teal/amber/red). Fix button uses filled style (primary action), Defer uses outlined (secondary). Deferred tickets have reduced opacity and dashed border.

## Canvas

- Category-based component colors: Core pipeline (blue), Data layer (teal), Security (purple), Sidecars (amber), Accessibility (green).

- Health rings: Arc around each component fills clockwise. Green (>70%), yellow (30-70%), red (<30%). Only shown when health is below 95%.

- Tier glow: Tier 2 gets a subtle blue glow ring. Tier 3 gets a bright golden glow ring with a small tier badge in the bottom-right corner.

- Dot grid background: Subtle dot pattern for spatial reference. Moves with pan, scales with zoom.

- Drag feedback: Cursor changes to `grabbing` while dragging a component.

## Modals

- Unified modal system: All modals (Welcome, Profile, End-of-run, Refactor) use shared `openModal()`/`closeModal()` functions with focus trapping and focus restore.

- Welcome modal: Appears on first visit only. Brief game overview with 4-step quick start guide. Skipped in E2E mode. Dismissed via button or backdrop click, tracked in localStorage.

- End-of-run celebration: Outcome-dependent header (green/orange/red), hero score display at 48px, score breakdown with multiplier and bonuses, key stats grid, Play Again and Replay Seed actions.

## Interaction feedback

- Micro-animations: Budget flashes red on large drops (>$50/tick). Rating flashes red on significant drops (>0.15/tick). Incident overlay slides in from bottom. All animations respect `prefers-reduced-motion`.

- Combo indicator: Orange "COMBO x1" pill appears next to score when a ticket-fix combo is active (+20% score for 30 seconds).

- Tamper badge: Red "Tampered" pill appears next to scoreboard header when integrity checks detect modified data.

## Accessibility

- Skip link: "Skip to dashboard" visible on keyboard focus.
- Form labels: All select elements have associated `<label>` elements.
- ARIA labels: Zoom buttons, seed input, and canvas have explicit aria-labels. Metrics grid uses `aria-live="polite"`.
- Focus trapping: Tab key cycles within open modals. Focus is restored to the triggering element on close.
- Reduced motion: `prefers-reduced-motion` media query disables all animations and transitions globally.

## Responsive design

- Mobile layout: Canvas takes 38% of viewport height (dashboard gets 62%) on screens under 900px.
- Touch targets: Canvas HUD buttons enlarged to 44x44px on screens under 520px.
- Safe areas: `viewport-fit=cover` with `env(safe-area-inset-bottom)` padding for iOS home indicator and Android gesture navigation.
- Compact typography: Font sizes scale down at 480px breakpoint. Modals constrain width to `calc(100vw - 16px)`.
