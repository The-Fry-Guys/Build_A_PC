# Build_A_PC
Project 3 for CST438 Software Engineering

## How to Setup Expo for development

- In Android Studio SDK Manager
  - Install Android SDK Platform 36 (Android 16)
  - Install SDK Build-Tools
  - Install Android Emulator
  - Install Android SDK Platform-Tools (includes adb)
  - (note that many of these may already be installed)

- In Android Studio Device Manager
  - Create a newer Pixel Device (I am using Pixel 9)
  - Start the emulator (not connected to any app)

- From /client, run:

1. 
```bash
adb devices
npx expo run:android
```
(note that adb devices may not work first try, contact Austin for help if you have issues)
(i had to add 
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```
to ~/.zshrc or create (~/.config/zsh/conf.d/android-sdk.zsh and add it there)
)

2. run:
```bash
npx expo start --web
```

3. Using npx expo start will work once the other two have been run once

## How to Setup Spring Boot for development

- From /api
  - Use Java 21 and supply `DB_USER` and `DB_PASSWORD` through your shell or deployment secrets.
  - Run `./gradlew bootRun`.
  - Run `curl -i http://localhost:8080/api/v1/` for API information.
  - Run `curl -i http://localhost:8080/api/v1/health` for database readiness (200 UP or 503 DOWN).
  - Run `curl -i 'http://localhost:8080/api/v1/parts?page=0&size=10'` for a page of database parts.
  - Run `curl -i http://localhost:8080/api/v1/parts/{id}` for one part by UUID.

The datasource uses the Supabase PostgreSQL pooler configured in
`api/src/main/resources/application.properties`. For this shared session pooler,
`DB_USER` must include the project reference (typically `postgres.<project-ref>`).
Copy the host and username from the Supabase dashboard's Connect > Session pooler
dialog; see the [Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres).
An `ENOIDENTIFIER` / `no tenant identifier provided` response means the pooler could
not identify the target project; check the supplied shared-pooler username first.
Hibernate does not create or alter the
remote schema. The existing `catalog_parts` table must have `id`, `category`, `name`,
`price`, and `created_at` columns as described in `docs/erd.md`.

Collection pages contain `content`, `page`, `size`, `totalElements`, and `totalPages`.
Page indexes start at 0; page size defaults to 10 and must be between 1 and 100.
Catalog results sort by ID. An empty or out-of-range page returns empty content;
invalid paging parameters return 400 Problem Details. See `docs/openapi.yaml` for
the implemented routes and planned authenticated endpoints.

### API tests

Each running API instance uses at most 3 database connections and maintains a minimum
of 1 idle connection. Both the local test profile and the Supabase integration tests
limit their pools to 1 connection, with no minimum idle connections. The Supabase
connection check reuses the read-only transaction's connection. These limits apply
per application context, so multiple running instances still share Supabase's total
session capacity. Restart existing API processes to apply the new settings.

From `/api`, run `./gradlew test`. Catalog and HTTP contract tests use an isolated H2
database in PostgreSQL mode and require no Supabase credentials.
`AccountRepositoryTests` instead requires the separately initialized local PostgreSQL
database at `localhost:5433/buildapc_test` (user `buildapc`, password `local-test-only`);
it tests the committed SQL schema and rolls back its writes. Run only those tests with
`./gradlew test --tests com.example.demo.AccountRepositoryTests`.
The HTTP tests exercise the actual controllers and JPA queries. They also verify that a database outage returns 503 without connection details.

To verify the actual Supabase connection, supply `DB_USER` and `DB_PASSWORD` through
your existing secret mechanism and run `./gradlew supabaseTest`. This separate,
explicitly invoked task verifies the PostgreSQL driver, Supabase hostname, connection
validity, `SELECT 1`, and a bounded catalog repository query. It uses read-only
transactions, disables schema changes and SQL initialization, and works with an empty
catalog. It fails if credentials, network access, or the expected schema are unavailable.
No test sources an environment file. Passing the H2 tests alone does not prove that
the remote Supabase connection works.

## GitHub OAuth configuration (step 1)

The auth contract is in `docs/openapi.yaml`: `POST /api/v1/auth/github` accepts
`{ code, codeVerifier, redirectUri }` and returns `{ token, user }`;
`GET /api/v1/me` requires our API-issued Bearer JWT. These endpoints are planned,
not implemented yet. Database persistence, JWT validation, CORS enforcement, and
login screens will be added in later steps.

1. Copy the root `.env.example` to `.env`, and `client/.env.example` to `client/.env`.
   Both local files are ignored by Git. Fill in your database settings; the root
   template uses local Postgres, while `DB_URL` can also point to Supabase.
2. Register two GitHub **OAuth Apps** under GitHub Settings → Developer settings →
   OAuth Apps. Use homepage `http://localhost:8081` for local development. Register
   callback `http://localhost:8081/auth` for the web app and `client://auth` for the
   Expo Android app. Keep the existing Expo scheme `client` in `client/app.json`.
   Separate registrations accommodate GitHub's single-callback restriction documented
   at https://docs.expo.dev/guides/authentication/#github (the course appendix says
   multiple callbacks are supported).
3. Put each registration's client ID and secret in the corresponding root
   `GITHUB_WEB_*` or `GITHUB_ANDROID_*` variables. Copy only the client IDs into
   the matching `EXPO_PUBLIC_GITHUB_*` variables in `client/.env`.
4. Generate the API signing key with `openssl rand -base64 32` and set
   `APP_JWT_SECRET_BASE64` locally. Keep the default one-hour TTL (`PT1H`). Never
   place client secrets or signing keys in `EXPO_PUBLIC_*` variables.
5. Set `EXPO_PUBLIC_API_URL` to the API base URL including `/api/v1`. Android
   emulators use `http://10.0.2.2:8080/api/v1`; physical devices need the computer's
   reachable LAN address. Web uses `http://localhost:8080/api/v1`.

From `api/`, `bash load_env.sh` loads the root `.env` before starting Spring Boot.
Expo loads `client/.env` when started from `client/`. Docker Compose keeps its
existing local database configuration; it does not yet pass the new OAuth settings.

The configured web and Android redirect URIs define the future exact allowlist:
the API will select the matching server-owned credentials and reject other URIs.
The browser origin allowlist defaults to `http://localhost:8081` via
`APP_CORS_ORIGINS`; native callbacks are not browser CORS origins. Production will
need separate callback registrations/configuration and an explicit HTTPS origin.
No refresh tokens or account linking are part of this increment.

## Database schema reference

The existing hosted Supabase schema is documented in [docs/erd.md](docs/erd.md),
based on the team's 2026-11-09 export. It includes current defaults, nullable fields,
category values, foreign-key behavior, and differences from the planned auth schema.
The export is context only; do not run it as a migration or recreate hosted tables.
