# Session hydration fix

The session hook used the live store snapshot for both normal client rendering
and server/hydration rendering. Expo can restore the root provider before a
Suspense-wrapped Home route hydrates, making the browser render signed-out or
signed-in content against the server's loading indicator.

Added a cached, frozen loading snapshot returned by `Session.getServerSnapshot`.
The hook supplies this as useSyncExternalStore's third argument. Server rendering
and initial hydration now agree; React switches to the latest live state after
hydration. No hydration warnings are suppressed and SSR remains enabled.

Added two DOM regression tests using the actual SessionProvider and session hook:
render server HTML, finish restoration before hydration (signed out and signed
in), then hydrate and assert no recoverable hydration errors and the correct
final interface.

Validation:

- All 43 tests across 6 suites passed.
- `npx tsc --noEmit` passed with the dependencies now installed locally.
- Full Expo lint still fails on the existing `react-hooks/set-state-in-effect`
  error in `src/hooks/use-color-scheme.web.ts:11`. Test require-import warnings
  are also reported. No unrelated hook or lint configuration was changed.
- Real browser reload after this fix remains a user verification step.

React's server snapshot contract:
https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
