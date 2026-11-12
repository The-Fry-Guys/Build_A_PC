# Docker environment, API documentation, and HTTP integration tooling

## Changes

- Compose now loads ../.env into the API container at runtime. Its explicit
  SPRING_DATASOURCE_* settings still select the local Postgres service, overriding
  any hosted database values in that file. Removed the obsolete comment saying
  security permits all requests.
- Added SpringDoc WebMVC UI 3.2.0, selected from the official compatibility matrix
  for Spring Boot 4.1.x. Swagger UI at /swagger-ui/index.html uses our handwritten
  contract, served as /openapi.yaml. Generated implemented-route documentation
  remains at /v3/api-docs; it defines the app Bearer scheme and marks /me secured.
- Gradle processResources packages docs/openapi.yaml into static resources. There
  is no second maintained contract copy. Docker's build context is now the repo
  root so the image can package this file. Root .dockerignore allows only required
  API main/build files and this contract, excluding environment files, client
  files, tests, caches, and other repository content.
- Dockerfile paths reflect that root context. Standalone image command from root:
  `docker build -f api/Dockerfile .`. Compose still runs from api/.
- Added REST Assured 6.3.0 and ten ApiHttpIntegrationTests. They use a real
  random-port Spring Boot server, the existing PostgreSQL 16 Testcontainers schema,
  real account transactions, app token signing/decoding, and security filters.
  Only GitHubIdentityClient is mocked at the external-provider boundary. Existing
  MockMvc/unit tests remain in place.
- HTTP scenarios: successful login and /me, repeat login/account reuse, invalid
  PKCE 400, missing/malformed JWT 401, regular-user admin access 403, missing
  database-backed part 404, provider conflict 409, unverified email 400, Swagger UI
  and handwritten contract, and generated route/security documentation. No
  production test-login route was introduced. Test data cleanup uses a unique
  email and runs outside an enclosing test transaction, since HTTP server work
  commits on separate threads.
- Corrected the ERD's stale implementation notes; added docs/auth-sequence.md
  showing the actual GitHub PKCE, exchange, verified identity/account, app JWT,
  protected profile, storage, and logout behavior. Architecture is explicitly
  labeled as the target system and links to that implemented sequence.
- README now includes Compose startup, the changed Docker build context, API
  documentation URLs, and REST Assured test scope. CI and JaCoCo enforcement were
  left for the coworker handling those tasks. Catalog authorization was unchanged.

## Validation and limitations

- `docker compose config --quiet` passed with the existing local environment.
  Configuration was checked without printing secret values.
- Compose/YAML checks confirmed the runtime env file and local database overrides;
  documentation structure and `git diff --check` passed.
- Attempted `./gradlew test --tests com.example.demo.ApiHttpIntegrationTests`.
  The wrapper failed before compilation because ~/.gradle is read-only here.
- Retried with the installed Gradle binary and a writable temporary Gradle home.
  Gradle could not initialize its socket/locking service in the sandbox.
- Attempted `docker compose build api`; buildx could not write its activity state
  under the read-only ~/.docker directory.
- **No new backend compilation, integration-test pass, dependency resolution,
  container startup, or live Swagger result is claimed.** Run locally with Docker:

  ```sh
  cd api
  ./gradlew test --tests com.example.demo.ApiHttpIntegrationTests
  ./gradlew test
  docker compose up --build
  ```

  Then check /api/v1/health, /swagger-ui/index.html, /openapi.yaml, and /v3/api-docs
  at http://localhost:8080. The first dependency resolution needs Maven Central.

Official tooling references:

- https://springdoc.org/#what-is-the-compatibility-matrix-of-springdoc-openapi-with-spring-boot
- https://springdoc.org/#swagger-ui-properties
- https://github.com/rest-assured/rest-assured/wiki/GettingStarted
