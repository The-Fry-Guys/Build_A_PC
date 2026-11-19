# Sprint 3 Retro

Snapshot: 2026-11-19, before final sprint review/merge.

## Planned vs. done

| Current milestone scope | Stories | Difficulty units |
|---|---:|---:|
| Assigned / tracked | 11 | 22 |
| Closed on the board | 7 | 13 |
| Still open | 4 | 9 |

Source: [Sprint 3 milestone](https://github.com/The-Fry-Guys/Build_A_PC/milestone/3),
using existing issue difficulty labels and excluding pull requests. This reconstructs
current scope, not the original sprint-start commitment. Closed status is not an
independent acceptance check; implementation on this branch does not count as merged work.

Closed stories: [categories #36](https://github.com/The-Fry-Guys/Build_A_PC/issues/36),
[admin power #34](https://github.com/The-Fry-Guys/Build_A_PC/issues/34),
[set budget #26](https://github.com/The-Fry-Guys/Build_A_PC/issues/26),
[parts within budget #25](https://github.com/The-Fry-Guys/Build_A_PC/issues/25),
[account deletion #11](https://github.com/The-Fry-Guys/Build_A_PC/issues/11),
[user profile #10](https://github.com/The-Fry-Guys/Build_A_PC/issues/10), and
[public API #9](https://github.com/The-Fry-Guys/Build_A_PC/issues/9).

On the auth branch, Google web login was checked in a real browser. Android Google
sign-in, backend ID-token verification, logout safeguards, and contract/diagram updates
are implemented but not yet merged. Verification passed 208 backend and 155 client tests;
TypeScript and lint passed with no errors. Client line coverage was 98.16% across the
configured coverage files, not the whole project. Backend tests needed temporary
low-memory JVM settings and a preloaded Mockito agent on Windows.

## Carried over

- [OAuth #3](https://github.com/The-Fry-Guys/Build_A_PC/issues/3): size 1.
- [Build PCs #4](https://github.com/The-Fry-Guys/Build_A_PC/issues/4): size 4.
- [Mobile/web #7](https://github.com/The-Fry-Guys/Build_A_PC/issues/7): size 3.
- [Coverage #32](https://github.com/The-Fry-Guys/Build_A_PC/issues/32): size 1.

Reconcile these four open stories at sprint close. Android Google still needs signing-key
registration and interactive verification. APK prebuild passed, but the Windows APK attempt
stopped because the Android SDK/adb was not found. Production and the complete shared
web/Android compatibility demo were not verified by this auth work.

## What we learned

Provider setup and local tooling are part of delivery. Passing mocked OAuth tests does not
prove that an APK's package/signing key is registered. The Linux-to-Windows move also exposed
WSL-versus-Windows Java differences, Docker image/runtime failures, and a paging-file limit.

## Change for next sprint

Make a fresh-clone web/Android demo an early acceptance check for each carried-over story:
record its estimate, verify teammate tooling and signing setup, then link its test/demo
evidence before requesting review. Do not leave device verification until sprint close.
