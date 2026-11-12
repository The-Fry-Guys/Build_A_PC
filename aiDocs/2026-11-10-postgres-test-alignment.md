# PostgreSQL test and local development alignment

Date: 2026-11-10

## Changes

- Added Spring Boot's Testcontainers integration and its managed PostgreSQL module
  to `api/build.gradle`; removed H2 runtime and H2 console dependencies.
- Added `PostgresTestConfiguration`, imported only by the startup, catalog route,
  and account repository integration tests. Spring owns container startup/shutdown
  alongside each cached application context, keeping the container alive while its
  datasource is in use. Testcontainers supplies a random mapped port through
  `@ServiceConnection`; no manually started port-5433 database is needed.
- Containers run `postgres:16`, matching Compose, and initialize from the existing
  `db/migration/V1__initial_schema.sql` classpath resource. The directory name does
  not enable Flyway; no Flyway dependency or migration tracking was introduced.
- Replaced H2's test profile and Hibernate `create-drop` with SQL-owned schema
  initialization and Hibernate `none`. The profile has an unreachable local fallback
  URL so a missing service connection fails instead of reaching Supabase. It uses
  no hosted credentials. SQL initialization is disabled in Spring because the
  container executes the schema once.
- Converted catalog fixture categories and expected responses to `cpu`, `memory`,
  and `case`, matching the database category check. Added three parameterized
  negative cases proving uppercase labels are rejected by that SQL constraint.
- Kept the existing account uniqueness and deletion tests, including their rollback
  isolation. Catalog tests also retain transactional rollback.
- Mocked MVC error and outage tests remain database-free. The tagged, read-only
  `supabaseTest` task and its hosted connection settings were not changed.
- Compose now mounts the committed SQL read-only into
  `/docker-entrypoint-initdb.d/001-initial-schema.sql` and sets Hibernate DDL mode
  to `none`. Existing volumes are untouched; initialization happens only for an
  empty database volume. Removed obsolete Compose TODOs about H2 and automatic DDL.

## Running and expected behavior

From `api/`, with Docker running and accessible:

```bash
rtk proxy ./gradlew test
rtk proxy ./gradlew test --tests com.example.demo.AccountRepositoryTests
rtk proxy ./gradlew test --tests com.example.demo.CatalogRoutesTests
```

A first run may download dependencies and the Postgres image. Missing Docker is
an error, not a silently skipped integration test. No Supabase credentials or
manual test database are required. Existing production configuration and the
explicit `supabaseTest` task remain separate.

For a fresh local development stack, run `docker compose up --build` from `api/`.
An existing Compose database volume will not rerun the initialization script.
Rebuilding images does not upgrade that schema. Preserve needed local data before
recreating any volume; this change does not delete or reset volumes automatically.

## Validation

- `docker compose -f api/docker-compose.yml config --quiet`: passed.
- `git diff --check`: passed.
- Static checks: shared SQL resource and Compose mount exist; database-backed tests
  import the container configuration; normal test configuration no longer references
  H2 or port 5433.
- `./gradlew test --no-daemon`: blocked before compilation because the Gradle wrapper
  cache under `/home/austin/.gradle` is read-only in this session.
- Docker runtime access: denied at the Docker Desktop socket, so container startup,
  schema execution, and the converted test suite could not be verified here.
- Versions/API choice checked against the local Spring Boot 4.1.2 dependency BOM
  (Testcontainers 2.0.5), Spring Boot Testcontainers documentation, and the official
  Testcontainers PostgreSQL module documentation.

## Boundaries

Existing Markdown documentation was not modified. No hosted database changes,
JWT/auth implementation, CI workflow changes, REST Assured conversion, or account
service implementation were included. This improves PostgreSQL parity but does not
claim to satisfy every course integration-testing requirement.
