# Web color scheme lint fix

- Replaced the effect-driven hydration flag in `use-color-scheme.web.ts` with
  `useSyncExternalStore`, using stable client/server snapshot functions.
- Server rendering and hydration retain the light-theme fallback; after hydration
  the hook returns the live React Native color scheme. No lint rule disabled.
- Expo lint exits successfully: zero errors, eight existing require-import
  warnings in the DOM tests.
- TypeScript passes. All 43 tests across six suites pass.
- User confirmed the real web GitHub OAuth browser flow works. Android GitHub
  login remains planned work; this change does not implement it.
