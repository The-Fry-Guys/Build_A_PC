# Demo script

Use test accounts and public fixture data. Prepare production web/Android builds,
the release tag, previous release, and a trusted operator for database role changes.
Production/device checks below remain manual and unverified.

## Lead with the vertical slice — PRD-3

On web, sign in, open a build, choose incompatible parts, show the compatibility
explanation, correct the selection, and reload the saved build. Repeat on Android.
**This required slice is not yet verified end to end.** Admin acceptance tests do
not replace it; build persistence/compatibility work remains with that feature.

## Admin tools — PRD-6

1. Sign in with GitHub as a regular user: Admin is hidden; direct entry is denied.
2. Use a pre-provisioned admin account: search Users, expand a record, paginate;
   search Parts and open a record with a missing price.
3. Have the operator revoke that account's admin role. With the same token, the
   next user-directory request must return 403. Log out; private results disappear.
4. Repeat the screen checks on Android. Google sign-in is still planned.

## Scenario cards

| Scenario | Demonstration |
| --- | --- |
| Ownership | User A attempts to delete user B's build; expect 403/404. Controller tests exist; verify against the deployed database before presenting. |
| Health and logs | Show `/actuator/health` and the corresponding request log. Request-ID logging is pending. |
| Rollback and forward | Follow the [runbook](runbook.md#roll-back-and-forward) on a test deployment; verify both releases. |
| Admin revocation | Perform step 3 without issuing a new JWT. |
| Secret leak | Walk through [rotation](runbook.md#rotate-a-secret) without displaying credentials. |
| Database outage | On the isolated stack only, stop `db`, show health/error behavior, restart `db`, and retry. Never interrupt shared Supabase. |

Evidence: [automated checks](admin-tools.md), [popup/PKCE test](../client/e2e/auth.spec.ts),
[architecture](architecture.md), and [security](security.md). The popup test does
not complete provider login; demonstrate real sign-in manually.
