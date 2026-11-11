# Admin tools — PRD-6

The Admin navigation item appears for accounts whose current profile has role `ADMIN`.
The shared Expo screen supports web and Android, with Users and Parts sections, search,
pagination, and expandable read-only records. It shows catalog fields only, including missing prices.

This release targets PRD-6's view/search acceptance criteria. PRD-15 and success measure S3
still require later editing, deletion, creation/restoration work. Category specifications are
also outside this release.

## Authentication and permissions

The feature builds on auth commit `f168eb7081433b75472d4aad3bc0428f2d22953b`.
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

The imported auth implementation currently supports GitHub sign-in on **web**. Its native
GitHub login and native account panel are still stubs owned by the auth work. The Android
admin screen uses the same session interface and encrypted token store; interactive Android
sign-in and its final smoke test depend on that native auth work being completed.

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

Tests were written **without being executed by the implementation agent**, at the user's request.
Passing tests, coverage values, accessibility results, and device behavior remain unverified
until these commands are run. Static compilation does not establish that the tests pass.

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

From the repository root, remove the disposable stack afterward:

```sh
docker compose --env-file /dev/null -f compose.e2e.yml down --volumes
```

The `e2e` profile must be absent from production. A startup guard refuses `e2e` combined with
`prod`/`production` or a hosted database, and an integration test verifies the token hook is
absent in a normal application context.

### Manual web and Android checks

1. Sign in as an ordinary account: Admin is hidden and a direct `/admin` visit reveals no records.
2. Promote that account through trusted SQL, refresh the session, and open Admin.
3. Search Users by email, display name, punctuation, and UUID. Check empty results and multiple pages.
4. Search Parts by name/category/UUID; open a record with a missing price.
5. Confirm loading and retry behavior when the API is unreachable.
6. Demote the account while its JWT remains valid: the next admin request must return 403.
7. Log out or change accounts: no previous user's results remain visible.
8. Repeat on an Android development build once native sign-in is connected. Use a reachable API
   base URL ending in `/api/v1` (`10.0.2.2` for an emulator's host, or a LAN/hosted URL for a device).

The admin acceptance test supplements the separately required PRD-3 vertical-slice test.
