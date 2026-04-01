# UI

## UI and experience

- Material 3 theming: System, Light, Dark theme modes with persisted preference. Native controls follow color scheme. Browser theme color follows the active theme.

- Sparklines: Inline SVG sparklines on key metric cards (rating, failures, jank, heap) show a rolling 60-second trend history. Sparklines only sample while the simulation is running and reset on game reset.

- Combo indicator: An orange "COMBO x1" pill appears next to the score card when a ticket-fix combo is active (+20% score for 30 seconds).

- Tamper badge: A red "Tampered" pill appears next to the scoreboard header when integrity checks detect modified localStorage data or suspicious runtime state changes.

- Performance-conscious UI: UI updates are scheduled and throttled to reduce DOM churn and GC pressure. Large lists avoid unnecessary re-render work.

- Responsive dashboard: Mobile-first layout with a bottom sheet sidebar on narrow screens and a wider dashboard on desktop. Backlog and incident panels scale to fit without clipping.

## Accessibility

- Skip link: "Skip to dashboard" link visible on keyboard focus, targets the main content area.
- Form labels: All select elements (preset, component type, language, theme) have associated `<label>` elements.
- ARIA labels: Zoom buttons, seed input, and canvas have explicit aria-labels. Metrics grid uses `aria-live="polite"` for dynamic announcements.
- Reduced motion: `prefers-reduced-motion` media query disables all animations and transitions globally.
