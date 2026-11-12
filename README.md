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

### Saved builds integration

`GET /api/v1/builds` lists the authenticated user's builds at any stage, newest
first. Build creation and deletion endpoints also exist. These routes are not usable
by real users until authentication is integrated: it must verify credentials and set
the Spring Security principal name to the application's user UUID. The client builder
still uses local state and is not connected to these endpoints.

The backend expects `pc_builds` and a `pc_build_parts` join table. The documented
ERD instead describes a `build_parts` table with quantity; the actual database schema
and part relationship must be reconciled before using build creation in production.
Hibernate does not create or alter the remote schema.

### API tests

Each running API instance uses at most 3 database connections and maintains a minimum
of 1 idle connection. Both the local test profile and the Supabase integration tests
limit their pools to 1 connection, with no minimum idle connections. The Supabase
connection check reuses the read-only transaction's connection. These limits apply
per application context, so multiple running instances still share Supabase's total
session capacity. Restart existing API processes to apply the new settings.

From `/api`, run `./gradlew test`. These tests use an isolated H2 database in PostgreSQL
mode, exercise the actual HTTP controllers and JPA queries, and require no Supabase
credentials. They also verify that a database outage returns 503 without connection details.

To verify the actual Supabase connection, supply `DB_USER` and `DB_PASSWORD` through
your existing secret mechanism and run `./gradlew supabaseTest`. This separate,
explicitly invoked task verifies the PostgreSQL driver, Supabase hostname, connection
validity, `SELECT 1`, and a bounded catalog repository query. It uses read-only
transactions, disables schema changes and SQL initialization, and works with an empty
catalog. It fails if credentials, network access, or the expected schema are unavailable.
No test sources an environment file. Passing the H2 tests alone does not prove that
the remote Supabase connection works.
