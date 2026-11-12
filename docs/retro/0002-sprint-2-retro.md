# Sprint 2 Retro

## Planned vs. done

- **Planned/tracked:** 4 stories, totaling 12 difficulty units: build PCs (#4, size 4),
  GitHub OAuth (#40, size 2), admin controls (#8, size 3), and view PCs (#6, size 3).
- **Completed/merged:** 1 of 4 stories (25%), totaling 4 of 12 difficulty units:
  build PCs through PR #39. The other 3 stories (8 difficulty units) have open PRs
  #41, #42, and #43; implementation in an open PR is not counted as completed.

These counts are a snapshot reconstructed from the four PRs assigned to the
[Sprint 2 milestone](https://github.com/The-Fry-Guys/Build_A_PC/milestone/2)
and their linked issues. Difficulty units use the issues' existing labels, not
new estimates. The original sprint-start scope was not recorded here; Google,
Docker, and other supporting work are not additional stories in this count.

- **Done on this branch:** Docker setup, Supabase catalog queries, GitHub sign-in
  implementation for web and Android, read-only admin search, health checks,
  CI fixes, Dependabot, and architecture/security documentation. Verification passed
  135 backend tests, 104 client tests, and 4 browser tests. Backend line coverage was
  95.69%; configured client coverage was 93.51%. These results do not establish that
  every feature has merged or passed manual device testing.

## Carried over

Three tracked stories remain open pending review/merge: GitHub OAuth, admin controls,
and view PCs. Recheck their status at sprint close before finalizing carryover.

Google sign-in on both platforms, manual Android sign-in/admin checks, and verification
of the complete compatibility vertical slice remain. Account editing/deletion and
admin mutations are later feature work. Secret scanning and Docker image building
in PR CI also remain outstanding.

## What we learned

OAuth, navigation, and admin tools need to be checked together. Browser tests found
accessibility and logout issues that unit tests missed. Passing isolated database
tests does not verify the live Supabase connection or Android behavior.

## Change for next sprint

Record story counts and sizes at sprint start, integrate changes earlier,
and complete Google sign-in plus a shared web/Android vertical-slice demo before
adding more features.
