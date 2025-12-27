# UI

## UI and experience

- Material 3 theming: System, Light, Dark theme modes with persisted preference. Native controls follow color scheme. Browser theme color follows the active theme.

- LiquidGlass: Optional glass surfaces with blur and saturation when supported. Disabled automatically when unsupported and respects reduced transparency preferences.

- Performance-conscious UI: UI updates are scheduled and throttled to reduce DOM churn and GC pressure. Large lists avoid unnecessary re render work.

- Responsive dashboard: Mobile-first layout with a bottom sheet sidebar on narrow screens and a wider dashboard on desktop. Backlog and incident panels scale to fit without clipping.

LiquidGlass note: When LiquidGlass is enabled, selected/active blocks should remain fully visible in scroll containers (avoid clipping by not applying overflow hidden to the selected container).
