# Build_A_PC
Project 3 for CST438 Software Engineering

## How to Setup Expo for development

- Install Node.js **22.13+ within 22.x**, npm, and **Java 21**.
- Windows: use Git Bash for `load_env.sh`; use your Windows Android SDK.
- From `client/`, install dependencies once (and after lockfile changes):

  ```bash
  npm ci
  ```

- In Android Studio SDK Manager
  - Install Android SDK Platform 36 (Android 16)
  - Install SDK Build-Tools
  - Install Android Emulator
  - Install Android SDK Platform-Tools (includes adb)
  - (note that many of these may already be installed)

- In Android Studio Device Manager
  - Create a Pixel 9 virtual device named exactly **`Pixel_9`**
  - Start the emulator (not connected to any app)

- From /client, run:

1. 
```bash
adb devices
npx expo run:android
```
(note that adb devices may not work first try, contact Austin for help if you have issues)
Find your SDK path in Android Studio → SDK Manager → **Android SDK Location**.
On Linux/macOS, add this to your shell configuration, using that actual path:

```bash
export ANDROID_HOME="/your/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"
```

On Windows, set `ANDROID_HOME` and add its `platform-tools` and `emulator`
directories to your user `Path`. Restart the terminal after changing these.

2. run:
```bash
npx expo start --web
```

3. Using npx expo start will work once the other two have been run once

### Standalone APK testing (Pixel 9)

Complete the Android SDK setup above and configure the root `.env` and
`client/.env` with your database, JWT, and GitHub OAuth settings first.
Each teammate runs the API on their own computer; Docker is not needed for this
build when using the team's hosted Supabase database.

1. Start **Pixel_9** in Android Studio → Device Manager.
2. In a terminal opened in `api/`, start the backend and leave it running:

   ```bash
   bash load_env.sh
   ```

3. In another terminal opened in `client/`, build, install, and open the app:

   ```bash
   npm run android:emulator:apk
   ```

4. Wait for the app to open, then test GitHub sign-in, restarting the app, and
   logout. This standalone build does **not** need Metro running.

The command targets Pixel_9 and permits local HTTP only to the emulator's host
address, `10.0.2.2`. It restores normal generated network settings afterward.
The APK is saved at `client/android/app/build/outputs/apk/release/app-release.apk`.
Rebuild with this command after code changes; this setup is for emulator testing,
not production or physical phones.

## How to Setup Spring Boot for development

- From /api
  - Use Java 21 and configure the root `.env` with database, JWT, and OAuth settings.
  - Run `bash load_env.sh` to load the environment and start the API.
  - Run `curl -i http://localhost:8080/api/v1/` for API information.
  - Run `curl -i http://localhost:8080/actuator/health` for database readiness (200 UP or 503 DOWN).
  - [Admin tools (PRD-6)](docs/admin-tools.md): provisioning, supported web/Android behavior, isolated test setup, and commands for reviewers.
  - Run `curl -i 'http://localhost:8080/api/v1/parts?page=0&size=10'` for a page of database parts.
  - Run `curl -i http://localhost:8080/api/v1/parts/{id}` for one part by UUID.

With the root `.env` configured, run `docker compose up --build` from `api/` to
start the API and local Postgres. Compose supplies JWT/OAuth settings from `.env`
and overrides database settings to use its container. For an image-only build,
run `docker build -f api/Dockerfile .` from the repository root.

API docs: [Swagger UI](http://localhost:8080/swagger-ui/index.html) displays the
handwritten contract at `/openapi.yaml`; SpringDoc's generated implemented routes
are at `/v3/api-docs`. See [the OAuth sequence](docs/auth-sequence.md).

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

The catalog and admin user directory accept `q`, `page`, and `size`:

- `GET /api/v1/parts?q=memory&page=0&size=10` searches public part names/categories.
- `GET /api/v1/admin/users?q=member&page=0&size=10` searches user email/display name;
  it requires an API bearer token and a current database role of `ADMIN`.
- Both directories also accept an exact record UUID in `q`. Private user results use
  `Cache-Control: no-store`.

These directory pages contain `content`, `page`, `size`, `totalElements`, and `totalPages`.
Page indexes start at 0; page size defaults to 10 and must be between 1 and 100.
Catalog results sort by ID. An empty or out-of-range page returns empty content;
invalid paging parameters return 400 Problem Details. See `docs/openapi.yaml` for
the implemented routes and planned authenticated endpoints.

The authenticated build controller exposes `GET /api/v1/builds`, `POST /api/v1/builds`,
`GET /api/v1/builds/{id}`, `PUT /api/v1/builds/{id}`, and `DELETE /api/v1/builds/{id}`.
Build listing is paginated with `page` and `size`,
and includes the authenticated user's builds at any stage, newest first.
Creation and replacement accept a build name and selected part IDs or quantities; detail
responses include the selected parts. Updates and deletion require ownership.
Admin mutations remain planned, as marked in OpenAPI.
### API tests

Each running API instance uses at most 3 database connections and maintains a minimum
of 1 idle connection. Both the local test profile and the Supabase integration tests
limit their pools to 1 connection, with no minimum idle connections. The Supabase
connection check reuses the read-only transaction's connection. These limits apply
per application context, so multiple running instances still share Supabase's total
session capacity. Restart existing API processes to apply the new settings.

From `api/`, run `./gradlew test` with Docker running. Database-backed tests use
disposable PostgreSQL 16 Testcontainers initialized from the committed SQL schema;
no Supabase credentials or manually initialized test database are required.
`ApiHttpIntegrationTests` uses REST Assured against a real test server and that
Postgres database, covering login, JWTs, 400/401/403/404/409, and documentation.
Only GitHub's external identity client is mocked; no real login is needed.
Run account repository tests alone with
`./gradlew test --tests com.example.demo.AccountRepositoryTests`.

To verify the actual Supabase connection, supply `DB_USER` and `DB_PASSWORD` through
your existing secret mechanism and run `./gradlew supabaseTest`. This separate,
explicitly invoked task verifies the PostgreSQL driver, Supabase hostname, connection
validity, `SELECT 1`, and a bounded catalog repository query. It uses read-only
transactions, disables schema changes and SQL initialization, and works with an empty
catalog. It fails if credentials, network access, or the expected schema are unavailable.
No test sources an environment file. Passing the isolated tests alone does not prove that
the remote Supabase connection works.

## GitHub OAuth configuration

The auth contract is in `docs/openapi.yaml`: `POST /api/v1/auth/github` accepts
`{ code, codeVerifier, redirectUri }` and returns `{ token, user }`;
`GET /api/v1/me` requires our API-issued Bearer JWT. GitHub login, account
persistence, JWT validation, CORS, session restoration, and logout are implemented
for Expo web and Android.

1. Copy the root `.env.example` to `.env`, and `client/.env.example` to `client/.env`.
   Both local files are ignored by Git. Fill in your database settings; the root
   template uses local Postgres, while `DB_URL` can also point to Supabase.
2. Reuse the team's web and Android GitHub **OAuth Apps**; teammates do not need
   separate registrations. For a new setup, register two apps under GitHub Settings
   → Developer settings → OAuth Apps. Register
   callback `http://localhost:8081/auth` for the web app and `client://auth` for the
   Expo Android app. Keep the existing Expo scheme `client` in `client/app.json`.
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
Expo loads `client/.env` when started from `client/`. Docker Compose loads the root
`.env` into the API container while retaining its local database overrides.

The configured web and Android redirect URIs define the exact allowlist:
the API selects the matching server-owned credentials and rejects other URIs.
The browser origin allowlist defaults to `http://localhost:8081` via
`APP_CORS_ORIGINS`; native callbacks are not browser CORS origins. Production will
need separate callback registrations/configuration and an explicit HTTPS origin.
No refresh tokens or account linking are part of this increment.

## Database schema reference

The existing hosted Supabase schema is documented in [docs/erd.md](docs/erd.md),
based on the team's 2026-11-09 export. It includes current defaults, nullable fields,
category values, foreign-key behavior, and differences from the planned auth schema.
The export is context only; do not run it as a migration or recreate hosted tables.
