# Admin tools — PRD-6

The Admin navigation item appears for accounts whose current profile has role `ADMIN`.
The shared Expo screen supports web and Android, with Users and Parts sections, search,
pagination, and expandable read-only records. It shows catalog fields only, including missing prices.

This release targets PRD-6's view/search acceptance criteria. PRD-15 and success measure S3
still require later editing, deletion, creation/restoration work. Category specifications are
also outside this release.

## Authentication and permissions

The feature integrates the GitHub OAuth implementation through commit `ff859c7`.
`GET /api/v1/me` supplies the current profile to `useSession()`. The API validates its own
bearer JWT, then checks the identified user's **current database role** for admin requests.
An old `ADMIN` claim cannot preserve access after demotion. Missing/invalid tokens return
401; authenticated callers without current admin access return 403. If the role cannot be
checked because the database is unavailable, access is denied.

Users are loaded from `GET /api/v1/admin/users`; parts reuse public `GET /api/v1/parts`.
Both accept `q`, `page`, and `size`. The API searches the database before pagination, using
literal case-insensitive substrings or an exact UUID. The client never downloads the complete
directory. Private responses use `Cache-Control: no-store`; client caches are transient,
account-scoped, cancelled and removed when permissions or the account change.

GitHub sign-in is implemented on **web and Android**. The Android provider stays mounted
above navigation so the PKCE request survives the callback. Both platforms use the same
session interface; Android stores the API token in SecureStore. Interactive device sign-in
and the admin smoke test still need to be checked manually. See the README for the emulator
and standalone APK commands.

## Provision the first administrator

Keep the existing schema and `users.role` field. No `is_admin` column, role constraint, or role
editing endpoint is added. Newly created accounts continue to default to `USER`.

After the user signs in once, a trusted database maintainer runs the appropriate statement
in their database console, replacing the UUID placeholder. These statements are instructions,
not an application migration or automatic seed for hosted data.

```sql
UPDATE public.users SET role = 'ADMIN' WHERE id = '<existing-user-uuid>'::uuid;
-- Revoke access:
UPDATE public.users SET role = 'USER' WHERE id = '<existing-user-uuid>'::uuid;
```

Reload the website or foreground the app to refresh navigation after promotion. An admin
request after demotion returns 403 even with the same unexpired token. The client's Refresh
access button also reloads the current profile. No GitHub client secret or database password
belongs in the Expo application.

## Checks for the reviewer to run

After the user authorized execution, verification on 2026-11-11 passed: 135 backend tests,
104 Expo unit/component tests, and all 4 Playwright tests including accessibility checks.
After the Detekt cleanup, backend line coverage is 95.69% overall
(98.04% for the service/authorization/search gate), with zero Detekt findings.
Client line coverage was 93.51% over the files configured in Jest, with 76.02% branch coverage.
Both configured 70% coverage gates passed. TypeScript and lint passed with existing warnings.
Manual Android device testing and the separate live Supabase connection check remain outstanding.

API unit/integration tests use disposable Testcontainers Postgres and public test configuration.
They do not read the hosted database. A running Docker daemon and Java 21 are required:

```sh
cd api
./gradlew build --no-daemon --console=plain
```

This runs tests, generates JaCoCo reports, and enforces at least 70% line coverage on the service
and authorization/search logic. `supabaseTest` is intentionally separate and is not required here.

Client logic/component tests and configured 70% coverage threshold:

```sh
cd client
EXPO_NO_DOTENV=1 npm run test:coverage -- --runInBand
```

### Isolated web acceptance test

Use the dedicated compose stack, which has throwaway credentials, no persistent database volume,
and seeded admin/user/part fixtures. Stop another API using port 8080 first. This stack must
never be pointed at Supabase or deployed to Render. It requires no OAuth credentials.

From the repository root:

```sh
docker compose --env-file /dev/null -f compose.e2e.yml up --build -d
```

From `client/`:

```sh
npx playwright install chromium
EXPO_NO_DOTENV=1 npm run test:e2e
```

Playwright starts a dedicated Expo web server on port 8081, calls the e2e-only token endpoint,
and uses the actual web token store (`sessionStorage`, key `buildapc.appJwt`). It tests private
search, public parts, missing prices, logout, ordinary-user denial, and zero serious/critical
axe findings on admin pages. It does not log into GitHub or Google. API tests separately cover
revocation with an already-issued token.

The Appendix I auth test clicks Sign in with GitHub, checks the popup authorization
URL, callback, state, and S256 PKCE challenge, then closes it. The request is intercepted
before reaching GitHub; its public client ID is synthetic. Cancellation must not call
the API exchange. See [the test decision](adr/0003-github-popup-test-boundary.md).

From the repository root, remove the disposable stack afterward:

```sh
docker compose --env-file /dev/null -f compose.e2e.yml down --volumes
```

The `e2e` profile must be absent from production. A startup guard refuses `e2e` combined with
`prod`/`production` or a hosted database, and an integration test verifies the token hook is
absent in a normal application context.

### CI status

The teammate's Expo workflow checks TypeScript and exports Android/web bundles.
The existing API workflow builds/tests `api/` on Java 21; Detekt scans `api/src`.
The local workflow changes are uncommitted. The separate admin CI draft remains
untracked and is not enabled. Jest and Playwright currently require the commands above;
the teammate workflows do not run them.

### Manual web and Android checks

1. Sign in as an ordinary account: Admin is hidden and a direct `/admin` visit reveals no records.
2. Promote that account through trusted SQL, refresh the session, and open Admin.
3. Search Users by email, display name, punctuation, and UUID. Check empty results and multiple pages.
4. Search Parts by name/category/UUID; open a record with a missing price.
5. Confirm loading and retry behavior when the API is unreachable.
6. Demote the account while its JWT remains valid: the next admin request must return 403.
7. Log out or change accounts: no previous user's results remain visible.
8. Repeat on an Android development or standalone emulator build. Use a reachable API
   base URL ending in `/api/v1` (`10.0.2.2` for an emulator's host, or a LAN/hosted URL for a device).

The admin acceptance test supplements the separately required PRD-3 vertical-slice test.
