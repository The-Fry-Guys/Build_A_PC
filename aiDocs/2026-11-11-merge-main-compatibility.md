# Merge main into GitHub OAuth branch

- Resolved api/build.gradle using the Boot 4 resource-server starter, explicit
  JOSE support, Boot-managed Testcontainers 2 Postgres, REST Assured 6.3.0, and
  incoming Spring Security/REST Assured MockMvc test support. Removed duplicate
  declarations and incompatible legacy Testcontainers 1.x coordinates.
- Kept Expo/auth scripts and SDK-matched dependencies; retained main's
  @testing-library/react-native dependency. Combined lockfile package records from
  both sides and normalized the result with offline npm package-lock-only.
  npm's own Arborist validation confirms required dependency/peer edges resolve.
- Consolidated two conflicting Jest configurations into jest.config.cjs, retaining
  coverage settings and transform exceptions while discovering both OAuth tests
  and the incoming hooks/tests directory. Removed the duplicate tsconfig types key.
- Added the JwtDecoder mock required by the incoming PCBuildControllerTest under
  the real OAuth security configuration. Adjusted the incoming PartsCatalog hook
  declaration order with useCallback and kept state updates in asynchronous
  request callbacks to satisfy React's compiler lint rules.
- Preserved incoming feature files and removal of the separate native app project.

Verification: no conflict markers remain; lockfile normalization/edge validation
passed. The original 62 frontend tests pass. The incoming useBuild suite and
TypeScript cannot finish because @testing-library/react-native is not installed
in this environment; registry access fails with EAI_AGAIN. Run npm ci locally.
Backend tests are blocked before compilation by the read-only Gradle cache.

Follow-up integration issues outside conflict resolution: main's PCBuild mapping
uses String user_id and pc_build_parts, while the committed schema uses UUID
user_id and build_parts; the new catalog screen also appends /api/v1 even when
EXPO_PUBLIC_API_URL already includes it. These feature/schema mismatches were not
rewritten as part of resolving dependency/configuration conflicts.

No merge commit was created by the assistant.
