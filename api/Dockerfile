# ---- Build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app/api

# Copy build files first so dependency downloads are cached between builds
COPY api/gradlew api/settings.gradle api/build.gradle ./
COPY api/gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null

COPY api/src/main ./src/main
COPY docs/openapi.yaml /app/docs/openapi.yaml
RUN ./gradlew bootJar -x test --no-daemon

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --no-create-home spring
USER spring

# Keep JVM heap usage within the container limit while leaving room for native memory.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"

# Plain jar is disabled by Spring Boot's Gradle plugin only for bootJar; pick the boot jar
COPY --from=build /app/api/build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 10000

# Report unhealthy when the API or its database health check is unavailable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
    CMD curl --fail --silent --show-error "http://localhost:${PORT:-8080}/actuator/health" || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
