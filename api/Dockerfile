# ---- Build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Copy build files first so dependency downloads are cached between builds
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon > /dev/null

COPY src ./src
RUN ./gradlew bootJar -x test --no-daemon

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN useradd --system --no-create-home spring
USER spring

# Plain jar is disabled by Spring Boot's Gradle plugin only for bootJar; pick the boot jar
COPY --from=build /app/build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 8080

# TODO: add a HEALTHCHECK against /actuator/health (needs curl or wget in the JRE image)
# TODO: set JVM memory flags (e.g. -XX:MaxRAMPercentage) once deployment resources are known
# TODO: add a CI step to build/push this image once a hosting target is chosen
ENTRYPOINT ["java", "-jar", "app.jar"]
